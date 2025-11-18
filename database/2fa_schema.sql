-- ================================================
-- SoundBridge 2FA Database Schema
-- Created: November 17, 2025
-- Description: Complete 2FA system with TOTP, backup codes, and audit logging
-- ================================================

-- ================================================
-- Table 1: two_factor_secrets
-- Stores encrypted TOTP secrets for users
-- ================================================
CREATE TABLE IF NOT EXISTS two_factor_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_secret TEXT NOT NULL, -- AES-256-GCM encrypted TOTP secret
    method VARCHAR(20) NOT NULL DEFAULT 'totp',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_2fa UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_2fa_secrets_user_id ON two_factor_secrets(user_id);

-- Enable Row Level Security
ALTER TABLE two_factor_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own 2FA secrets
DROP POLICY IF EXISTS "Users can only access their own 2FA secrets" ON two_factor_secrets;
CREATE POLICY "Users can only access their own 2FA secrets"
  ON two_factor_secrets
  FOR ALL
  USING (auth.uid() = user_id);

-- Service role bypass (for API endpoints)
DROP POLICY IF EXISTS "Service role full access to 2FA secrets" ON two_factor_secrets;
CREATE POLICY "Service role full access to 2FA secrets"
  ON two_factor_secrets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- Table 2: two_factor_backup_codes
-- Stores hashed backup codes (bcrypt)
-- ================================================
CREATE TABLE IF NOT EXISTS two_factor_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL, -- bcrypt hashed backup code
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',
    
    CONSTRAINT unique_code_hash UNIQUE(code_hash)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON two_factor_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_used ON two_factor_backup_codes(used, expires_at);
CREATE INDEX IF NOT EXISTS idx_backup_codes_expires_at ON two_factor_backup_codes(expires_at);

-- Enable RLS
ALTER TABLE two_factor_backup_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own backup codes
DROP POLICY IF EXISTS "Users can only access their own backup codes" ON two_factor_backup_codes;
CREATE POLICY "Users can only access their own backup codes"
  ON two_factor_backup_codes
  FOR ALL
  USING (auth.uid() = user_id);

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access to backup codes" ON two_factor_backup_codes;
CREATE POLICY "Service role full access to backup codes"
  ON two_factor_backup_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- Table 3: two_factor_verification_sessions
-- Temporary sessions for 2FA verification flow
-- ================================================
CREATE TABLE IF NOT EXISTS two_factor_verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    verified BOOLEAN DEFAULT FALSE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_2fa_sessions_user_id ON two_factor_verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_sessions_token ON two_factor_verification_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_2fa_sessions_expires ON two_factor_verification_sessions(expires_at);

-- Enable RLS
ALTER TABLE two_factor_verification_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role only (these are temporary backend sessions)
DROP POLICY IF EXISTS "Service role only for verification sessions" ON two_factor_verification_sessions;
CREATE POLICY "Service role only for verification sessions"
  ON two_factor_verification_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- Table 4: two_factor_audit_log
-- Complete audit trail for all 2FA actions
-- ================================================
CREATE TABLE IF NOT EXISTS two_factor_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'enabled', 'disabled', 'verified', 'failed', 'backup_used', etc.
    method VARCHAR(20), -- 'totp', 'backup_code', 'recovery'
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_2fa_audit_user_id ON two_factor_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_audit_created_at ON two_factor_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_2fa_audit_action ON two_factor_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_2fa_audit_success ON two_factor_audit_log(success);

-- Enable RLS
ALTER TABLE two_factor_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own audit log
DROP POLICY IF EXISTS "Users can view their own audit log" ON two_factor_audit_log;
CREATE POLICY "Users can view their own audit log"
  ON two_factor_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert and read all audit logs
DROP POLICY IF EXISTS "Service role can manage audit logs" ON two_factor_audit_log;
CREATE POLICY "Service role can manage audit logs"
  ON two_factor_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- Function: Auto-cleanup expired sessions
-- Runs periodically to remove old verification sessions
-- ================================================
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM two_factor_verification_sessions
  WHERE expires_at < NOW();
END;
$$;

-- ================================================
-- Function: Auto-cleanup expired backup codes
-- Removes backup codes older than 90 days
-- ================================================
CREATE OR REPLACE FUNCTION cleanup_expired_backup_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM two_factor_backup_codes
  WHERE expires_at < NOW();
END;
$$;

-- ================================================
-- Optional: Create periodic cleanup jobs (if using pg_cron extension)
-- Note: Uncomment if pg_cron is available in your Supabase project
-- ================================================
-- SELECT cron.schedule(
--   'cleanup-expired-2fa-sessions',
--   '*/15 * * * *', -- Every 15 minutes
--   $$SELECT cleanup_expired_2fa_sessions();$$
-- );

-- SELECT cron.schedule(
--   'cleanup-expired-backup-codes',
--   '0 0 * * *', -- Daily at midnight
--   $$SELECT cleanup_expired_backup_codes();$$
-- );

-- ================================================
-- Grant necessary permissions
-- ================================================
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ================================================
-- Verification queries (run after creation)
-- ================================================
-- SELECT 'two_factor_secrets' as table_name, COUNT(*) as row_count FROM two_factor_secrets
-- UNION ALL
-- SELECT 'two_factor_backup_codes', COUNT(*) FROM two_factor_backup_codes
-- UNION ALL
-- SELECT 'two_factor_verification_sessions', COUNT(*) FROM two_factor_verification_sessions
-- UNION ALL
-- SELECT 'two_factor_audit_log', COUNT(*) FROM two_factor_audit_log;

-- ================================================
-- DEPLOYMENT NOTES:
-- ================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify all tables created successfully
-- 3. Check RLS policies are enabled
-- 4. Test with a service role query
-- 5. Set up environment variables (TOTP_ENCRYPTION_KEY)
-- ================================================

