-- ============================================================================
-- Verify and Fix user_subscriptions Table (Simplified)
-- Date: December 2, 2025
-- Purpose: Verify table structure and fix any issues
-- Status: Ready for Production
--
-- IMPORTANT: 
-- 1. Run this AFTER running diagnose_user_subscriptions_table.sql
-- 2. This script is idempotent (safe to run multiple times)
-- 3. This fixes permissions and ensures RLS is correct
-- ============================================================================

BEGIN;

SET search_path = public, pg_catalog;

-- ============================================================================
-- Step 1: Verify table exists and has user_id column
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  user_id_exists BOOLEAN;
  schema_name TEXT;
BEGIN
  -- Check if table exists in public schema
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'Table user_subscriptions does not exist in public schema. Please run fix_user_subscriptions_complete.sql first.';
  END IF;
  
  -- Check if user_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions' 
      AND column_name = 'user_id'
  ) INTO user_id_exists;
  
  IF NOT user_id_exists THEN
    RAISE EXCEPTION 'Column user_id does not exist in user_subscriptions table. Please run fix_user_subscriptions_complete.sql first.';
  END IF;
  
  RAISE NOTICE '✅ Table and user_id column verified';
END $$;

-- ============================================================================
-- Step 2: Ensure unique constraint exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND contype = 'u'
      AND conname = 'user_subscriptions_user_id_unique'
  ) THEN
    -- Try to add unique constraint
    BEGIN
      ALTER TABLE public.user_subscriptions
      ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);
      RAISE NOTICE '✅ Added unique constraint on user_id';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️ Unique constraint already exists';
      WHEN OTHERS THEN
        -- If constraint can't be added (maybe duplicate data), create unique index instead
        RAISE NOTICE '⚠️ Could not add unique constraint, creating unique index instead';
        CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_unique_idx 
          ON public.user_subscriptions(user_id);
    END;
  ELSE
    RAISE NOTICE 'ℹ️ Unique constraint already exists';
  END IF;
END $$;

-- Create unique index as backup
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_unique_idx 
  ON public.user_subscriptions(user_id);

-- ============================================================================
-- Step 3: Ensure RLS is enabled and policies are correct
-- ============================================================================

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- Create RLS policies
CREATE POLICY "Users can view their own subscription" 
  ON public.user_subscriptions
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
  ON public.user_subscriptions
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
  ON public.user_subscriptions
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Step 4: Grant Permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO anon; -- Sometimes needed for initial setup

-- ============================================================================
-- Step 5: Final Verification
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  user_id_exists BOOLEAN;
  unique_constraint_exists BOOLEAN;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
  ) INTO table_exists;
  
  -- Check user_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions' 
      AND column_name = 'user_id'
  ) INTO user_id_exists;
  
  -- Check unique constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND contype = 'u'
      AND (conname = 'user_subscriptions_user_id_unique' OR conname LIKE '%user_id%')
  ) INTO unique_constraint_exists;
  
  -- Check RLS
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'user_subscriptions'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_subscriptions'
    AND schemaname = 'public';
  
  IF table_exists AND user_id_exists AND unique_constraint_exists AND rls_enabled AND policy_count >= 3 THEN
    RAISE NOTICE '✅ All checks passed!';
    RAISE NOTICE '   - Table exists: %', table_exists;
    RAISE NOTICE '   - user_id column exists: %', user_id_exists;
    RAISE NOTICE '   - Unique constraint exists: %', unique_constraint_exists;
    RAISE NOTICE '   - RLS enabled: %', rls_enabled;
    RAISE NOTICE '   - Policies count: %', policy_count;
  ELSE
    RAISE WARNING '⚠️ Some checks failed:';
    RAISE WARNING '   - Table exists: %', table_exists;
    RAISE WARNING '   - user_id column exists: %', user_id_exists;
    RAISE WARNING '   - Unique constraint exists: %', unique_constraint_exists;
    RAISE WARNING '   - RLS enabled: %', rls_enabled;
    RAISE WARNING '   - Policies count: %', policy_count;
  END IF;
END $$;

COMMIT;
