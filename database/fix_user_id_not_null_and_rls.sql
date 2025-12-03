-- ============================================================================
-- Fix user_id Column and RLS Policies (Based on Claude's Analysis)
-- Date: December 3, 2025
-- Purpose: Make user_id NOT NULL and fix RLS policies
--          This addresses the root cause: nullable user_id causing RLS issues
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Check for NULL user_id values
-- ============================================================================
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.user_subscriptions
  WHERE user_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE '⚠️ Found % rows with NULL user_id. These need to be fixed first.', null_count;
    RAISE EXCEPTION 'Cannot proceed: % rows have NULL user_id. Please fix these first.', null_count;
  ELSE
    RAISE NOTICE '✅ No NULL user_id values found. Safe to proceed.';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Make user_id NOT NULL
-- ============================================================================
ALTER TABLE public.user_subscriptions 
ALTER COLUMN user_id SET NOT NULL;

RAISE NOTICE '✅ user_id column is now NOT NULL';

-- ============================================================================
-- Step 3: Drop existing RLS policies
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
-- Step 4: Create simplified RLS policy (single policy for all operations)
-- ============================================================================
CREATE POLICY "Users can manage subscriptions"
ON public.user_subscriptions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Step 5: Grant table permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO anon;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  is_not_null BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if user_id is NOT NULL
  SELECT NOT is_nullable INTO is_not_null
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_subscriptions'
    AND column_name = 'user_id';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_subscriptions';
  
  IF is_not_null AND policy_count >= 1 THEN
    RAISE NOTICE '✅ Success: user_id is NOT NULL and RLS policies are configured';
  ELSE
    RAISE WARNING '⚠️ Issue: user_id NOT NULL = %, policy count = %', is_not_null, policy_count;
  END IF;
END $$;
