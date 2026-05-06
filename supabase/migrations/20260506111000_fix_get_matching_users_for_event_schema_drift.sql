-- Fix schema drift for get_matching_users_for_event()
-- The legacy implementation queried notification columns from user_event_preferences,
-- but user_event_preferences now stores event_type preferences.
-- This function now delegates candidate selection to find_nearby_users_for_event()
-- and enriches with notification preference fallbacks.

CREATE OR REPLACE FUNCTION get_matching_users_for_event(
  p_event_id UUID
)
RETURNS TABLE (
  user_id UUID,
  push_token TEXT,
  notification_radius_km INTEGER,
  event_categories TEXT[],
  max_notifications_per_week INTEGER,
  notifications_sent_this_week INTEGER,
  quiet_hours_enabled BOOLEAN,
  quiet_hours_start TIME,
  quiet_hours_end TIME
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.user_id,
    n.expo_push_token AS push_token,
    20::INTEGER AS notification_radius_km,
    COALESCE(unp.preferred_event_genres, ARRAY[]::TEXT[]) AS event_categories,
    GREATEST(COALESCE(unp.max_notifications_per_day, 5) * 7, 1)::INTEGER AS max_notifications_per_week,
    0::INTEGER AS notifications_sent_this_week,
    false AS quiet_hours_enabled,
    '22:00'::TIME AS quiet_hours_start,
    '08:00'::TIME AS quiet_hours_end
  FROM find_nearby_users_for_event(p_event_id, 20) n
  LEFT JOIN user_notification_preferences unp ON unp.user_id = n.user_id;
END;
$$;
