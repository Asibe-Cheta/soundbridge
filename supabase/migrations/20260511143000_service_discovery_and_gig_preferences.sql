-- Service discovery preferences (Services tab filters) + gig alert preferences (provider dashboard).
-- See WEB_TEAM_SERVICE_PREFERENCES_MIGRATION.MD

-- ---------------------------------------------------------------------------
-- 1. service_discovery_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_discovery_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  max_distance_km INTEGER NOT NULL DEFAULT 30,
  min_budget NUMERIC(10, 2),
  max_budget NUMERIC(10, 2),
  service_categories TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_discovery_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own service discovery preferences" ON public.service_discovery_preferences;
CREATE POLICY "Users can read own service discovery preferences"
  ON public.service_discovery_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own service discovery preferences" ON public.service_discovery_preferences;
CREATE POLICY "Users can insert own service discovery preferences"
  ON public.service_discovery_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own service discovery preferences" ON public.service_discovery_preferences;
CREATE POLICY "Users can update own service discovery preferences"
  ON public.service_discovery_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_service_discovery_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_discovery_preferences_updated_at ON public.service_discovery_preferences;
CREATE TRIGGER trg_service_discovery_preferences_updated_at
  BEFORE UPDATE ON public.service_discovery_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_service_discovery_preferences_updated_at();

-- ---------------------------------------------------------------------------
-- 2. service_provider_gig_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_provider_gig_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  gig_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  alert_categories TEXT[],
  availability_status TEXT NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'available_from', 'not_available')),
  available_from_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_provider_gig_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own gig alert preferences" ON public.service_provider_gig_preferences;
CREATE POLICY "Users can read own gig alert preferences"
  ON public.service_provider_gig_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gig alert preferences" ON public.service_provider_gig_preferences;
CREATE POLICY "Users can insert own gig alert preferences"
  ON public.service_provider_gig_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gig alert preferences" ON public.service_provider_gig_preferences;
CREATE POLICY "Users can update own gig alert preferences"
  ON public.service_provider_gig_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_service_provider_gig_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_provider_gig_preferences_updated_at ON public.service_provider_gig_preferences;
CREATE TRIGGER trg_service_provider_gig_preferences_updated_at
  BEFORE UPDATE ON public.service_provider_gig_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_service_provider_gig_preferences_updated_at();

-- ---------------------------------------------------------------------------
-- 3. service_provider_profiles — lat/lng for radius filtering (optional enhancement)
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_provider_profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
