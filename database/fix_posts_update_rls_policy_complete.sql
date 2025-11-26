-- Fix RLS Policy for posts UPDATE operations (Complete Fix)
-- This ensures soft deletes (updating deleted_at) work correctly
-- Date: November 26, 2025
--
-- Issue: The UPDATE policy only had USING clause, but PostgreSQL requires
-- both USING (to check existing row) and WITH CHECK (to validate updated row)
-- for UPDATE operations, especially when doing soft deletes.
--
-- The error "new row violates row-level security policy" occurs because
-- PostgreSQL checks the WITH CHECK clause when performing UPDATE operations,
-- and if it's missing, the update fails.

-- ============================================================================
-- STEP 1: Drop existing UPDATE policy (if exists)
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own posts" ON posts;

-- ============================================================================
-- STEP 2: Recreate UPDATE policy with both USING and WITH CHECK clauses
-- ============================================================================

-- USING: checks if user can select the existing row (before update)
-- WITH CHECK: checks if the updated row is valid (after update)
-- Both check that the user_id matches auth.uid() to ensure users can only
-- update their own posts, including setting deleted_at for soft deletes
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STEP 3: Verify the policy was created correctly
-- ============================================================================

DO $$
DECLARE
  policy_exists boolean;
  has_using boolean;
  has_with_check boolean;
BEGIN
  -- Check if policy exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND policyname = 'Users can update own posts'
    AND cmd = 'UPDATE'
  ) INTO policy_exists;
  
  -- Check if policy has USING clause
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND policyname = 'Users can update own posts'
    AND cmd = 'UPDATE'
    AND qual IS NOT NULL
  ) INTO has_using;
  
  -- Check if policy has WITH CHECK clause
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND policyname = 'Users can update own posts'
    AND cmd = 'UPDATE'
    AND with_check IS NOT NULL
  ) INTO has_with_check;
  
  IF policy_exists AND has_using AND has_with_check THEN
    RAISE NOTICE '✅ SUCCESS: Posts UPDATE RLS policy fixed with both USING and WITH CHECK clauses';
  ELSIF policy_exists THEN
    RAISE WARNING '⚠️ WARNING: Policy exists but may not have both clauses';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Failed to create UPDATE policy';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Test the policy (informational only - won't execute)
-- ============================================================================

-- To test manually:
-- 1. Create a test post as a user
-- 2. Try to soft delete it: UPDATE posts SET deleted_at = NOW() WHERE id = '...';
-- 3. Should succeed if user_id matches auth.uid()

COMMENT ON POLICY "Users can update own posts" ON posts IS 
'Allows users to update (including soft delete) their own posts. Requires both USING and WITH CHECK clauses for UPDATE operations.';

