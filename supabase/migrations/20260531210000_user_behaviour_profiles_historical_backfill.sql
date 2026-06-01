-- One-time backfill: populate user_behaviour_profiles from historical platform activity.
-- Triggers only count NEW rows after 20260531200000; this fixes pre-existing tips/plays/etc.

-- Per-user repeat listen count (extra play sessions beyond first per track).
CREATE OR REPLACE FUNCTION public.ubp_historical_repeat_listens(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(GREATEST(cnt - 1, 0))::integer, 0)
  FROM (
    SELECT COUNT(*)::integer AS cnt
    FROM public.play_sessions
    WHERE user_id = p_user_id
    GROUP BY track_id
  ) per_track;
$$;

-- Per-user preferred event cities from bookmarks + ticket purchases.
CREATE OR REPLACE FUNCTION public.ubp_historical_event_cities(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(city ORDER BY city)
      FROM (
        SELECT DISTINCT COALESCE(e.city, e.location) AS city
        FROM public.event_bookmarks eb
        JOIN public.events e ON e.id = eb.event_id
        WHERE eb.user_id = p_user_id
          AND COALESCE(e.city, e.location) IS NOT NULL
          AND btrim(COALESCE(e.city, e.location)) <> ''
        UNION
        SELECT DISTINCT COALESCE(e.city, e.location) AS city
        FROM public.purchased_event_tickets pet
        JOIN public.events e ON e.id = pet.event_id
        WHERE pet.user_id = p_user_id
          AND pet.status = 'active'
          AND COALESCE(e.city, e.location) IS NOT NULL
          AND btrim(COALESCE(e.city, e.location)) <> ''
        LIMIT 10
      ) cities
    ),
    '{}'::text[]
  );
$$;

-- Per-user preferred event days (weekday names) from bookmarks + purchases.
CREATE OR REPLACE FUNCTION public.ubp_historical_event_days(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT day_name ORDER BY day_name), '{}'::text[])
  FROM (
    SELECT trim(to_char(e.event_date AT TIME ZONE 'UTC', 'FMDay')) AS day_name
    FROM public.event_bookmarks eb
    JOIN public.events e ON e.id = eb.event_id
    WHERE eb.user_id = p_user_id AND e.event_date IS NOT NULL
    UNION
    SELECT trim(to_char(e.event_date AT TIME ZONE 'UTC', 'FMDay')) AS day_name
    FROM public.purchased_event_tickets pet
    JOIN public.events e ON e.id = pet.event_id
    WHERE pet.user_id = p_user_id
      AND pet.status = 'active'
      AND e.event_date IS NOT NULL
  ) days
  LIMIT 7;
$$;

-- Recompute one user's profile from history (safe to re-run).
CREATE OR REPLACE FUNCTION public.backfill_user_behaviour_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tracks_tipped integer := 0;
  v_creators_tipped integer := 0;
  v_plays integer := 0;
  v_repeats integer := 0;
  v_bookmarks integer := 0;
  v_purchases integer := 0;
  v_follows integer := 0;
  v_live integer := 0;
  v_request_room integer := 0;
  v_city text;
  v_day text;
  v_hour integer;
BEGIN
  PERFORM public.ubp_ensure(p_user_id);

  SELECT COUNT(*)::integer INTO v_tracks_tipped
  FROM public.tips
  WHERE sender_id = p_user_id
    AND status = 'completed'
    AND track_id IS NOT NULL;

  SELECT
    COALESCE((
      SELECT COUNT(*)::integer FROM public.tips
      WHERE sender_id = p_user_id AND status = 'completed' AND track_id IS NULL
    ), 0)
    + COALESCE((
      SELECT COUNT(*)::integer FROM public.creator_tips
      WHERE tipper_id = p_user_id AND status = 'completed'
    ), 0)
  INTO v_creators_tipped;

  SELECT COUNT(*)::integer INTO v_plays
  FROM public.play_sessions WHERE user_id = p_user_id;

  v_repeats := public.ubp_historical_repeat_listens(p_user_id);

  SELECT COUNT(*)::integer INTO v_bookmarks
  FROM public.event_bookmarks WHERE user_id = p_user_id;

  SELECT COUNT(*)::integer INTO v_purchases
  FROM public.purchased_event_tickets
  WHERE user_id = p_user_id AND status = 'active';

  SELECT COUNT(*)::integer INTO v_follows
  FROM public.follows WHERE follower_id = p_user_id;

  SELECT COUNT(*)::integer INTO v_live
  FROM public.live_interest_responses
  WHERE user_id = p_user_id
    AND (responded_yes IS TRUE OR response = 'yes');

  SELECT COUNT(*)::integer INTO v_request_room
  FROM public.request_room_requests
  WHERE COALESCE(user_id, tipper_user_id) = p_user_id
    AND tip_amount IS NOT NULL
    AND tip_amount > 0;

  SELECT COALESCE(city, location) INTO v_city
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT mode_day, mode_hour INTO v_day, v_hour
  FROM (
    SELECT
      to_char(opened_at AT TIME ZONE 'UTC', 'FMDay') AS mode_day,
      EXTRACT(hour FROM opened_at AT TIME ZONE 'UTC')::integer AS mode_hour,
      COUNT(*) AS cnt
    FROM public.app_session_log
    WHERE user_id = p_user_id
    GROUP BY 1, 2
    ORDER BY cnt DESC
    LIMIT 1
  ) ranked;

  UPDATE public.user_behaviour_profiles
  SET
    tracks_played                     = v_plays,
    tracks_repeat_listened            = v_repeats,
    tracks_tipped                     = v_tracks_tipped,
    creators_tipped                   = v_creators_tipped,
    creators_followed                 = v_follows,
    events_bookmarked                 = v_bookmarks,
    events_purchased                  = v_purchases,
    live_interests_expressed          = v_live,
    events_attended_via_request_room  = v_request_room,
    preferred_genres                  = public.ubp_top_genres(p_user_id),
    preferred_moods                   = public.ubp_top_moods(p_user_id),
    preferred_event_cities            = public.ubp_historical_event_cities(p_user_id),
    preferred_event_days              = public.ubp_historical_event_days(p_user_id),
    primary_location_city             = NULLIF(btrim(v_city), ''),
    most_active_day                   = COALESCE(most_active_day, v_day),
    most_active_hour                  = COALESCE(most_active_hour, v_hour),
    last_updated                      = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Backfill all users with any historical activity (or an existing profile row).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id FROM (
      SELECT sender_id AS user_id FROM public.tips WHERE status = 'completed'
      UNION
      SELECT tipper_id FROM public.creator_tips WHERE status = 'completed'
      UNION
      SELECT user_id FROM public.play_sessions WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.event_bookmarks
      UNION
      SELECT user_id FROM public.purchased_event_tickets WHERE status = 'active'
      UNION
      SELECT follower_id AS user_id FROM public.follows
      UNION
      SELECT user_id FROM public.live_interest_responses
        WHERE responded_yes IS TRUE OR response = 'yes'
      UNION
      SELECT COALESCE(user_id, tipper_user_id) AS user_id
      FROM public.request_room_requests
      WHERE tip_amount > 0
      UNION
      SELECT id AS user_id FROM public.profiles
    ) all_users
    WHERE user_id IS NOT NULL
  LOOP
    PERFORM public.backfill_user_behaviour_profile(r.user_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_user_behaviour_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_user_behaviour_profile(uuid) TO service_role;

COMMENT ON FUNCTION public.backfill_user_behaviour_profile(uuid) IS
  'Recompute user_behaviour_profiles counters from historical tips, plays, bookmarks, etc. Safe to re-run.';
