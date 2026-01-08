-- Event Notification System - Database Functions
-- Date: January 8, 2026
-- Purpose: Functions for finding nearby users and managing notification quotas

-- Function 1: Find nearby users for event notifications
-- Finds users within 20km radius or same city who like the event category
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
BEGIN
  -- Get event location and category
  SELECT 
    e.city,
    e.latitude,
    e.longitude,
    e.category
  INTO 
    v_event_city,
    v_event_latitude,
    v_event_longitude,
    v_event_category
  FROM events e
  WHERE e.id = p_event_id;

  -- Return if event not found or missing required data
  IF v_event_category IS NULL THEN
    RETURN;
  END IF;

  -- Find users with same city OR within distance
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.expo_push_token,
    p.username,
    p.display_name,
    p.city,
    CASE 
      WHEN v_event_latitude IS NOT NULL AND v_event_longitude IS NOT NULL 
           AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        -- Calculate distance using Haversine formula (in km)
        6371 * acos(
          cos(radians(v_event_latitude)) * 
          cos(radians(p.latitude)) * 
          cos(radians(p.longitude) - radians(v_event_longitude)) + 
          sin(radians(v_event_latitude)) * 
          sin(radians(p.latitude))
        )
      ELSE NULL
    END AS distance_km,
    COALESCE(p.preferred_event_categories, ARRAY[]::TEXT[]) AS preferred_categories,
    COALESCE(p.notification_start_hour, 8) AS start_hour,
    COALESCE(p.notification_end_hour, 22) AS end_hour
  FROM profiles p
  WHERE 
    -- User must have push token
    p.expo_push_token IS NOT NULL
    -- User must have notifications enabled
    AND COALESCE(p.event_notifications_enabled, TRUE) = TRUE
    -- User must be in same city OR within distance
    AND (
      (v_event_city IS NOT NULL AND p.city = v_event_city) OR
      (v_event_latitude IS NOT NULL AND v_event_longitude IS NOT NULL 
       AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
       AND (
         6371 * acos(
           cos(radians(v_event_latitude)) * 
           cos(radians(p.latitude)) * 
           cos(radians(p.longitude) - radians(v_event_longitude)) + 
           sin(radians(v_event_latitude)) * 
           sin(radians(p.latitude))
         ) <= p_max_distance_km
       ))
    )
    -- User's preferred categories must include event category
    AND (
      p.preferred_event_categories IS NULL OR
      array_length(p.preferred_event_categories, 1) IS NULL OR
      v_event_category = ANY(p.preferred_event_categories)
    )
    -- Don't notify the event creator
    AND p.id != (SELECT creator_id FROM events WHERE id = p_event_id);
END;
$$;

-- Function 2: Check notification quota
-- Verifies user hasn't exceeded daily limit (default 3 notifications/day)
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

-- Function 3: Record notification sent
-- Records notification in history table
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_nearby_users_for_event(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION check_notification_quota(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION record_notification_sent(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
