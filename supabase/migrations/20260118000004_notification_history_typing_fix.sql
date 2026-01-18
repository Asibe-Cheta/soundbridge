-- Notification History - Ensure notification_type is populated
-- Date: January 18, 2026

UPDATE notification_history
SET notification_type = type
WHERE notification_type IS NULL;

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
