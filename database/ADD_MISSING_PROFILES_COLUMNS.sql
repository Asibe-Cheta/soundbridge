-- =====================================================
-- Add Missing Subscription Columns to Profiles Table
-- =====================================================
-- Purpose: Add columns required for mobile app to display subscription info
-- Date: December 30, 2025
-- Status: Ready for Production
-- =====================================================

-- Add missing subscription columns to profiles table
-- These columns are required for the mobile app to display subscription information

-- Subscription amount (price)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC(10, 2) DEFAULT NULL;

-- Subscription currency
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_currency VARCHAR(3) DEFAULT 'GBP';

-- Subscription period (monthly/yearly) - Note: subscription_period may already exist
-- Check if it exists first, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_period'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_period VARCHAR(20) 
      CHECK (subscription_period IN ('monthly', 'yearly', 'annual') OR subscription_period IS NULL);
  END IF;
END $$;

-- Subscription period start date - Note: subscription_start_date may already exist
-- Use subscription_period_start as alias if subscription_start_date exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_period_start'
  ) THEN
    -- Check if subscription_start_date exists, if so we can use that
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'subscription_start_date'
    ) THEN
      -- subscription_start_date exists, we'll map it in the trigger
      -- Just add subscription_period_start as an alias column
      ALTER TABLE profiles ADD COLUMN subscription_period_start TIMESTAMPTZ;
    ELSE
      -- Neither exists, add subscription_period_start
      ALTER TABLE profiles ADD COLUMN subscription_period_start TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- Subscription period end date - Note: subscription_renewal_date may already exist
-- Use subscription_period_end as alias if subscription_renewal_date exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_period_end'
  ) THEN
    -- Check if subscription_renewal_date exists, if so we can use that
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'subscription_renewal_date'
    ) THEN
      -- subscription_renewal_date exists, we'll map it in the trigger
      -- Just add subscription_period_end as an alias column
      ALTER TABLE profiles ADD COLUMN subscription_period_end TIMESTAMPTZ;
    ELSE
      -- Neither exists, add subscription_period_end
      ALTER TABLE profiles ADD COLUMN subscription_period_end TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- Stripe subscription ID
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) DEFAULT NULL;

-- Stripe customer ID - Note: stripe_customer_id may already exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) DEFAULT NULL;

-- Create performance indexes on subscription fields
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id) 
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

-- =====================================================
-- Verification: Check that all columns were added
-- =====================================================

SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
  AND column_name IN (
    'subscription_tier',
    'subscription_status',
    'subscription_amount',
    'subscription_currency',
    'subscription_period',
    'subscription_period_start',
    'subscription_period_end',
    'subscription_start_date',
    'subscription_renewal_date',
    'stripe_subscription_id',
    'stripe_customer_id'
  )
ORDER BY column_name;

-- =====================================================
-- Check current subscription data (for reference)
-- =====================================================

SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE subscription_tier IS NOT NULL AND subscription_tier != 'free') as subscribed_profiles,
  COUNT(*) FILTER (WHERE subscription_tier = 'premium') as premium_count,
  COUNT(*) FILTER (WHERE subscription_tier = 'unlimited') as unlimited_count,
  COUNT(*) FILTER (WHERE subscription_amount IS NOT NULL) as profiles_with_amount
FROM profiles;

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Successfully added subscription columns to profiles table';
  RAISE NOTICE '📋 Next step: Run CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql to create the sync trigger';
END $$;

