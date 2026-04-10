-- =============================================================================
-- BULK 2FA RESET — setup-totp stored wrong secret vs QR (pre-fix deploy)
-- =============================================================================
-- Context:
--   /api/user/2fa/setup-totp used secret.base32 while the QR used otpauth_url's
--   secret=… value. Users who enrolled via Settings → Security before the fix
--   (commit eac213ba on main: canonical secret from otpauth URL) may be unable
--   to verify TOTP. Related verify-code hardening: 37a4232f.
--
-- BEFORE YOU RUN:
--   1. Deploy web through eac213ba (or later) so new 2FA setups store the
--      correct secret.
--   2. Replace CUTOFF below with the UTC timestamptz when that deploy finished
--      (or use a conservative early bound). All two_factor_secrets rows with
--      created_at strictly before CUTOFF are treated as potentially broken.
--   3. Run PREVIEW queries first. Wrap DELETES in BEGIN … COMMIT (or ROLLBACK).
--   4. Send user comms (template at bottom of this file).
--
-- This script is NOT a Supabase migration — run manually in SQL Editor as DBA.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) SET CUTOFF (edit this)
-- -----------------------------------------------------------------------------
-- Example: production deploy completed 2026-04-10 15:30 UTC
-- \set is psql-only; in Supabase UI paste a literal timestamptz.

-- Preview / delete use this value (replace):
-- CUTOFF: '2026-04-10 15:30:00+00'

-- -----------------------------------------------------------------------------
-- 1) PREVIEW — affected user_ids
-- -----------------------------------------------------------------------------
-- SELECT user_id, created_at
-- FROM two_factor_secrets
-- WHERE created_at < TIMESTAMPTZ '2026-04-10 15:30:00+00'
-- ORDER BY created_at;

-- Count:
-- SELECT COUNT(*) AS affected_secrets
-- FROM two_factor_secrets
-- WHERE created_at < TIMESTAMPTZ '2026-04-10 15:30:00+00';

-- -----------------------------------------------------------------------------
-- 2) DELETE (order: sessions → backup codes → secrets)
-- -----------------------------------------------------------------------------
-- BEGIN;

-- DELETE FROM two_factor_verification_sessions
-- WHERE user_id IN (
--   SELECT user_id FROM two_factor_secrets
--   WHERE created_at < TIMESTAMPTZ '2026-04-10 15:30:00+00'
-- );

-- DELETE FROM two_factor_backup_codes
-- WHERE user_id IN (
--   SELECT user_id FROM two_factor_secrets
--   WHERE created_at < TIMESTAMPTZ '2026-04-10 15:30:00+00'
-- );

-- DELETE FROM two_factor_secrets
-- WHERE created_at < TIMESTAMPTZ '2026-04-10 15:30:00+00';

-- COMMIT;

-- -----------------------------------------------------------------------------
-- 3) IMMEDIATE SINGLE-USER RESET (testing / named account)
-- -----------------------------------------------------------------------------
-- User: bd8a455d-a54d-45c5-968d-e4cf5e8d928e — run anytime (no cutoff).

BEGIN;

DELETE FROM two_factor_verification_sessions
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

DELETE FROM two_factor_backup_codes
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

DELETE FROM two_factor_secrets
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

COMMIT;

-- -----------------------------------------------------------------------------
-- 4) EMAIL TEMPLATE (send via your mailer / CRM; not automated here)
-- -----------------------------------------------------------------------------
-- Subject: Important: Your Two-Factor Authentication has been reset
--
-- Hi [name],
--
-- We recently discovered a technical issue with our two-factor authentication
-- setup that affected some accounts. To protect your access, we've reset your
-- 2FA settings.
--
-- You can continue logging in with your email and password as normal. If you'd
-- like to re-enable two-factor authentication, you can do so from
-- Settings → Security.
--
-- We're sorry for the inconvenience.
--
-- — The SoundBridge Team
-- =============================================================================
