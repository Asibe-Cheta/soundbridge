-- Play count fraud detection — schema + record_play_session RPC
-- Mobile calls record_play_session; web owns validation, cron, admin, payouts.

-- ---------------------------------------------------------------------------
-- play_sessions fraud columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS is_valid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_suspicious boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_reason text,
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS idx_play_sessions_track_user_played_valid
  ON public.play_sessions (track_id, user_id, played_at DESC)
  WHERE is_valid = true AND is_rejected = false;

CREATE INDEX IF NOT EXISTS idx_play_sessions_track_ip_played
  ON public.play_sessions (track_id, ip_address, played_at DESC)
  WHERE ip_address IS NOT NULL;

-- ---------------------------------------------------------------------------
-- creator_fraud_analysis (daily job output)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_fraud_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.audio_tracks(id) ON DELETE SET NULL,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  total_plays integer NOT NULL DEFAULT 0,
  unique_listeners integer NOT NULL DEFAULT 0,
  play_to_listener_ratio numeric(10,2),
  platform_ratio numeric(10,4),
  ip_concentration_score numeric(10,4),
  time_clustering_score numeric(10,4),
  suspicious_plays_count integer NOT NULL DEFAULT 0,
  rejected_plays_count integer NOT NULL DEFAULT 0,
  fraud_score numeric(5,2) NOT NULL DEFAULT 0,
  fraud_status text NOT NULL DEFAULT 'clean'
    CHECK (fraud_status IN ('clean', 'monitor', 'flagged', 'hold')),
  fraud_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  payout_held boolean NOT NULL DEFAULT false,
  reviewed_by_admin boolean NOT NULL DEFAULT false,
  admin_decision text CHECK (admin_decision IN ('approved', 'withheld', 'banned')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, track_id, analysis_date)
);

CREATE INDEX IF NOT EXISTS idx_creator_fraud_analysis_status
  ON public.creator_fraud_analysis (fraud_status, analysis_date DESC);

CREATE INDEX IF NOT EXISTS idx_creator_fraud_analysis_creator
  ON public.creator_fraud_analysis (creator_id, analysis_date DESC);

COMMENT ON TABLE public.creator_fraud_analysis IS
  'Daily fraud analysis per creator/track; drives payout holds and admin review.';

