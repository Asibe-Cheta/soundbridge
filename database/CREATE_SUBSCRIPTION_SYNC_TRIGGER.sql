-- =====================================================
-- Create Subscription Sync Trigger
-- =====================================================
-- Purpose: Automatically sync subscription data from user_subscriptions to profiles
-- Date: December 30, 2025
-- Status: Ready for Production
-- =====================================================

-- Drop existing trigger and function if they exist (for idempotency)
DROP TRIGGER IF EXISTS sync_subscription_to_profiles_trigger ON user_subscriptions;
DROP FUNCTION IF EXISTS sync_subscription_to_profiles();

-- =====================================================
-- Create Trigger Function
-- =====================================================
-- This function syncs data from user_subscriptions to profiles table
-- Handles tier name mapping: 'pro' -> 'premium'
-- Calculates subscription amount based on tier and billing cycle
-- =====================================================

CREATE OR REPLACE FUNCTION sync_subscription_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table with subscription data from user_subscriptions
  UPDATE profiles SET
    -- Map tier names: 'pro' -> 'premium' (to match profiles table constraint)
    subscription_tier = CASE
      WHEN NEW.tier = 'pro' THEN 'premium'
      WHEN NEW.tier = 'enterprise' THEN 'unlimited'  -- Map enterprise to unlimited if needed
      ELSE NEW.tier
    END,

    subscription_status = NEW.status,

    -- Calculate subscription amount based on tier and billing cycle
    subscription_amount = CASE
      WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'monthly' THEN 6.99
      WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'yearly' THEN 69.99
      WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'annual' THEN 69.99
      WHEN NEW.tier = 'unlimited' AND NEW.billing_cycle = 'monthly' THEN 12.99
      WHEN NEW.tier = 'unlimited' AND NEW.billing_cycle = 'yearly' THEN 129.99
      WHEN NEW.tier = 'unlimited' AND NEW.billing_cycle = 'annual' THEN 129.99
      WHEN NEW.tier = 'enterprise' AND NEW.billing_cycle = 'monthly' THEN 12.99
      WHEN NEW.tier = 'enterprise' AND NEW.billing_cycle = 'yearly' THEN 129.99
      WHEN NEW.tier = 'enterprise' AND NEW.billing_cycle = 'annual' THEN 129.99
      WHEN NEW.tier = 'free' THEN 0.00
      ELSE 0.00
    END,

    subscription_currency = 'GBP',  -- Default currency (user_subscriptions doesn't have currency column)

    -- Map billing cycle to subscription_period
    subscription_period = CASE
      WHEN NEW.billing_cycle IN ('yearly', 'annual') THEN 'yearly'
      WHEN NEW.billing_cycle = 'monthly' THEN 'monthly'
      ELSE NEW.billing_cycle
    END,

    -- Map subscription dates
    -- Use subscription_period_start/end if they exist, otherwise use subscription_start_date/renewal_date
    subscription_period_start = COALESCE(
      NEW.subscription_start_date,
      NEW.subscription_period_start
    ),
    subscription_period_end = COALESCE(
      NEW.subscription_renewal_date,
      NEW.subscription_period_end
    ),
    
    -- Also update subscription_start_date and subscription_renewal_date if they exist
    subscription_start_date = NEW.subscription_start_date,
    subscription_renewal_date = NEW.subscription_renewal_date,

    -- Stripe IDs
    stripe_subscription_id = NEW.stripe_subscription_id,
    stripe_customer_id = NEW.stripe_customer_id,

    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Create Trigger
-- =====================================================
-- This trigger fires automatically on INSERT or UPDATE to user_subscriptions
-- =====================================================

CREATE TRIGGER sync_subscription_to_profiles_trigger
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_profiles();

-- =====================================================
-- Grant Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION sync_subscription_to_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_subscription_to_profiles() TO anon;

-- =====================================================
-- Backfill Existing Subscriptions
-- =====================================================
-- Update ALL existing users who have active subscriptions
-- This fixes the data for users who subscribed before the trigger was created
-- =====================================================

UPDATE profiles p
SET
  subscription_tier = CASE
    WHEN us.tier = 'pro' THEN 'premium'
    WHEN us.tier = 'enterprise' THEN 'unlimited'
    ELSE us.tier
  END,
  subscription_status = us.status,
  subscription_amount = CASE
    WHEN (us.tier = 'premium' OR us.tier = 'pro') AND us.billing_cycle = 'monthly' THEN 6.99
    WHEN (us.tier = 'premium' OR us.tier = 'pro') AND us.billing_cycle IN ('yearly', 'annual') THEN 69.99
    WHEN us.tier = 'unlimited' AND us.billing_cycle = 'monthly' THEN 12.99
    WHEN us.tier = 'unlimited' AND us.billing_cycle IN ('yearly', 'annual') THEN 129.99
    WHEN us.tier = 'enterprise' AND us.billing_cycle = 'monthly' THEN 12.99
    WHEN us.tier = 'enterprise' AND us.billing_cycle IN ('yearly', 'annual') THEN 129.99
    WHEN us.tier = 'free' THEN 0.00
    ELSE 0.00
  END,
  subscription_currency = 'GBP',
  subscription_period = CASE
    WHEN us.billing_cycle IN ('yearly', 'annual') THEN 'yearly'
    WHEN us.billing_cycle = 'monthly' THEN 'monthly'
    ELSE us.billing_cycle
  END,
  subscription_period_start = COALESCE(us.subscription_start_date, us.subscription_period_start),
  subscription_period_end = COALESCE(us.subscription_renewal_date, us.subscription_period_end),
  subscription_start_date = us.subscription_start_date,
  subscription_renewal_date = us.subscription_renewal_date,
  stripe_subscription_id = us.stripe_subscription_id,
  stripe_customer_id = us.stripe_customer_id,
  updated_at = NOW()
FROM user_subscriptions us
WHERE p.id = us.user_id
  AND us.status = 'active';

-- =====================================================
-- Verification Queries
-- =====================================================

-- 1. Verify trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_subscription_to_profiles_trigger'
ORDER BY event_manipulation;

-- 2. Check how many users were backfilled
SELECT
  COUNT(*) as total_subscribed_users,
  COUNT(*) FILTER (WHERE subscription_tier = 'premium') as premium_users,
  COUNT(*) FILTER (WHERE subscription_tier = 'unlimited') as unlimited_users,
  COUNT(*) FILTER (WHERE subscription_amount IS NOT NULL AND subscription_amount > 0) as users_with_amount
FROM profiles
WHERE subscription_tier IS NOT NULL
  AND subscription_tier != 'free'
  AND subscription_status = 'active';

-- 3. Sample check - show a few users with subscription data
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_currency,
  subscription_period,
  subscription_period_start,
  subscription_period_end,
  stripe_subscription_id
FROM profiles
WHERE subscription_tier IS NOT NULL
  AND subscription_tier != 'free'
  AND subscription_status = 'active'
LIMIT 5;

-- =====================================================
-- Success Message
-- =====================================================

DO $$
DECLARE
  backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfilled_count
  FROM profiles
  WHERE subscription_tier IS NOT NULL
    AND subscription_tier != 'free'
    AND subscription_status = 'active';
  
  RAISE NOTICE '✅ Successfully created subscription sync trigger';
  RAISE NOTICE '✅ Backfilled % users with subscription data', backfilled_count;
  RAISE NOTICE '📋 Trigger will now automatically sync future subscription updates';
END $$;

