-- Event Notification Webhook - Compatibility Updates
-- Date: January 18, 2026
-- Purpose: Align function/table names with latest spec while keeping existing pipeline

-- Add compatibility columns to notification_history
ALTER TABLE notification_history
ADD COLUMN IF NOT EXISTS notification_type TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- Backfill new columns from existing data
UPDATE notification_history
SET notification_type = COALESCE(notification_type, type),
    created_at = COALESCE(created_at, sent_at)
WHERE notification_type IS NULL OR created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_history_user_type_created
  ON notification_history(user_id, notification_type, created_at DESC);

-- Compatibility function name expected by doc
CREATE OR REPLACE FUNCTION find_users_for_event_notification(
  p_event_id UUID,
  p_max_distance_km NUMERIC DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  expo_push_token TEXT,
  distance_km NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    user_id,
    expo_push_token,
    distance_km
  FROM find_nearby_users_for_event(p_event_id, p_max_distance_km);
END;
$$;

-- Compatibility function name expected by doc
CREATE OR REPLACE FUNCTION check_event_notification_quota(
  p_user_id UUID,
  p_daily_limit INT DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < p_daily_limit
    FROM notification_history
    WHERE user_id = p_user_id
      AND notification_type = 'event'
      AND created_at >= NOW() - INTERVAL '24 hours'
  );
END;
$$;

-- Update record_notification_sent to fill compatibility columns
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
    notification_type,
    title,
    body,
    data,
    sent_at,
    created_at,
    read
  )
  VALUES (
    p_user_id,
    p_event_id,
    p_type,
    p_type,
    p_title,
    p_body,
    p_data,
    NOW(),
    NOW(),
    false
  );
END;
$$;
