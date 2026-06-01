-- User behaviour profiles: automatic signals from platform activity (mobile + web).
-- See USER_BEHAVIOUR_PROFILE_SYSTEM_WEB_HANDOFF.MD

-- ═══════════════════════════════════════════════════════════════════
-- 1. MAIN TABLE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_behaviour_profiles (
  user_id                           uuid PRIMARY KEY
                                    REFERENCES public.profiles(id) ON DELETE CASCADE,

  events_viewed                     integer NOT NULL DEFAULT 0,
  events_bookmarked                 integer NOT NULL DEFAULT 0,
  events_purchased                  integer NOT NULL DEFAULT 0,
  events_attended_via_request_room  integer NOT NULL DEFAULT 0,
  preferred_event_cities            text[]  NOT NULL DEFAULT '{}',
  preferred_event_days              text[]  NOT NULL DEFAULT '{}',
  preferred_event_times             text[]  NOT NULL DEFAULT '{}',

  tracks_played                     integer NOT NULL DEFAULT 0,
  tracks_repeat_listened            integer NOT NULL DEFAULT 0,
  tracks_tipped                     integer NOT NULL DEFAULT 0,
  preferred_genres                  text[]  NOT NULL DEFAULT '{}',
  preferred_moods                   text[]  NOT NULL DEFAULT '{}',

  creators_followed                 integer NOT NULL DEFAULT 0,
  creators_tipped                   integer NOT NULL DEFAULT 0,
  live_interests_expressed          integer NOT NULL DEFAULT 0,

  most_active_day                   text,
  most_active_hour                  integer,
  primary_location_city             text,

  last_updated                      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_behaviour_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_behaviour_profiles' AND policyname = 'ubp_own_read'
  ) THEN
    CREATE POLICY ubp_own_read ON public.user_behaviour_profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 2. APP SESSION LOG
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_session_log (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opened_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_session_log_user_time
  ON public.app_session_log (user_id, opened_at DESC);


-- ═══════════════════════════════════════════════════════════════════
-- 3. HELPERS
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ubp_ensure(p_user_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_behaviour_profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.ubp_top_genres(p_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT array_agg(genre ORDER BY cnt DESC)
     FROM (
       SELECT at.genre, COUNT(*) AS cnt
       FROM   public.play_sessions  ps
       JOIN   public.audio_tracks   at ON at.id = ps.track_id
       WHERE  ps.user_id    = p_user_id
         AND  at.genre      IS NOT NULL
         AND  btrim(at.genre) <> ''
         AND  ps.played_at  > now() - interval '90 days'
       GROUP  BY at.genre
       ORDER  BY cnt DESC
       LIMIT  3
     ) t),
    '{}'::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.ubp_top_moods(p_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT array_agg(mood ORDER BY cnt DESC)
     FROM (
       SELECT UNNEST(at.mood_tags) AS mood, COUNT(*) AS cnt
       FROM   public.play_sessions  ps
       JOIN   public.audio_tracks   at ON at.id = ps.track_id
       WHERE  ps.user_id   = p_user_id
         AND  at.mood_tags IS NOT NULL
         AND  ps.completed = true
       GROUP  BY mood
       ORDER  BY cnt DESC
       LIMIT  3
     ) t),
    '{}'::text[]
  );
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 4. TRIGGER — play_sessions
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_play_session_ubp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prior_plays integer;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.ubp_ensure(NEW.user_id);

  SELECT COUNT(*) INTO v_prior_plays
  FROM   public.play_sessions
  WHERE  user_id  = NEW.user_id
    AND  track_id = NEW.track_id
    AND  id       != NEW.id;

  UPDATE public.user_behaviour_profiles
  SET
    tracks_played          = tracks_played + 1,
    tracks_repeat_listened = tracks_repeat_listened
                             + CASE WHEN v_prior_plays > 0 THEN 1 ELSE 0 END,
    preferred_genres       = public.ubp_top_genres(NEW.user_id),
    preferred_moods        = public.ubp_top_moods(NEW.user_id),
    last_updated           = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_play_session_ubp ON public.play_sessions;
CREATE TRIGGER trg_play_session_ubp
  AFTER INSERT ON public.play_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_play_session_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 5. TRIGGER — tips (INSERT + UPDATE when completed; web tips start pending)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_tip_ubp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  PERFORM public.ubp_ensure(NEW.sender_id);

  UPDATE public.user_behaviour_profiles
  SET
    tracks_tipped   = tracks_tipped
                      + CASE WHEN NEW.track_id IS NOT NULL THEN 1 ELSE 0 END,
    creators_tipped = creators_tipped
                      + CASE WHEN NEW.track_id IS NULL THEN 1 ELSE 0 END,
    last_updated    = now()
  WHERE user_id = NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tip_ubp ON public.tips;
CREATE TRIGGER trg_tip_ubp
  AFTER INSERT ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.trg_tip_ubp();

DROP TRIGGER IF EXISTS trg_tip_ubp_update ON public.tips;
CREATE TRIGGER trg_tip_ubp_update
  AFTER UPDATE OF status ON public.tips
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.trg_tip_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 6. TRIGGER — event_bookmarks
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_event_bookmark_ubp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city text;
  v_day  text;
  v_date timestamptz;
BEGIN
  PERFORM public.ubp_ensure(NEW.user_id);

  SELECT COALESCE(city, location), event_date
  INTO   v_city, v_date
  FROM   public.events
  WHERE  id = NEW.event_id;

  v_day := to_char(v_date AT TIME ZONE 'UTC', 'FMDay');

  UPDATE public.user_behaviour_profiles
  SET
    events_bookmarked      = events_bookmarked + 1,
    preferred_event_cities = CASE
      WHEN v_city IS NOT NULL AND NOT (preferred_event_cities @> ARRAY[v_city])
      THEN (preferred_event_cities || ARRAY[v_city])[1:10]
      ELSE preferred_event_cities
    END,
    preferred_event_days   = CASE
      WHEN v_day IS NOT NULL AND NOT (preferred_event_days @> ARRAY[trim(v_day)])
      THEN (preferred_event_days || ARRAY[trim(v_day)])[1:7]
      ELSE preferred_event_days
    END,
    last_updated           = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_bookmark_ubp ON public.event_bookmarks;
CREATE TRIGGER trg_event_bookmark_ubp
  AFTER INSERT ON public.event_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.trg_event_bookmark_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 7. TRIGGER — purchased_event_tickets
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_ticket_purchase_ubp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  PERFORM public.ubp_ensure(NEW.user_id);

  SELECT COALESCE(city, location) INTO v_city FROM public.events WHERE id = NEW.event_id;

  UPDATE public.user_behaviour_profiles
  SET
    events_purchased       = events_purchased + 1,
    preferred_event_cities = CASE
      WHEN v_city IS NOT NULL AND NOT (preferred_event_cities @> ARRAY[v_city])
      THEN (preferred_event_cities || ARRAY[v_city])[1:10]
      ELSE preferred_event_cities
    END,
    last_updated           = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_purchase_ubp ON public.purchased_event_tickets;
CREATE TRIGGER trg_ticket_purchase_ubp
  AFTER INSERT ON public.purchased_event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trg_ticket_purchase_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 8. TRIGGER — follows
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_follow_ubp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ubp_ensure(NEW.follower_id);

  UPDATE public.user_behaviour_profiles
  SET
    creators_followed = creators_followed + 1,
    last_updated      = now()
  WHERE user_id = NEW.follower_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_follow_ubp ON public.follows;
CREATE TRIGGER trg_follow_ubp
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.trg_follow_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 9. TRIGGER — live_interest_responses
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_live_interest_ubp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.responded_yes IS NOT TRUE
     AND COALESCE(NEW.response, '') IS DISTINCT FROM 'yes' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.ubp_ensure(NEW.user_id);

  UPDATE public.user_behaviour_profiles
  SET
    live_interests_expressed = live_interests_expressed + 1,
    last_updated             = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_interest_ubp ON public.live_interest_responses;
CREATE TRIGGER trg_live_interest_ubp
  AFTER INSERT ON public.live_interest_responses
  FOR EACH ROW EXECUTE FUNCTION public.trg_live_interest_ubp();


-- Web inserts tipper_user_id; mobile may use user_id — support both.
ALTER TABLE public.request_room_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 10. TRIGGER — request_room_requests
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_request_room_tip_ubp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.tip_amount IS NULL OR NEW.tip_amount <= 0 THEN
    RETURN NEW;
  END IF;

  v_user_id := COALESCE(NEW.user_id, NEW.tipper_user_id);
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.ubp_ensure(v_user_id);

  UPDATE public.user_behaviour_profiles
  SET
    events_attended_via_request_room = events_attended_via_request_room + 1,
    last_updated                     = now()
  WHERE user_id = v_user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_room_tip_ubp ON public.request_room_requests;
CREATE TRIGGER trg_request_room_tip_ubp
  AFTER INSERT ON public.request_room_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_request_room_tip_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 11. TRIGGER — profiles INSERT → blank behaviour profile on signup
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_new_user_ubp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_behaviour_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user_ubp ON public.profiles;
CREATE TRIGGER trg_new_user_ubp
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_new_user_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 12. RPC — record_app_open
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_app_open(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day  text;
  v_hour integer;
BEGIN
  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  INSERT INTO public.app_session_log (user_id) VALUES (p_user_id);

  SELECT mode_day, mode_hour
  INTO v_day, v_hour
  FROM (
    SELECT
      to_char(opened_at AT TIME ZONE 'UTC', 'FMDay') AS mode_day,
      EXTRACT(hour FROM opened_at AT TIME ZONE 'UTC')::integer AS mode_hour,
      COUNT(*) AS cnt
    FROM public.app_session_log
    WHERE user_id = p_user_id
      AND opened_at > now() - interval '30 days'
    GROUP BY 1, 2
    ORDER BY cnt DESC
    LIMIT 1
  ) ranked;

  INSERT INTO public.user_behaviour_profiles
    (user_id, most_active_day, most_active_hour, last_updated)
  VALUES
    (p_user_id, v_day, v_hour, now())
  ON CONFLICT (user_id) DO UPDATE SET
    most_active_day  = EXCLUDED.most_active_day,
    most_active_hour = EXCLUDED.most_active_hour,
    last_updated     = now();
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 13. RPC — record_event_view
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_event_view(
  p_user_id  uuid,
  p_event_id uuid,
  p_city     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city text;
BEGIN
  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  SELECT COALESCE(p_city, city, location)
  INTO v_city
  FROM public.events
  WHERE id = p_event_id;

  PERFORM public.ubp_ensure(p_user_id);

  UPDATE public.user_behaviour_profiles
  SET
    events_viewed          = events_viewed + 1,
    preferred_event_cities = CASE
      WHEN v_city IS NOT NULL AND NOT (preferred_event_cities @> ARRAY[v_city])
      THEN (preferred_event_cities || ARRAY[v_city])[1:10]
      ELSE preferred_event_cities
    END,
    last_updated           = now()
  WHERE user_id = p_user_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 14. RPC — update primary city (profile / location sync)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_user_behaviour_primary_city(
  p_user_id uuid,
  p_city    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;
  IF p_city IS NULL OR btrim(p_city) = '' THEN
    RETURN;
  END IF;

  PERFORM public.ubp_ensure(p_user_id);

  UPDATE public.user_behaviour_profiles
  SET
    primary_location_city = btrim(p_city),
    last_updated          = now()
  WHERE user_id = p_user_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 15. Backfill existing users
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.user_behaviour_profiles (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- 16. Grants
-- ═══════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.record_app_open(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_event_view(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_behaviour_primary_city(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_app_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_event_view(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_behaviour_primary_city(uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ubp_ensure(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_app_open(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_event_view(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_behaviour_primary_city(uuid, text) TO service_role;
