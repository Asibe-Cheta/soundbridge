-- Service Provider Dashboard compatibility fixes (mobile + web).
-- @see WEB_TEAM_SERVICE_PROVIDER_DASHBOARD_FIXES2.md

-- Ensure availability timezone defaults to UTC.
ALTER TABLE public.service_provider_availability
  ALTER COLUMN timezone SET DEFAULT 'UTC';

-- Keep verification profile fields present.
ALTER TABLE public.service_provider_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_provider VARCHAR(50);

-- RLS: users read own sessions, service role manages all sessions.
ALTER TABLE public.provider_verification_sessions ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_verification_sessions'
      AND policyname = 'Service role can manage verification sessions'
  ) THEN
    CREATE POLICY "Service role can manage verification sessions"
      ON public.provider_verification_sessions
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$policy$;

-- Populated bookings view for dashboards.
CREATE OR REPLACE VIEW public.service_bookings_populated AS
SELECT
  sb.*,
  json_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url
  ) AS booker,
  json_build_object(
    'id', so.id,
    'title', so.title,
    'rate', so.rate_amount,
    'rate_amount', so.rate_amount,
    'unit', so.rate_unit,
    'rate_unit', so.rate_unit,
    'rate_currency', so.rate_currency
  ) AS offering
FROM public.service_bookings sb
LEFT JOIN public.profiles p ON p.id = sb.booker_id
LEFT JOIN public.service_offerings so ON so.id = sb.service_offering_id;

GRANT SELECT ON public.service_bookings_populated TO authenticated;

-- Populated reviews view for dashboards.
CREATE OR REPLACE VIEW public.service_reviews_populated AS
SELECT
  sr.*,
  p.display_name AS reviewer_display_name,
  p.avatar_url AS reviewer_avatar_url,
  p.username AS reviewer_username
FROM public.service_reviews sr
LEFT JOIN public.profiles p ON p.id = sr.reviewer_id;

GRANT SELECT ON public.service_reviews_populated TO authenticated;
