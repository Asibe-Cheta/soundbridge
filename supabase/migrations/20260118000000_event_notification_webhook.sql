-- Event Notification Webhook - Core Tables, Functions, Trigger
-- Date: January 18, 2026
-- Purpose: Ensure event notification pipeline is fully deployed

-- Required for http calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Notification history (quota tracking + audit)
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user_type_date
  ON notification_history(user_id, type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_history_event
  ON notification_history(event_id);

-- Function: Find nearby users for event notifications
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
        6371 * acos(
          cos(radians(v_event_latitude)) *
          cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(v_event_longitude)) +
          sin(radians(v_event_latitude)) *
          sin(radians(p.latitude))
        )
      ELSE NULL
    END AS distance_km,
    COALESCE(np.preferred_event_genres, ARRAY[]::TEXT[]) AS preferred_categories,
    COALESCE(np.notification_start_hour, 8) AS start_hour,
    COALESCE(np.notification_end_hour, 22) AS end_hour
  FROM profiles p
  LEFT JOIN user_notification_preferences np ON np.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT push_token
    FROM user_push_tokens
    WHERE user_id = p.id
    ORDER BY last_used_at DESC
    LIMIT 1
  ) upt ON TRUE
  WHERE
    p.id != v_event_creator
    AND (p.expo_push_token IS NOT NULL OR upt.push_token IS NOT NULL)
    AND COALESCE(np.event_notifications_enabled, TRUE) = TRUE
    AND (
      np.preferred_event_genres IS NULL
      OR array_length(np.preferred_event_genres, 1) IS NULL
      OR v_mapped_category = ANY(np.preferred_event_genres)
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

-- Function: Check daily notification quota
CREATE OR REPLACE FUNCTION check_notification_quota(
  p_user_id UUID,
  p_daily_limit INTEGER DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < p_daily_limit
    FROM notification_history
    WHERE user_id = p_user_id
      AND type = 'event'
      AND sent_at >= NOW() - INTERVAL '24 hours'
  );
END;
$$;

-- Function: Record notification sent
CREATE OR REPLACE FUNCTION record_notification_sent(
  p_user_id UUID,
  p_event_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notification_history (
    user_id,
    event_id,
    type,
    title,
    body,
    data,
    sent_at
  )
  VALUES (
    p_user_id,
    p_event_id,
    p_type,
    p_title,
    p_body,
    p_data,
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION find_nearby_users_for_event(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION check_notification_quota(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION record_notification_sent(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Trigger: Call Edge Function on event creation
CREATE OR REPLACE FUNCTION trigger_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT := current_setting('app.settings.event_notifications_url', true);
  service_role_key TEXT := current_setting('app.settings.service_role_key', true);
BEGIN
  IF function_url IS NULL OR service_role_key IS NULL THEN
    RAISE NOTICE 'Event notifications not configured';
    RETURN NEW;
  END IF;

  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_created ON events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_notifications();
