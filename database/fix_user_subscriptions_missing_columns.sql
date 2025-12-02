-- ============================================================================
-- Fix Missing Columns in user_subscriptions Table
-- Date: December 2, 2025
-- Purpose: Add missing columns that are required by upgrade-pro endpoint
-- Status: Ready for Production
--
-- IMPORTANT: 
-- 1. Run this in Supabase SQL Editor
-- 2. This script is idempotent (safe to run multiple times)
-- 3. Run this BEFORE running remove_enterprise_tier_migration.sql if needed
-- ============================================================================

BEGIN;

-- ============================================================================
-- Add Missing Columns to user_subscriptions
-- ============================================================================

-- Add subscription_ends_at if it doesn't exist
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Add money_back_guarantee_end_date if it doesn't exist
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS money_back_guarantee_end_date TIMESTAMPTZ;

-- Add other required columns if they don't exist
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS money_back_guarantee_eligible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS refund_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN user_subscriptions.subscription_ends_at IS 'Date when subscription ends (same as renewal date for active subscriptions)';
COMMENT ON COLUMN user_subscriptions.money_back_guarantee_end_date IS 'End date of 7-day money-back guarantee period';

-- Create indexes for new fields (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer 
  ON user_subscriptions(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription 
  ON user_subscriptions(stripe_subscription_id) 
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_start_date 
  ON user_subscriptions(subscription_start_date) 
  WHERE subscription_start_date IS NOT NULL;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  column_count INTEGER;
BEGIN
  -- Check if all required columns exist
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'user_subscriptions'
    AND column_name IN (
      'subscription_ends_at',
      'money_back_guarantee_end_date',
      'stripe_customer_id',
      'stripe_subscription_id',
      'subscription_start_date',
      'subscription_renewal_date',
      'money_back_guarantee_eligible',
      'refund_count'
    );
  
  IF column_count = 8 THEN
    RAISE NOTICE '✅ All required columns exist in user_subscriptions';
  ELSE
    RAISE WARNING '⚠️ Only % of 8 required columns found. Please check the table structure.', column_count;
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
