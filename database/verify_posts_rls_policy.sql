-- Verify Posts UPDATE RLS Policy
-- Run this to check if the policy is correctly configured
-- Date: November 26, 2025

-- ============================================================================
-- Check if the UPDATE policy exists and has both clauses
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual AS using_clause,
  with_check AS with_check_clause,
  CASE 
    WHEN qual IS NOT NULL AND with_check IS NOT NULL THEN '✅ Has both clauses'
    WHEN qual IS NOT NULL AND with_check IS NULL THEN '⚠️ Missing WITH CHECK clause'
    WHEN qual IS NULL AND with_check IS NOT NULL THEN '⚠️ Missing USING clause'
    ELSE '❌ Missing both clauses'
  END AS status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'posts' 
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================================================
-- Check all policies on posts table
-- ============================================================================

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Update'
    WHEN cmd = 'DELETE' THEN 'Delete'
    ELSE cmd
  END AS operation,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'posts'
ORDER BY cmd, policyname;

-- ============================================================================
-- Detailed policy information for UPDATE
-- ============================================================================

SELECT 
  policyname,
  cmd,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'posts' 
  AND cmd = 'UPDATE';

-- ============================================================================
-- Verify the exact policy definition
-- ============================================================================

SELECT 
  pg_get_policydef(oid) AS policy_definition
FROM pg_policies p
JOIN pg_policy pol ON pol.polname = p.policyname
WHERE schemaname = 'public' 
  AND tablename = 'posts' 
  AND cmd = 'UPDATE';

