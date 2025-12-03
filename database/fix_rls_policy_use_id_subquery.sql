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
-- Step 1: Drop existing problematic policy
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can SELECT own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can INSERT own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can UPDATE own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can DELETE own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;

-- ============================================================================
-- Step 2: Ensure RLS is enabled
-- ============================================================================
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 3: Create new policies that use ID subquery for UPDATE/DELETE
-- ============================================================================

-- SELECT policy: Can use user_id directly (SELECT works fine)
CREATE POLICY "Users can select subscriptions"
ON user_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT policy: Can use user_id in WITH CHECK (INSERT works fine)
CREATE POLICY "Users can insert subscriptions"
ON user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE policy: Use ID subquery to avoid PostgREST validation issue
-- CRITICAL: This avoids PostgREST trying to validate user_id during UPDATE
CREATE POLICY "Users can update own subscriptions"
ON user_subscriptions FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT id FROM user_subscriptions 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT id FROM user_subscriptions 
    WHERE user_id = auth.uid()
  )
);

-- DELETE policy: Use ID subquery (same approach)
CREATE POLICY "Users can delete own subscriptions"
ON user_subscriptions FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT id FROM user_subscriptions 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- Step 4: Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_subscriptions TO anon;

-- ============================================================================
-- Step 5: Verification
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

COMMIT;

-- ============================================================================
-- Summary
-- ============================================================================
-- This fix addresses the root cause:
-- - PostgREST validates RLS policy column references BEFORE executing UPDATE
-- - Direct reference to user_id in UPDATE USING clause causes validation failure
-- - Using subquery with id avoids PostgREST validation issue
-- - SELECT and INSERT can still use user_id directly (they work fine)
