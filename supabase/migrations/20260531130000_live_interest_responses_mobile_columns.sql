-- Align live_interest_responses with mobile liveInterestService column names.
-- Table was first created by 20260528120000_discovery_intelligence.sql (web schema only).
-- Keeps responded_yes / availability_preference in sync for web triggers + demand-led events.

ALTER TABLE public.live_interest_responses
  ADD COLUMN IF NOT EXISTS creator_id          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responded           boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS response            text        CHECK (response IN ('yes','maybe_later','auto_dismissed')),
  ADD COLUMN IF NOT EXISTS availability        text        CHECK (availability IN ('weekends','weekday_evenings','any_time','not_sure')),
  ADD COLUMN IF NOT EXISTS profile_location    text,
  ADD COLUMN IF NOT EXISTS profile_city        text,
  ADD COLUMN IF NOT EXISTS profile_country     text,
  ADD COLUMN IF NOT EXISTS current_location_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS current_location_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS current_city        text,
  ADD COLUMN IF NOT EXISTS current_country     text,
  ADD COLUMN IF NOT EXISTS responded_at        timestamptz;

CREATE INDEX IF NOT EXISTS idx_lir_creator
  ON public.live_interest_responses(creator_id);

CREATE INDEX IF NOT EXISTS idx_lir_response
  ON public.live_interest_responses(response);

-- Backfill creator_id for any existing rows
UPDATE public.live_interest_responses lir
SET creator_id = t.creator_id
FROM public.audio_tracks t
WHERE t.id = lir.track_id
  AND lir.creator_id IS NULL;

-- Backfill mobile columns from legacy web columns where present
UPDATE public.live_interest_responses
SET
  responded = responded_yes,
  response = CASE WHEN responded_yes THEN 'yes' ELSE response END,
  availability = COALESCE(availability, availability_preference),
  responded_at = COALESCE(responded_at, created_at)
WHERE responded_at IS NULL
   OR (responded = false AND responded_yes = true)
   OR (availability IS NULL AND availability_preference IS NOT NULL);

-- Keep web + mobile column names aligned on every write
CREATE OR REPLACE FUNCTION public.trg_live_interest_normalize_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_id IS NULL AND NEW.track_id IS NOT NULL THEN
    SELECT creator_id INTO NEW.creator_id
    FROM public.audio_tracks
    WHERE id = NEW.track_id;
  END IF;

  IF NEW.response IS NOT NULL THEN
    NEW.responded := (NEW.response = 'yes');
    NEW.responded_yes := NEW.responded;
  ELSIF NEW.responded_yes IS NOT NULL THEN
    NEW.responded := NEW.responded_yes;
    IF NEW.responded_yes AND NEW.response IS NULL THEN
      NEW.response := 'yes';
    END IF;
  ELSIF NEW.responded IS NOT NULL THEN
    NEW.responded_yes := NEW.responded;
    IF NEW.responded AND NEW.response IS NULL THEN
      NEW.response := 'yes';
    END IF;
  END IF;

  IF NEW.availability IS NOT NULL THEN
    NEW.availability_preference := NEW.availability;
  ELSIF NEW.availability_preference IS NOT NULL THEN
    NEW.availability := NEW.availability_preference;
  END IF;

  IF NEW.responded_at IS NULL THEN
    NEW.responded_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_interest_normalize_columns ON public.live_interest_responses;
CREATE TRIGGER trg_live_interest_normalize_columns
  BEFORE INSERT OR UPDATE ON public.live_interest_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_live_interest_normalize_columns();

-- Quality signals: count yes from either column set
CREATE OR REPLACE FUNCTION public.sync_track_quality_live_interest(p_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_yes integer;
  v_total integer;
  v_rate numeric;
BEGIN
  PERFORM public.ensure_track_quality_signals(p_track_id);

  SELECT
    COUNT(*) FILTER (
      WHERE responded_yes = true
         OR responded = true
         OR response = 'yes'
    ),
    COUNT(*)
  INTO v_yes, v_total
  FROM public.live_interest_responses
  WHERE track_id = p_track_id;

  v_rate := CASE WHEN v_total > 0 THEN v_yes::numeric / v_total::numeric ELSE 0 END;

  UPDATE public.track_quality_signals
  SET live_interest_yes_count = COALESCE(v_yes, 0),
      live_interest_rate = COALESCE(v_rate, 0),
      updated_at = now()
  WHERE track_id = p_track_id;

  PERFORM public.recalculate_quality_score(p_track_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_live_interest_sync_quality()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_yes boolean;
BEGIN
  PERFORM public.sync_track_quality_live_interest(NEW.track_id);

  v_is_yes := COALESCE(NEW.responded_yes, NEW.responded, NEW.response = 'yes', false);

  IF v_is_yes AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.listener_genre_affinity (
      user_id, creator_id, live_interest_expressed, affinity_score, updated_at
    )
    SELECT NEW.user_id, t.creator_id, true, 3, now()
    FROM public.audio_tracks t
    WHERE t.id = NEW.track_id
    ON CONFLICT (user_id, creator_id) DO UPDATE
    SET live_interest_expressed = true,
        affinity_score = GREATEST(public.listener_genre_affinity.affinity_score, 3),
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Demand-led + cron: creator yes-count uses same yes semantics
CREATE OR REPLACE FUNCTION public.creator_live_interest_yes_count(p_creator_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT lir.user_id)::integer
  FROM public.live_interest_responses lir
  WHERE lir.creator_id = p_creator_id
    AND (
      lir.responded_yes = true
      OR lir.responded = true
      OR lir.response = 'yes'
    );
$$;
