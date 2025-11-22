-- ============================================
-- 2FA USER LOCKOUT FIX - EMERGENCY RESET
-- ============================================
-- User: asibechetachukwu@gmail.com
-- Issue: 2FA enabled but no authenticator app entry + 0 backup codes
-- Action: Reset 2FA to allow user to re-enable properly
-- Date: November 22, 2025
-- ============================================

-- ================================================
-- STEP 1: FIND USER'S UUID
-- ================================================
-- Run this first to get the user's UUID

SELECT 
  id as user_uuid,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'asibechetachukwu@gmail.com';

-- ✅ COPY THE 'user_uuid' FROM THE RESULT
-- It will look like: 12345678-1234-1234-1234-123456789abc
-- You'll need this for the next steps

-- ================================================
-- STEP 2: CHECK CURRENT 2FA STATUS (BEFORE RESET)
-- ================================================
-- Replace 'USER_UUID_HERE' with the actual UUID from Step 1

-- Check 2FA secret
SELECT 
  id,
  user_id,
  method,
  created_at as configured_at
FROM two_factor_secrets 
WHERE user_id = 'USER_UUID_HERE';

-- Expected: 1 row (confirming 2FA is enabled)

-- Check backup codes
SELECT 
  id,
  code_hash,
  used,
  used_at,
  created_at
FROM two_factor_backup_codes 
WHERE user_id = 'USER_UUID_HERE'
ORDER BY created_at DESC;

-- Expected: 0 rows or 10 rows (all used)

-- ================================================
-- STEP 3: RESET 2FA (DELETE RECORDS)
-- ================================================
-- ⚠️ CRITICAL: Replace 'USER_UUID_HERE' with actual UUID

-- Delete 2FA secret (this disables 2FA)
DELETE FROM two_factor_secrets 
WHERE user_id = 'USER_UUID_HERE';

-- Expected: DELETE 1 (1 row deleted)

-- Delete all backup codes
DELETE FROM two_factor_backup_codes 
WHERE user_id = 'USER_UUID_HERE';

-- Expected: DELETE 0 to DELETE 10 (depending on how many existed)

-- ================================================
-- STEP 4: VERIFY RESET WAS SUCCESSFUL
-- ================================================
-- Replace 'USER_UUID_HERE' with the actual UUID

-- Verify both tables are now empty for this user
SELECT 
  (SELECT COUNT(*) FROM two_factor_secrets WHERE user_id = 'USER_UUID_HERE') as secrets_count,
  (SELECT COUNT(*) FROM two_factor_backup_codes WHERE user_id = 'USER_UUID_HERE') as backup_codes_count;

-- ✅ Expected: secrets_count = 0, backup_codes_count = 0
-- ✅ This confirms 2FA is now disabled

-- ================================================
-- STEP 5: AUDIT LOG (OPTIONAL - RECORD THE RESET)
-- ================================================
-- Replace 'USER_UUID_HERE' with the actual UUID

INSERT INTO two_factor_audit_log (
  user_id,
  action,
  method,
  success,
  metadata,
  created_at
) VALUES (
  'USER_UUID_HERE',
  'manual_reset',
  'totp',
  true,
  '{"reason": "User locked out - no authenticator entry + 0 backup codes", "reset_by": "web_team", "date": "2025-11-22"}'::jsonb,
  NOW()
);

-- Expected: INSERT 1 (audit trail created)

-- ================================================
-- VERIFICATION CHECKLIST
-- ================================================
-- After running the above queries, verify:
-- [ ] Step 1: Got user UUID successfully
-- [ ] Step 2: Confirmed user had 2FA enabled (1 row in two_factor_secrets)
-- [ ] Step 3: Deleted 1 row from two_factor_secrets
-- [ ] Step 3: Deleted 0-10 rows from two_factor_backup_codes
-- [ ] Step 4: Verified both counts are now 0
-- [ ] Step 5: Audit log entry created

-- ================================================
-- NEXT STEPS FOR USER
-- ================================================
-- 1. Tell user to refresh mobile app (pull to refresh on 2FA settings)
-- 2. User should see "2FA Disabled"
-- 3. User can now re-enable 2FA properly
-- 4. This time they MUST scan QR code with Google Authenticator
-- 5. This time they MUST save backup codes

-- ================================================
-- EXPECTED TIMELINE
-- ================================================
-- Running these queries: ~2 minutes
-- User refreshes app: ~30 seconds
-- User re-enables 2FA: ~2 minutes
-- Total: ~5 minutes to full resolution

-- ================================================
-- NOTES
-- ================================================
-- ✅ Safe to run: User is currently logged in, won't lose access
-- ✅ User can immediately log out and back in (no 2FA prompt)
-- ✅ User can re-enable 2FA properly this time
-- ⚠️ Make sure to replace 'USER_UUID_HERE' in Steps 2-5!
-- ⚠️ Run Step 1 first to get the actual UUID

-- ============================================
-- END OF SCRIPT
-- ============================================