-- ---------------------------------------------------------------------------
-- record_play_session — mobile + web entry point (SECURITY DEFINER)
-- Returns jsonb: { is_valid, is_suspicious, is_rejected, fraud_reason, play_count }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_play_session(
  p_track_id uuid,
  p_user_id uuid,
  p_play_duration_seconds integer,
  p_completed boolean DEFAULT false,
  p_ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_track_duration integer;
  v_duration integer;
  v_threshold numeric;
  v_is_valid boolean := true;
  v_is_suspicious boolean := false;
  v_is_rejected boolean := false;
  v_fraud_reason text := NULL;
  v_reasons text[] := ARRAY[]::text[];
  v_user_plays_24h integer := 0;
  v_ip_plays_1h integer := 0;
  v_last_played_at timestamptz;
  v_identical_streak integer := 0;
  v_play_count integer := 0;
  v_is_repeat boolean := false;
  v_countable boolean := false;
  v_ip text := NULL;
  v_jwt_role text;
BEGIN
  v_jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF v_jwt_role = 'service_role' THEN
    v_ip := NULLIF(btrim(p_ip_address), '');
  END IF;

  SELECT creator_id, GREATEST(COALESCE(NULLIF(duration, 0), 60), 1)
  INTO v_creator_id, v_track_duration
  FROM public.audio_tracks
  WHERE id = p_track_id;

  IF v_creator_id IS NULL THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'is_suspicious', false,
      'is_rejected', true,
      'fraud_reason', 'track_not_found',
      'play_count', NULL
    );
  END IF;

  v_duration := GREATEST(0, COALESCE(p_play_duration_seconds, 0));
  v_threshold := LEAST(30, v_track_duration * 0.5);

  IF v_duration < v_threshold THEN
    v_is_valid := false;
    v_reasons := array_append(v_reasons, 'minimum_duration_not_met');
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT played_at INTO v_last_played_at
    FROM public.play_sessions
    WHERE track_id = p_track_id
      AND user_id = p_user_id
    ORDER BY played_at DESC
    LIMIT 1;

    IF v_last_played_at IS NOT NULL
      AND (now() - v_last_played_at) < make_interval(secs => v_track_duration) THEN
      v_is_rejected := true;
      v_reasons := array_append(v_reasons, 'impossible_play_velocity_user');
    END IF;
  END IF;

  IF NOT v_is_rejected AND v_ip IS NOT NULL THEN
    SELECT played_at INTO v_last_played_at
    FROM public.play_sessions
    WHERE track_id = p_track_id
      AND ip_address = v_ip
    ORDER BY played_at DESC
    LIMIT 1;

    IF v_last_played_at IS NOT NULL
      AND (now() - v_last_played_at) < make_interval(secs => v_track_duration) THEN
      v_is_rejected := true;
      v_reasons := array_append(v_reasons, 'impossible_play_velocity_ip');
    END IF;
  END IF;

  IF NOT v_is_rejected AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_user_plays_24h
    FROM public.play_sessions
    WHERE track_id = p_track_id
      AND user_id = p_user_id
      AND played_at > now() - interval '24 hours';

    IF v_user_plays_24h >= 3 THEN
      v_is_suspicious := true;
      v_reasons := array_append(v_reasons, 'user_track_cooldown_exceeded');
    END IF;
  END IF;

  IF NOT v_is_rejected AND v_ip IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_ip_plays_1h
    FROM public.play_sessions
    WHERE track_id = p_track_id
      AND ip_address = v_ip
      AND played_at > now() - interval '1 hour';

    IF v_ip_plays_1h >= 10 THEN
      v_is_suspicious := true;
      v_reasons := array_append(v_reasons, 'ip_rate_limit_exceeded');
    END IF;
  END IF;

  IF NOT v_is_rejected THEN
    SELECT COUNT(*)::integer INTO v_identical_streak
    FROM (
      SELECT ps.play_duration_seconds
      FROM public.play_sessions ps
      WHERE ps.track_id = p_track_id
        AND (
          (p_user_id IS NOT NULL AND ps.user_id = p_user_id)
          OR (v_ip IS NOT NULL AND ps.ip_address = v_ip)
        )
      ORDER BY ps.played_at DESC
      LIMIT 4
    ) recent
    WHERE recent.play_duration_seconds = v_duration;

    IF v_identical_streak >= 4 THEN
      v_is_suspicious := true;
      v_reasons := array_append(v_reasons, 'identical_play_duration_streak');
    END IF;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.play_sessions ps
      WHERE ps.track_id = p_track_id
        AND ps.user_id = p_user_id
        AND ps.played_at > now() - interval '30 days'
    ) INTO v_is_repeat;
  END IF;

  IF array_length(v_reasons, 1) > 0 THEN
    v_fraud_reason := array_to_string(v_reasons, ',');
  END IF;

  INSERT INTO public.play_sessions (
    track_id,
    user_id,
    play_duration_seconds,
    completed,
    is_valid,
    is_suspicious,
    is_rejected,
    fraud_reason,
    ip_address
  ) VALUES (
    p_track_id,
    p_user_id,
    v_duration,
    COALESCE(p_completed, false),
    v_is_valid,
    v_is_suspicious,
    v_is_rejected,
    v_fraud_reason,
    v_ip
  );

  v_countable := v_is_valid AND NOT v_is_rejected;

  IF v_countable THEN
    UPDATE public.audio_tracks
    SET play_count = COALESCE(play_count, 0) + 1
    WHERE id = p_track_id
    RETURNING play_count INTO v_play_count;

    PERFORM public.ensure_track_quality_signals(p_track_id);

    UPDATE public.track_quality_signals tqs
    SET
      total_plays = total_plays + 1,
      unique_listeners = (
        SELECT COUNT(DISTINCT user_id)::integer
        FROM public.play_sessions
        WHERE track_id = p_track_id
          AND user_id IS NOT NULL
          AND is_valid = true
          AND is_rejected = false
      ),
      repeat_listens = repeat_listens + CASE WHEN v_is_repeat THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE track_id = p_track_id;

    IF p_user_id IS NOT NULL AND v_is_repeat THEN
      INSERT INTO public.listener_genre_affinity (user_id, creator_id, repeat_listens, affinity_score, updated_at)
      VALUES (p_user_id, v_creator_id, 1, 1, now())
      ON CONFLICT (user_id, creator_id) DO UPDATE
      SET repeat_listens = public.listener_genre_affinity.repeat_listens + 1,
          affinity_score = public.listener_genre_affinity.affinity_score + 1,
          updated_at = now();
    END IF;

    PERFORM public.recalculate_quality_score(p_track_id);
  ELSE
    SELECT COALESCE(play_count, 0) INTO v_play_count
    FROM public.audio_tracks
    WHERE id = p_track_id;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'is_suspicious', v_is_suspicious,
    'is_rejected', v_is_rejected,
    'fraud_reason', v_fraud_reason,
    'play_count', v_play_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_play_session(uuid, uuid, integer, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_play_session(uuid, uuid, integer, boolean, text) TO service_role;

-- Legacy wrapper — web fallback when record_play_session unavailable
CREATE OR REPLACE FUNCTION public.record_valid_play_session(
  p_track_id uuid,
  p_user_id uuid,
  p_play_duration_seconds integer,
  p_completed boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_play_session(
    p_track_id,
    p_user_id,
    p_play_duration_seconds,
    p_completed,
    NULL
  );
END;
$$;

-- RLS: admin reads via service role; no creator-facing policies (silent detection)
ALTER TABLE public.creator_fraud_analysis ENABLE ROW LEVEL SECURITY;
