-- ============================================================================
-- Check RLS Policies and Permissions for user_subscriptions
-- Date: December 2, 2025
-- Purpose: Diagnose why API can't see user_id column
-- Status: Diagnostic Script
-- ============================================================================

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public';

-- Check all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public';

-- Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions';

-- Check if there are any views on this table
SELECT 
  table_schema,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (view_definition LIKE '%user_subscriptions%' OR table_name LIKE '%subscription%');

-- Check column permissions (if any)
SELECT 
  grantee,
  column_name,
  privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions';

-- Test query as authenticated role (simulate what API does)
-- This will show if RLS is blocking access
SET ROLE authenticated;
SELECT 
  'Testing as authenticated role' AS test,
  COUNT(*) AS row_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM public.user_subscriptions;
RESET ROLE;

-- Check if there's a schema search path issue
SHOW search_path;

-- List all tables named user_subscriptions in any schema
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'user_subscriptions';
