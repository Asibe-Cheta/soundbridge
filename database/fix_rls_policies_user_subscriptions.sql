-- ============================================================================
-- Fix RLS Policies on user_subscriptions Table
-- Date: December 2, 2025
-- Purpose: Fix RLS policies that are blocking INSERT/UPDATE operations
-- Based on: Claude's diagnosis - RLS policies likely missing WITH CHECK clauses
-- Status: Ready for Production
--
-- IMPORTANT: 
-- 1. Run this in Supabase SQL Editor
-- 2. This script is idempotent (safe to run multiple times)
-- 3. This fixes the "column user_id does not exist" error during INSERT/UPDATE
-- ============================================================================

BEGIN;

SET search_path = public, pg_catalog;

-- ============================================================================
-- Step 1: Ensure RLS is enabled
-- ============================================================================
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 2: Drop all existing policies (to start fresh)
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_subscriptions';
  END LOOP;
END $$;

-- ============================================================================
-- Step 3: Create proper RLS policies with WITH CHECK clauses
-- ============================================================================

-- Policy for SELECT: Users can view their own subscription
CREATE POLICY "Users can SELECT own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for INSERT: Users can insert their own subscription
-- CRITICAL: WITH CHECK clause validates user_id during INSERT
CREATE POLICY "Users can INSERT own subscription"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can update their own subscription
-- CRITICAL: Both USING and WITH CHECK are needed
CREATE POLICY "Users can UPDATE own subscription"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own subscription (optional)
CREATE POLICY "Users can DELETE own subscription"
ON public.user_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- Step 4: Grant necessary table permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO anon;

-- ============================================================================
-- Step 5: Verification
-- ============================================================================
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  insert_policy_exists BOOLEAN;
  update_policy_exists BOOLEAN;
  select_policy_exists BOOLEAN;
BEGIN
  -- Check if RLS is enabled
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = 'user_subscriptions';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_subscriptions';
  
  -- Check for specific policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND cmd = 'INSERT'
  ) INTO insert_policy_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND cmd = 'UPDATE'
  ) INTO update_policy_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND cmd = 'SELECT'
  ) INTO select_policy_exists;
  
  IF rls_enabled AND policy_count >= 3 AND insert_policy_exists AND update_policy_exists AND select_policy_exists THEN
    RAISE NOTICE '✅ RLS policies configured correctly';
    RAISE NOTICE '   - RLS enabled: %', rls_enabled;
    RAISE NOTICE '   - Total policies: %', policy_count;
    RAISE NOTICE '   - INSERT policy: %', insert_policy_exists;
    RAISE NOTICE '   - UPDATE policy: %', update_policy_exists;
    RAISE NOTICE '   - SELECT policy: %', select_policy_exists;
  ELSE
    RAISE WARNING '⚠️ RLS policy configuration incomplete:';
    RAISE WARNING '   - RLS enabled: %', rls_enabled;
    RAISE WARNING '   - Total policies: %', policy_count;
    RAISE WARNING '   - INSERT policy: %', insert_policy_exists;
    RAISE WARNING '   - UPDATE policy: %', update_policy_exists;
    RAISE WARNING '   - SELECT policy: %', select_policy_exists;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query (run separately if needed)
-- ============================================================================
-- SELECT 
--   policyname,
--   cmd AS command,
--   permissive,
--   roles,
--   qual AS using_clause,
--   with_check AS with_check_clause
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'user_subscriptions'
-- ORDER BY cmd;
