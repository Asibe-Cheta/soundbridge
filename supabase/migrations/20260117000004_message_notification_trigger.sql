-- Message Notifications - Trigger
-- Date: January 17, 2026

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  notification_enabled BOOLEAN;
  sender_name TEXT;
BEGIN
  SELECT COALESCE(message_notifications_enabled, TRUE)
  INTO notification_enabled
  FROM user_notification_preferences
  WHERE user_id = NEW.recipient_id;

  IF notification_enabled IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, username)
  INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  INSERT INTO scheduled_notifications (
    user_id,
    notification_type,
    title,
    body,
    data,
    scheduled_for,
    status
  ) VALUES (
    NEW.recipient_id,
    'message',
    'New message from ' || COALESCE(sender_name, 'Someone'),
    LEFT(COALESCE(NEW.content, ''), 100),
    jsonb_build_object(
      'type', 'message',
      'messageId', NEW.id,
      'senderId', NEW.sender_id,
      'conversationId',
      LEAST(NEW.sender_id::text, NEW.recipient_id::text) || '_' ||
      GREATEST(NEW.sender_id::text, NEW.recipient_id::text)
    ),
    NOW(),
    'pending'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block message creation due to notification issues
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_message_notify ON messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();
