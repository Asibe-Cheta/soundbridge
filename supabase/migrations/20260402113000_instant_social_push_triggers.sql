-- Instant push triggers for high-priority social events
-- Replaces deferred message push queue with immediate webhook dispatch.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- Messages: instant push
-- =========================
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  notification_enabled BOOLEAN;
  push_url TEXT;
  service_role_key TEXT;
BEGIN
  SELECT COALESCE(message_notifications_enabled, TRUE)
  INTO notification_enabled
  FROM notification_preferences
  WHERE user_id = NEW.recipient_id;

  IF notification_enabled IS NULL THEN
    SELECT COALESCE(message_notifications_enabled, TRUE)
    INTO notification_enabled
    FROM user_notification_preferences
    WHERE user_id = NEW.recipient_id;
  END IF;

  IF notification_enabled IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT value INTO push_url FROM app_settings WHERE key = 'instant_message_push_url';
  SELECT value INTO service_role_key FROM app_settings WHERE key = 'service_role_key';

  IF push_url IS NULL THEN
    push_url := current_setting('app.settings.instant_message_push_url', true);
  END IF;

  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.settings.service_role_key', true);
  END IF;

  IF push_url IS NULL OR service_role_key IS NULL THEN
    RAISE NOTICE 'instant message push not configured';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := push_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('messageId', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message_notify ON messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();

-- =========================
-- Live sessions: instant push to followers
-- =========================
CREATE OR REPLACE FUNCTION trigger_live_session_started_push()
RETURNS TRIGGER AS $$
DECLARE
  push_url TEXT;
  service_role_key TEXT;
BEGIN
  IF NEW.status <> 'live' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT value INTO push_url FROM app_settings WHERE key = 'live_session_started_push_url';
  SELECT value INTO service_role_key FROM app_settings WHERE key = 'service_role_key';

  IF push_url IS NULL THEN
    push_url := current_setting('app.settings.live_session_started_push_url', true);
  END IF;

  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.settings.service_role_key', true);
  END IF;

  IF push_url IS NULL OR service_role_key IS NULL THEN
    RAISE NOTICE 'live session started push not configured';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := push_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('sessionId', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_live_session_started_push ON live_sessions;
CREATE TRIGGER on_live_session_started_push
  AFTER INSERT OR UPDATE OF status ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_live_session_started_push();
