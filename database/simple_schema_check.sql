-- ============================================================================
-- Simple Schema Check for user_subscriptions
-- Date: December 2, 2025
-- Purpose: Basic checks to find duplicate tables/views
-- Status: Diagnostic Script - Run each section separately if needed
-- ============================================================================

-- ============================================================================
-- Step 1: Find ALL tables named user_subscriptions across ALL schemas
-- ============================================================================
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'user_subscriptions'
ORDER BY table_schema, table_type;

-- ============================================================================
-- Step 2: Check for views
-- ============================================================================
SELECT 
  schemaname,
  viewname
FROM pg_views
WHERE viewname = 'user_subscriptions'
ORDER BY schemaname;

-- ============================================================================
-- Step 3: Get column information from public schema
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- ============================================================================
-- Step 4: Check RLS policies
-- ============================================================================
SELECT 
  policyname,
  cmd AS command_type
FROM pg_policies
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public'
ORDER BY cmd;

-- ============================================================================
-- Step 5: Check if table exists and get basic info
-- ============================================================================
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_subscriptions';
