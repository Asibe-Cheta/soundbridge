-- ============================================================================
-- Final Diagnosis and Potential Fix for user_subscriptions
-- Date: December 2, 2025
-- Purpose: Comprehensive check and potential fix for INSERT/UPDATE issues
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Verify table structure one more time
-- ============================================================================
SELECT 
  'Table exists: ' || EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
  )::text AS check_1;

SELECT 
  'user_id column exists: ' || EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_subscriptions' 
      AND column_name = 'user_id'
  )::text AS check_2;

-- ============================================================================
-- Step 2: Check if there's a default value issue
-- ============================================================================
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
  AND column_name = 'user_id';

-- ============================================================================
-- Step 3: Verify unique constraint/index exists
-- ============================================================================
SELECT 
  'Unique constraint exists: ' || EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND contype = 'u'
      AND conname LIKE '%user_id%'
  )::text AS check_3;

-- ============================================================================
-- Step 4: Check RLS policies one more time
-- ============================================================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' AND with_check IS NOT NULL THEN '✅ Has WITH CHECK'
    WHEN cmd = 'INSERT' AND with_check IS NULL THEN '❌ Missing WITH CHECK'
    WHEN cmd = 'UPDATE' AND with_check IS NOT NULL AND qual IS NOT NULL THEN '✅ Has both USING and WITH CHECK'
    ELSE '⚠️ Check needed'
  END AS policy_status
FROM pg_policies
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public'
ORDER BY cmd;

-- ============================================================================
-- Step 5: Try to identify if there's a schema resolution issue
-- ============================================================================
-- Check current search_path
SHOW search_path;

-- Check if table is accessible
SELECT 
  'Table accessible: ' || (
    SELECT COUNT(*) > 0 
    FROM public.user_subscriptions 
    LIMIT 1
  )::text AS check_4;

-- ============================================================================
-- Step 6: Check for any column-level permissions
-- ============================================================================
SELECT 
  grantee,
  privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
  AND column_name = 'user_id'
ORDER BY grantee, privilege_type;

COMMIT;

-- ============================================================================
-- POTENTIAL FIX: If the issue persists, try this
-- ============================================================================
-- If all checks pass but INSERT still fails, the issue might be:
-- 1. PostgREST/Supabase API layer issue
-- 2. Column-level permissions
-- 3. A bug in Supabase client's upsert method
--
-- Try explicitly granting column-level permissions:
-- GRANT INSERT (user_id, tier, status, ...) ON public.user_subscriptions TO authenticated;
-- GRANT UPDATE (user_id, tier, status, ...) ON public.user_subscriptions TO authenticated;
