-- ============================================================================
-- Fix user_id Column for PostgREST Compatibility
-- Date: December 3, 2025
-- Purpose: Remove any GENERATED/DEFAULT on user_id that PostgREST can't handle
--          This should fix the "column user_id does not exist" error
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Remove DEFAULT if it exists
-- ============================================================================
DO $$
BEGIN
  -- Check if column has a default
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'user_id'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.user_subscriptions 
    ALTER COLUMN user_id DROP DEFAULT;
    
    RAISE NOTICE '✅ Removed DEFAULT from user_id column';
  ELSE
    RAISE NOTICE 'ℹ️ user_id column has no DEFAULT';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Remove GENERATED if it exists
-- ============================================================================
DO $$
BEGIN
  -- Check if column is GENERATED
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    WHERE a.attrelid = 'public.user_subscriptions'::regclass
      AND a.attname = 'user_id'
      AND a.attgenerated IN ('s', 'v')  -- 's' = STORED, 'v' = VIRTUAL
      AND NOT a.attisdropped
  ) THEN
    -- Cannot directly drop GENERATED, need to recreate column
    RAISE EXCEPTION 'user_id is a GENERATED column. This requires column recreation. Please check the diagnostic script first.';
  ELSE
    RAISE NOTICE 'ℹ️ user_id column is not GENERATED';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Ensure column is NOT NULL (already done, but verify)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    -- Check for NULL values first
    IF EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id IS NULL) THEN
      RAISE EXCEPTION 'Cannot set NOT NULL: Found rows with NULL user_id. Fix these first.';
    END IF;
    
    ALTER TABLE public.user_subscriptions 
    ALTER COLUMN user_id SET NOT NULL;
    
    RAISE NOTICE '✅ Set user_id to NOT NULL';
  ELSE
    RAISE NOTICE 'ℹ️ user_id is already NOT NULL';
  END IF;
END $$;

-- ============================================================================
-- Step 4: Force PostgREST schema reload
-- ============================================================================
NOTIFY pgrst, 'reload schema';

RAISE NOTICE '✅ Notified PostgREST to reload schema';

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  has_default BOOLEAN;
  is_generated BOOLEAN;
  is_nullable TEXT;
BEGIN
  SELECT 
    (column_default IS NOT NULL),
    (is_generated = 'ALWAYS' OR is_generated = 'STORED'),
    is_nullable
  INTO has_default, is_generated, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_subscriptions'
    AND column_name = 'user_id';
  
  IF NOT has_default AND NOT is_generated AND is_nullable = 'NO' THEN
    RAISE NOTICE '✅ Success: user_id is ready for PostgREST (no DEFAULT, not GENERATED, NOT NULL)';
  ELSE
    RAISE WARNING '⚠️ Issue: has_default = %, is_generated = %, is_nullable = %', has_default, is_generated, is_nullable;
  END IF;
END $$;
