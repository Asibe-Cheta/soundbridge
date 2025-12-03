-- ============================================================================
-- Diagnose RPC Function Error
-- Purpose: Check what's causing "column user_id does not exist" error
-- ============================================================================

-- 1. Check if user_subscriptions table exists and has user_id column
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
  AND column_name = 'user_id';

-- 2. Check for any views that might be interfering
SELECT 
  table_schema,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (table_name LIKE '%subscription%' OR view_definition LIKE '%user_subscriptions%');

-- 3. Check RLS policies on user_subscriptions
SELECT 
  policyname,
  cmd AS command,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_subscriptions';

-- 4. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_subscriptions';

-- 5. Check function definitions to see if they reference user_id correctly
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('update_user_subscription_to_pro', 'insert_user_subscription_to_pro');

-- 6. Test if we can SELECT from the table directly
SELECT 
  id,
  user_id,
  tier,
  status
FROM public.user_subscriptions
LIMIT 1;
