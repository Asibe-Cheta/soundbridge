-- Event notification matching: read from notification_preferences (mobile) with fallback to user_notification_preferences
-- So preferences saved in the mobile app (notification_preferences) are used when finding users to notify.
-- Ref: WEB_TEAM_NOTIFICATIONS_PREFERENCES.md

DROP FUNCTION IF EXISTS find_nearby_users_for_event(UUID, DECIMAL);
CREATE OR REPLACE FUNCTION find_nearby_users_for_event(
  p_event_id UUID,
  p_max_distance_km DECIMAL DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  expo_push_token TEXT,
  username TEXT,
  display_name TEXT,
  city TEXT,
  distance_km DECIMAL,
  preferred_categories TEXT[],
  start_hour INTEGER,
  end_hour INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_city TEXT;
  v_event_latitude DECIMAL;
  v_event_longitude DECIMAL;
  v_event_category TEXT;
  v_event_creator UUID;
  v_mapped_category TEXT;
BEGIN
  SELECT
    e.city,
    e.latitude,
    e.longitude,
    e.category::text,
    e.creator_id
  INTO
    v_event_city,
    v_event_latitude,
    v_event_longitude,
    v_event_category,
    v_event_creator
  FROM events e
  WHERE e.id = p_event_id;

  IF v_event_category IS NULL THEN
    RETURN;
  END IF;

  v_mapped_category := CASE v_event_category
    WHEN 'Gospel' THEN 'Gospel Concert'
    WHEN 'Jazz' THEN 'Jazz Room'
    WHEN 'Classical' THEN 'Instrumental'
    WHEN 'Carnival' THEN 'Carnival'
    WHEN 'Christian' THEN 'Gospel Concert'
    WHEN 'Hip-Hop' THEN 'Music Concert'
    WHEN 'Afrobeat' THEN 'Music Concert'
    WHEN 'Rock' THEN 'Music Concert'
    WHEN 'Pop' THEN 'Music Concert'
    WHEN 'Secular' THEN 'Music Concert'
    WHEN 'Other' THEN 'Other'
    ELSE v_event_category
  END;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    COALESCE(p.expo_push_token, upt.push_token) AS expo_push_token,
    p.username,
    p.display_name,
    p.city,
    CASE
      WHEN v_event_latitude IS NOT NULL AND v_event_longitude IS NOT NULL
           AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        (
          6371 * acos(
            cos(radians(v_event_latitude)) *
            cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(v_event_longitude)) +
            sin(radians(v_event_latitude)) *
            sin(radians(p.latitude))
          )
        )::numeric
      ELSE NULL
    END AS distance_km,
    COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[]) AS preferred_categories,
    COALESCE(np_main.start_hour, unp.notification_start_hour, 8)::INTEGER AS start_hour,
    COALESCE(np_main.end_hour, unp.notification_end_hour, 22)::INTEGER AS end_hour
  FROM profiles p
  LEFT JOIN notification_preferences np_main ON np_main.user_id = p.id
  LEFT JOIN user_notification_preferences unp ON unp.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT push_token
    FROM user_push_tokens upt_src
    WHERE upt_src.user_id = p.id
    ORDER BY last_used_at DESC
    LIMIT 1
  ) upt ON TRUE
  WHERE
    p.id != v_event_creator
    AND (p.expo_push_token IS NOT NULL OR upt.push_token IS NOT NULL)
    AND (
      -- No prefs row: allow (default on)
      (np_main.user_id IS NULL AND unp.user_id IS NULL)
      OR
      -- Mobile table: respect enabled + event_notifications_enabled
      (np_main.user_id IS NOT NULL AND COALESCE(np_main.enabled, true) = true AND COALESCE(np_main.event_notifications_enabled, true) = true)
      OR
      -- Legacy table only: respect event_notifications_enabled
      (np_main.user_id IS NULL AND unp.user_id IS NOT NULL AND COALESCE(unp.event_notifications_enabled, true) = true)
    )
    AND (
      -- Category match: use preferred_event_genres from either table; empty/null = match all
      (array_length(COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[]), 1) IS NULL)
      OR (v_mapped_category = ANY(COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[])))
      OR (
        v_mapped_category = 'Other'
        AND (
          'Conference' = ANY(COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[]))
          OR 'Conferences & Seminars' = ANY(COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[]))
        )
      )
    )
    AND (
      (v_event_city IS NOT NULL AND p.city IS NOT NULL AND LOWER(p.city) = LOWER(v_event_city))
      OR (
        v_event_latitude IS NOT NULL AND v_event_longitude IS NOT NULL
        AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(v_event_latitude)) *
            cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(v_event_longitude)) +
            sin(radians(v_event_latitude)) *
            sin(radians(p.latitude))
          )
        ) <= p_max_distance_km
      )
    );
END;
$$;
