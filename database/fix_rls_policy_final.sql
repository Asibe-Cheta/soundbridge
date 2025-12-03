-- ============================================================================
-- Fix RLS Policies: Use ID Subquery Instead of Direct user_id Reference
-- Date: December 3, 2025
-- Purpose: Fix RLS policies to avoid PostgREST UPDATE validation issues
--          Root Cause: PostgREST validates RLS policy column references BEFORE
--          executing UPDATE, and fails on user_id during validation phase
--          Solution: Use subquery with id instead of direct user_id reference
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Drop ALL existing policies (comprehensive cleanup)
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all existing policies on user_subscriptions
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_subscriptions';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- Step 2: Ensure RLS is enabled
-- ============================================================================
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 3: Create new policies that use ID subquery for UPDATE/DELETE
-- ============================================================================

-- SELECT policy: Can use user_id directly (SELECT works fine)
CREATE POLICY "Enable SELECT for users on own subscription"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT policy: Can use user_id in WITH CHECK (INSERT works fine)
CREATE POLICY "Enable INSERT for users on own subscription"
ON public.user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE policy: Use ID subquery to avoid PostgREST validation issue
-- CRITICAL: This avoids PostgREST trying to validate user_id during UPDATE
CREATE POLICY "Enable UPDATE for users on own subscription"
ON public.user_subscriptions FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT id FROM public.user_subscriptions 
    WHERE user_id = auth.uid()
  )
);

-- DELETE policy: Use ID subquery (same approach)
CREATE POLICY "Enable DELETE for users on own subscription"
ON public.user_subscriptions FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT id FROM public.user_subscriptions 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- Step 4: Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO anon;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Check RLS is enabled
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_subscriptions';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_subscriptions';
  
  IF rls_enabled AND policy_count >= 4 THEN
    RAISE NOTICE '✅ Success: RLS enabled with % policies', policy_count;
  ELSE
    RAISE WARNING '⚠️ Issue: RLS enabled = %, policy count = %', rls_enabled, policy_count;
  END IF;
END $$;
