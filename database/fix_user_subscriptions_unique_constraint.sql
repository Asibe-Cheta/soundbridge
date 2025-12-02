-- ============================================================================
-- Fix Missing Unique Constraint on user_subscriptions.user_id
-- Date: December 2, 2025
-- Purpose: Add unique constraint required for ON CONFLICT upsert operations
-- Status: Ready for Production
--
-- ERROR FIXED: 
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- PostgreSQL Error Code: 42P10
--
-- IMPORTANT: 
-- 1. Run this in Supabase SQL Editor
-- 2. This script is idempotent (safe to run multiple times)
-- 3. This fixes the "Failed to create subscription" error
-- ============================================================================

BEGIN;

-- ============================================================================
-- Add Unique Constraint on user_id
-- ============================================================================

-- Check if unique constraint already exists
DO $$
BEGIN
  -- Check if a unique constraint on user_id already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_subscriptions'::regclass
      AND contype = 'u'
      AND (
        -- Check if constraint is on user_id column
        (conkey::int[] = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'user_subscriptions'::regclass AND attname = 'user_id')])
        OR
        -- Check by constraint name pattern
        conname LIKE '%user_id%' OR conname LIKE '%user_subscriptions_user_id%'
      )
  ) THEN
    -- Add unique constraint on user_id
    -- This allows only one active subscription per user
    ALTER TABLE user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);
    
    RAISE NOTICE '✅ Added unique constraint on user_subscriptions.user_id';
  ELSE
    RAISE NOTICE 'ℹ️ Unique constraint on user_subscriptions.user_id already exists';
  END IF;
END $$;

-- ============================================================================
-- Alternative: If the above doesn't work, try creating a unique index
-- ============================================================================

-- Create unique index if constraint doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_unique_idx 
  ON user_subscriptions(user_id);

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
  index_exists BOOLEAN;
BEGIN
  -- Check for unique constraint
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_subscriptions'::regclass
      AND contype = 'u'
      AND conkey::int[] = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'user_subscriptions'::regclass AND attname = 'user_id')]
  ) INTO constraint_exists;
  
  -- Check for unique index
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'user_subscriptions'
      AND indexname = 'user_subscriptions_user_id_unique_idx'
  ) INTO index_exists;
  
  IF constraint_exists OR index_exists THEN
    RAISE NOTICE '✅ Unique constraint/index on user_id verified';
  ELSE
    RAISE WARNING '⚠️ Unique constraint/index on user_id not found. Please check manually.';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query (run separately if needed)
-- ============================================================================
-- Check for unique constraints on user_id:
-- SELECT 
--   conname AS constraint_name,
--   contype AS constraint_type,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'user_subscriptions'::regclass
--   AND contype = 'u';
--
-- Check for unique indexes on user_id:
-- SELECT 
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'user_subscriptions'
--   AND indexdef LIKE '%UNIQUE%'
--   AND indexdef LIKE '%user_id%';
