-- ============================================================================
-- Ensure user_subscriptions Table Exists with Correct Structure
-- Date: December 2, 2025
-- Purpose: Create table if missing, add missing columns, fix structure
-- Status: Ready for Production
--
-- ERROR FIXED: 
-- "column \"user_id\" does not exist" (PostgreSQL Error Code: 42703)
--
-- IMPORTANT: 
-- 1. Run this in Supabase SQL Editor
-- 2. This script is idempotent (safe to run multiple times)
-- 3. This ensures the table exists with all required columns
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create Table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Add Missing Columns (if table already existed)
-- ============================================================================

-- Add user_id if it doesn't exist (shouldn't happen, but safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_subscriptions
    ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added user_id column';
  END IF;
END $$;

-- Add other required columns
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS money_back_guarantee_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS money_back_guarantee_eligible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS refund_count INTEGER DEFAULT 0;

-- ============================================================================
-- Update Constraints (remove enterprise, ensure correct values)
-- ============================================================================

-- Update tier constraint to only allow 'free' and 'pro'
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_tier_check;

ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_tier_check 
CHECK (tier IN ('free', 'pro'));

-- Update status constraint
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_status_check 
CHECK (status IN ('active', 'cancelled', 'expired', 'past_due'));

-- ============================================================================
-- Add Unique Constraint on user_id (required for ON CONFLICT)
-- ============================================================================

-- Drop existing unique constraint/index if it exists with different name
DO $$
BEGIN
  -- Drop constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'user_subscriptions'::regclass 
      AND contype = 'u'
      AND conname LIKE '%user_id%'
  ) THEN
    ALTER TABLE user_subscriptions
    DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_unique;
  END IF;
END $$;

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_subscriptions'::regclass
      AND contype = 'u'
      AND conname = 'user_subscriptions_user_id_unique'
  ) THEN
    ALTER TABLE user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);
    
    RAISE NOTICE '✅ Added unique constraint on user_id';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️ Unique constraint already exists';
END $$;

-- Create unique index as fallback
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_unique_idx 
  ON user_subscriptions(user_id);

-- ============================================================================
-- Create Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id 
  ON user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier 
  ON user_subscriptions(tier);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status 
  ON user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer 
  ON user_subscriptions(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription 
  ON user_subscriptions(stripe_subscription_id) 
  WHERE stripe_subscription_id IS NOT NULL;

-- ============================================================================
-- Enable RLS (Row Level Security)
-- ============================================================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;

-- Create RLS policies
CREATE POLICY "Users can view their own subscription" 
  ON user_subscriptions
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
  ON user_subscriptions
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
  ON user_subscriptions
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  user_id_exists BOOLEAN;
  unique_constraint_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_subscriptions'
  ) INTO table_exists;
  
  -- Check if user_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' 
      AND column_name = 'user_id'
  ) INTO user_id_exists;
  
  -- Check if unique constraint exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_subscriptions'::regclass
      AND contype = 'u'
      AND conname = 'user_subscriptions_user_id_unique'
  ) INTO unique_constraint_exists;
  
  IF table_exists AND user_id_exists AND unique_constraint_exists THEN
    RAISE NOTICE '✅ user_subscriptions table is properly configured';
  ELSE
    RAISE WARNING '⚠️ Configuration issues detected: table=%, user_id=%, constraint=%', 
      table_exists, user_id_exists, unique_constraint_exists;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query (run separately if needed)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'user_subscriptions'
-- ORDER BY ordinal_position;
