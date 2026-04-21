-- Venue notifications: preferences table + reliable backup triggers for matcher function.
-- Covers mobile fire-and-forget failures and web-created venues.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.venue_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  min_budget NUMERIC(10, 2),
  max_budget NUMERIC(10, 2),
  preferred_venue_types TEXT[] DEFAULT '{}',
  preferred_location_lat DOUBLE PRECISION,
  preferred_location_lng DOUBLE PRECISION,
  notification_radius_km INTEGER NOT NULL DEFAULT 25 CHECK (notification_radius_km IN (5, 10, 25, 50, 100, 200)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own venue notification preferences" ON public.venue_notification_preferences;
CREATE POLICY "Users can read own venue notification preferences"
  ON public.venue_notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own venue notification preferences" ON public.venue_notification_preferences;
CREATE POLICY "Users can insert own venue notification preferences"
  ON public.venue_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own venue notification preferences" ON public.venue_notification_preferences;
CREATE POLICY "Users can update own venue notification preferences"
  ON public.venue_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_venue_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venue_notification_preferences_updated_at ON public.venue_notification_preferences;
CREATE TRIGGER trg_venue_notification_preferences_updated_at
  BEFORE UPDATE ON public.venue_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_venue_notification_preferences_updated_at();

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.trigger_venue_notification_matcher(p_venue_id UUID)
RETURNS VOID AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  IF p_venue_id IS NULL THEN
    RETURN;
  END IF;

  SELECT value INTO function_url FROM public.app_settings WHERE key = 'venue_notification_matcher_url';
  SELECT value INTO service_role_key FROM public.app_settings WHERE key = 'service_role_key';

  IF function_url IS NULL THEN
    function_url := current_setting('app.settings.venue_notification_matcher_url', true);
  END IF;
  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.settings.service_role_key', true);
  END IF;

  IF function_url IS NULL OR service_role_key IS NULL THEN
    RAISE NOTICE 'Venue notification matcher not configured (missing URL or service role key)';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('venue_id', p_venue_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trigger_venue_notifications_on_venue_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.trigger_venue_notification_matcher(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_venue_created_notify_matcher ON public.venues;
CREATE TRIGGER on_venue_created_notify_matcher
  AFTER INSERT ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_venue_notifications_on_venue_insert();

CREATE OR REPLACE FUNCTION public.trigger_venue_notifications_on_availability_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.trigger_venue_notification_matcher(NEW.venue_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_venue_availability_created_notify_matcher ON public.venue_availability;
CREATE TRIGGER on_venue_availability_created_notify_matcher
  AFTER INSERT ON public.venue_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_venue_notifications_on_availability_insert();

