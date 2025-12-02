-- ============================================================================
-- Verify RPC Function Exists
-- Date: December 2, 2025
-- Purpose: Check if update_user_subscription_to_pro function exists
-- ============================================================================

-- Check if function exists
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_user_subscription_to_pro';

-- Check function permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'update_user_subscription_to_pro'
ORDER BY grantee, privilege_type;
