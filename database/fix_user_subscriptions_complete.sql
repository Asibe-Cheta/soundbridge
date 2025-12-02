-- ============================================================================
-- Complete Fix for user_subscriptions Table
-- Date: December 2, 2025
-- Purpose: Comprehensive fix for all user_subscriptions issues
-- Status: Ready for Production
--
-- ERRORS FIXED: 
-- - "column \"user_id\" does not exist" (PostgreSQL Error Code: 42703)
-- - "there is no unique or exclusion constraint matching the ON CONFLICT specification" (PostgreSQL Error Code: 42P10)
--
-- IMPORTANT: 
-- 1. Run this in Supabase SQL Editor
-- 2. This script is idempotent (safe to run multiple times)
-- 3. This ensures the table exists in the public schema with all required columns
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Ensure we're working in the public schema
-- ============================================================================

SET search_path = public, pg_catalog;

-- ============================================================================
-- Step 2: Drop and recreate table to ensure clean state
-- ============================================================================

-- First, check if table exists and what columns it has
DO $$
DECLARE
  table_exists BOOLEAN;
  user_id_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Check if user_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'user_subscriptions' 
        AND column_name = 'user_id'
    ) INTO user_id_exists;
    
    IF NOT user_id_exists THEN
      RAISE NOTICE '⚠️ Table exists but user_id column is missing - will add it';
    ELSE
      RAISE NOTICE '✅ Table and user_id column exist';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Table does not exist - will create it';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Create table if it doesn't exist (with all columns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_renewal_date TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  money_back_guarantee_end_date TIMESTAMPTZ,
  money_back_guarantee_eligible BOOLEAN DEFAULT true,
  refund_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique constraint on user_id
  CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id)
);

-- ============================================================================
-- Step 4: Add missing columns (if table already existed)
-- ============================================================================

-- Add user_id if it doesn't exist (shouldn't happen, but safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_subscriptions
    ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added user_id column';
  END IF;
END $$;

-- Add other required columns
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS money_back_guarantee_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS money_back_guarantee_eligible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS refund_count INTEGER DEFAULT 0;

-- ============================================================================
-- Step 5: Update Constraints
-- ============================================================================

-- Update tier constraint to only allow 'free' and 'pro'
ALTER TABLE public.user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_tier_check;

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_tier_check 
CHECK (tier IN ('free', 'pro'));

-- Update status constraint
ALTER TABLE public.user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_status_check 
CHECK (status IN ('active', 'cancelled', 'expired', 'past_due'));

-- ============================================================================
-- Step 6: Ensure Unique Constraint on user_id
-- ============================================================================

-- Drop existing unique constraint/index if it exists with different name
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop any existing unique constraints on user_id
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND contype = 'u'
      AND conname LIKE '%user_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Add unique constraint (will fail if already exists, but that's okay)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND contype = 'u'
      AND conname = 'user_subscriptions_user_id_unique'
  ) THEN
    ALTER TABLE public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);
    
    RAISE NOTICE '✅ Added unique constraint on user_id';
  ELSE
    RAISE NOTICE 'ℹ️ Unique constraint already exists';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️ Unique constraint already exists (caught exception)';
END $$;

-- Create unique index as fallback
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_unique_idx 
  ON public.user_subscriptions(user_id);

-- ============================================================================
-- Step 7: Create Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id 
  ON public.user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier 
  ON public.user_subscriptions(tier);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status 
  ON public.user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer 
  ON public.user_subscriptions(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription 
  ON public.user_subscriptions(stripe_subscription_id) 
  WHERE stripe_subscription_id IS NOT NULL;

-- ============================================================================
-- Step 8: Enable RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
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
-- Step 9: Grant Permissions
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;

-- Grant sequence usage if sequence exists (UUID uses gen_random_uuid, so sequence might not exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'user_subscriptions_id_seq'
  ) THEN
    EXECUTE 'GRANT USAGE ON SEQUENCE user_subscriptions_id_seq TO authenticated';
  END IF;
END $$;

-- ============================================================================
-- Step 10: Verification
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  user_id_exists BOOLEAN;
  unique_constraint_exists BOOLEAN;
  column_count INTEGER;
BEGIN
  -- Check if table exists in public schema
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
  ) INTO table_exists;
  
  -- Check if user_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions' 
      AND column_name = 'user_id'
  ) INTO user_id_exists;
  
  -- Check if unique constraint exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND contype = 'u'
      AND conname = 'user_subscriptions_user_id_unique'
  ) INTO unique_constraint_exists;
  
  -- Count total columns
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_subscriptions';
  
  IF table_exists AND user_id_exists AND unique_constraint_exists THEN
    RAISE NOTICE '✅ user_subscriptions table is properly configured';
    RAISE NOTICE '   - Table exists: %', table_exists;
    RAISE NOTICE '   - user_id column exists: %', user_id_exists;
    RAISE NOTICE '   - Unique constraint exists: %', unique_constraint_exists;
    RAISE NOTICE '   - Total columns: %', column_count;
  ELSE
    RAISE WARNING '⚠️ Configuration issues detected:';
    RAISE WARNING '   - Table exists: %', table_exists;
    RAISE WARNING '   - user_id column exists: %', user_id_exists;
    RAISE WARNING '   - Unique constraint exists: %', unique_constraint_exists;
    RAISE WARNING '   - Total columns: %', column_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query (run separately if needed)
-- ============================================================================
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'user_subscriptions'
-- ORDER BY ordinal_position;
--
-- SELECT 
--   conname AS constraint_name,
--   contype AS constraint_type,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.user_subscriptions'::regclass
-- ORDER BY contype, conname;
