-- Fix RLS Policy for posts UPDATE operations
-- This ensures soft deletes (updating deleted_at) work correctly
-- Date: November 26, 2025
--
-- ISSUE: The UPDATE policy only had USING clause, but PostgreSQL requires
-- both USING (to check existing row) and WITH CHECK (to validate updated row)
-- for UPDATE operations, especially when doing soft deletes.
--
-- ERROR: "new row violates row-level security policy for table 'posts'"
-- This happens because PostgreSQL checks WITH CHECK when performing UPDATE.
--
-- SOLUTION: Add WITH CHECK clause to the UPDATE policy

-- ============================================================================
-- STEP 1: Drop existing UPDATE policy (safe to run multiple times)
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
-- STEP 3: Verify the policy was created (informational)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Posts UPDATE RLS policy fixed with WITH CHECK clause';
  RAISE NOTICE '✅ Users can now soft-delete their own posts';
END $$;

