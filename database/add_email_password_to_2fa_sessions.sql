-- ================================================
-- Migration: Add email and password_hash to two_factor_verification_sessions
-- Date: November 23, 2025
-- Purpose: Support secure login-initiate flow for mobile app
-- ================================================

-- Add email column (for re-authentication after 2FA verification)
ALTER TABLE two_factor_verification_sessions
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add encrypted password column (encrypted using AES-256-GCM, same as TOTP secrets)
-- This allows re-authentication after 2FA verification without requiring user to re-enter password
ALTER TABLE two_factor_verification_sessions
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_2fa_sessions_email ON two_factor_verification_sessions(email);

-- Add comment explaining the purpose
COMMENT ON COLUMN two_factor_verification_sessions.email IS 'User email stored for re-authentication after 2FA verification';
COMMENT ON COLUMN two_factor_verification_sessions.password_hash IS 'Encrypted password (AES-256-GCM) stored temporarily for re-authentication after 2FA verification. Expires with session.';

