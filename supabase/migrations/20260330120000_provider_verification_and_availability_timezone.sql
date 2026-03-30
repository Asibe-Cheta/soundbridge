-- Service provider verification (Persona) + profile timestamps + availability timezone default
-- @see WEB_TEAM_SERVICE_PROVIDER_DASHBOARD_FIXES.md

CREATE TABLE IF NOT EXISTS provider_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'persona',
  session_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  amount_paid INTEGER DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'GBP',
  verification_data JSONB,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_verification_sessions_user_id
  ON provider_verification_sessions(user_id);

ALTER TABLE provider_verification_sessions ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_verification_sessions'
      AND policyname = 'Users can view own verification sessions'
  ) THEN
    CREATE POLICY "Users can view own verification sessions"
      ON provider_verification_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$policy$;

ALTER TABLE service_provider_profiles
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_provider VARCHAR(50);

ALTER TABLE service_provider_availability
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
