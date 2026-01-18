-- Event Notification Webhook - Settings Storage
-- Date: January 18, 2026
-- Purpose: Store webhook URL + secret without ALTER DATABASE permissions

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Trigger: Call Edge Function on event creation (load settings from table first)
CREATE OR REPLACE FUNCTION trigger_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  SELECT value INTO function_url FROM app_settings WHERE key = 'event_notifications_url';
  SELECT value INTO service_role_key FROM app_settings WHERE key = 'service_role_key';

  IF function_url IS NULL THEN
    function_url := current_setting('app.settings.event_notifications_url', true);
  END IF;

  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.settings.service_role_key', true);
  END IF;

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
