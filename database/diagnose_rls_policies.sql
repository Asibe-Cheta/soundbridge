-- ============================================================================
-- Diagnose RLS Policies on user_subscriptions
-- Date: December 2, 2025
-- Purpose: Check RLS policies that might be blocking INSERT/UPDATE
-- Based on: Claude's diagnosis suggesting RLS policy issue
-- ============================================================================

-- ============================================================================
-- Step 1: Check if RLS is enabled
-- ============================================================================
SELECT 
  tablename, 
  rowsecurity AS rls_enabled,
  schemaname
FROM pg_tables 
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public';

-- ============================================================================
-- Step 2: Check all RLS policies on user_subscriptions
-- ============================================================================
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd AS command_type,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- ============================================================================
-- Step 3: Check for policies in pg_policy system table (more detailed)
-- ============================================================================
SELECT 
  p.polname AS policy_name,
  p.polcmd AS command_type,
  p.polpermissive AS permissive,
  p.polroles AS roles,
  pg_get_expr(p.polqual, p.polrelid) AS using_clause,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_clause,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command_name
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_subscriptions'
  AND n.nspname = 'public'
ORDER BY p.polcmd, p.polname;

-- ============================================================================
-- Step 4: Check table structure and columns
-- ============================================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- ============================================================================
-- Step 5: Check for views that might be interfering
-- ============================================================================
SELECT 
  table_schema, 
  table_name, 
  table_type
FROM information_schema.tables
WHERE table_name = 'user_subscriptions'
ORDER BY table_schema, table_type;

-- ============================================================================
-- Step 6: Check grants and permissions
-- ============================================================================
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- Analysis Notes
-- ============================================================================
-- If RLS is enabled but policies are missing WITH CHECK clauses for INSERT,
-- that could cause the "column does not exist" error during INSERT/UPDATE.
-- 
-- Key things to check:
-- 1. Is RLS enabled? (should be true)
-- 2. Are there INSERT/UPDATE policies?
-- 3. Do INSERT policies have WITH CHECK clauses?
-- 4. Do UPDATE policies have both USING and WITH CHECK clauses?
