-- =====================================================
-- Subscription Tier Schema Updates
-- =====================================================
-- Purpose: Add subscription tier management to profiles/users
-- Three Tiers: Free, Premium (£6.99/month), Unlimited (£12.99/month)
-- =====================================================

-- Add subscription-related columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'unlimited'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period VARCHAR(20) CHECK (subscription_period IN ('monthly', 'annual') OR subscription_period IS NULL);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'past_due', 'trial') OR subscription_status IS NULL);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_cancel_date TIMESTAMP WITH TIME ZONE;

-- Upload tracking columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS uploads_this_period INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upload_period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_uploads_lifetime INTEGER DEFAULT 0; -- For Free tier tracking

-- Custom username (Premium/Unlimited only)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_username VARCHAR(30) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_username_last_changed TIMESTAMP WITH TIME ZONE;

-- Featured placement tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_count_this_month INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_featured_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_featured_date TIMESTAMP WITH TIME ZONE;

-- Stripe/RevenueCat identifiers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_customer_id VARCHAR(255);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_custom_username ON profiles(custom_username) WHERE custom_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_featured_tracking ON profiles(subscription_tier, featured_count_this_month, last_featured_date)
  WHERE subscription_tier IN ('premium', 'unlimited');

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to check upload limit for a user
CREATE OR REPLACE FUNCTION check_upload_limit(p_user_id UUID)
RETURNS TABLE (
  can_upload BOOLEAN,
  uploads_used INTEGER,
  uploads_limit INTEGER,
  limit_type VARCHAR(20),
  reset_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier VARCHAR(20);
  v_uploads_this_period INTEGER;
  v_total_uploads_lifetime INTEGER;
  v_renewal_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's subscription info
  SELECT
    subscription_tier,
    uploads_this_period,
    total_uploads_lifetime,
    subscription_renewal_date
  INTO v_tier, v_uploads_this_period, v_total_uploads_lifetime, v_renewal_date
  FROM profiles
  WHERE id = p_user_id;

  -- Check based on tier
  CASE v_tier
    WHEN 'free' THEN
      -- Free: 3 tracks lifetime
      RETURN QUERY SELECT
        (v_total_uploads_lifetime < 3)::BOOLEAN,
        v_total_uploads_lifetime,
        3,
        'lifetime'::VARCHAR(20),
        NULL::TIMESTAMP WITH TIME ZONE;

    WHEN 'premium' THEN
      -- Premium: 7 tracks per month
      RETURN QUERY SELECT
        (v_uploads_this_period < 7)::BOOLEAN,
        v_uploads_this_period,
        7,
        'monthly'::VARCHAR(20),
        v_renewal_date;

    WHEN 'unlimited' THEN
      -- Unlimited: no limit
      RETURN QUERY SELECT
        TRUE::BOOLEAN,
        v_uploads_this_period,
        -1, -- -1 indicates unlimited
        'unlimited'::VARCHAR(20),
        NULL::TIMESTAMP WITH TIME ZONE;

    ELSE
      -- Default to free tier
      RETURN QUERY SELECT
        (v_total_uploads_lifetime < 3)::BOOLEAN,
        v_total_uploads_lifetime,
        3,
        'lifetime'::VARCHAR(20),
        NULL::TIMESTAMP WITH TIME ZONE;
  END CASE;
END;
$$;

-- Function to increment upload count
CREATE OR REPLACE FUNCTION increment_upload_count(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    uploads_this_period = uploads_this_period + 1,
    total_uploads_lifetime = total_uploads_lifetime + 1
  WHERE id = p_user_id;
END;
$$;

-- Function to reset monthly upload counter (for Premium users)
CREATE OR REPLACE FUNCTION reset_monthly_uploads(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    uploads_this_period = 0,
    upload_period_start = NOW()
  WHERE id = p_user_id
    AND subscription_tier = 'premium'
    AND subscription_status = 'active';
END;
$$;

-- Function to check if user can set custom username
CREATE OR REPLACE FUNCTION can_change_custom_username(p_user_id UUID)
RETURNS TABLE (
  can_change BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier VARCHAR(20);
  v_last_changed TIMESTAMP WITH TIME ZONE;
  v_days_since_change INTEGER;
BEGIN
  SELECT subscription_tier, custom_username_last_changed
  INTO v_tier, v_last_changed
  FROM profiles
  WHERE id = p_user_id;

  -- Check tier eligibility
  IF v_tier NOT IN ('premium', 'unlimited') THEN
    RETURN QUERY SELECT FALSE, 'Custom username is only available for Premium and Unlimited users';
    RETURN;
  END IF;

  -- Check if never changed before
  IF v_last_changed IS NULL THEN
    RETURN QUERY SELECT TRUE, 'You can set your custom username'::TEXT;
    RETURN;
  END IF;

  -- Check if 90 days have passed
  v_days_since_change := EXTRACT(DAY FROM NOW() - v_last_changed);
  IF v_days_since_change < 90 THEN
    RETURN QUERY SELECT FALSE, FORMAT('You can change your username again in %s days', 90 - v_days_since_change);
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'You can change your custom username'::TEXT;
END;
$$;

-- Function to update custom username
CREATE OR REPLACE FUNCTION update_custom_username(
  p_user_id UUID,
  p_username VARCHAR(30)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_can_change BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Check if user can change
  SELECT can_change, reason INTO v_can_change, v_reason
  FROM can_change_custom_username(p_user_id);

  IF NOT v_can_change THEN
    RETURN QUERY SELECT FALSE, v_reason;
    RETURN;
  END IF;

  -- Validate username format (3-30 chars, alphanumeric + hyphens)
  IF NOT p_username ~ '^[a-zA-Z0-9-]{3,30}$' THEN
    RETURN QUERY SELECT FALSE, 'Username must be 3-30 characters, alphanumeric and hyphens only'::TEXT;
    RETURN;
  END IF;

  -- Check if username is taken
  IF EXISTS (SELECT 1 FROM profiles WHERE custom_username = p_username AND id != p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'This username is already taken'::TEXT;
    RETURN;
  END IF;

  -- Update username
  UPDATE profiles
  SET
    custom_username = p_username,
    custom_username_last_changed = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Username updated successfully'::TEXT;
END;
$$;

-- =====================================================
-- Default Values for Existing Users
-- =====================================================

-- Set default values for existing users (all start as free tier)
UPDATE profiles
SET
  subscription_tier = 'free',
  uploads_this_period = 0,
  total_uploads_lifetime = 0,
  featured_count_this_month = 0
WHERE subscription_tier IS NULL;

-- =====================================================
-- Comments & Documentation
-- =====================================================

COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription tier: free, premium, unlimited';
COMMENT ON COLUMN profiles.subscription_period IS 'Billing period: monthly or annual';
COMMENT ON COLUMN profiles.subscription_status IS 'Subscription status: active, cancelled, expired, past_due, trial';
COMMENT ON COLUMN profiles.subscription_start_date IS 'When current subscription period started';
COMMENT ON COLUMN profiles.subscription_renewal_date IS 'When subscription renews or expires';
COMMENT ON COLUMN profiles.subscription_cancel_date IS 'When user requested cancellation';
COMMENT ON COLUMN profiles.uploads_this_period IS 'Tracks uploaded in current billing period (Premium: monthly, Free: lifetime)';
COMMENT ON COLUMN profiles.upload_period_start IS 'Start date of current upload counting period';
COMMENT ON COLUMN profiles.total_uploads_lifetime IS 'Total tracks uploaded ever (for Free tier 3-track limit)';
COMMENT ON COLUMN profiles.custom_username IS 'Custom profile URL slug (Premium/Unlimited only, unique)';
COMMENT ON COLUMN profiles.custom_username_last_changed IS 'Last time username was changed (90-day limit)';
COMMENT ON COLUMN profiles.featured_count_this_month IS 'Number of times featured this month (Premium: max 1, Unlimited: max 2)';
COMMENT ON COLUMN profiles.last_featured_date IS 'Last time user was featured on Discover page';
COMMENT ON COLUMN profiles.next_featured_date IS 'Scheduled next featuring date';

COMMENT ON FUNCTION check_upload_limit IS 'Checks if user can upload based on tier limits';
COMMENT ON FUNCTION increment_upload_count IS 'Increments both period and lifetime upload counters';
COMMENT ON FUNCTION reset_monthly_uploads IS 'Resets monthly upload counter for Premium users (called by cron)';
COMMENT ON FUNCTION can_change_custom_username IS 'Checks if user can change custom username (tier check + 90-day limit)';
COMMENT ON FUNCTION update_custom_username IS 'Updates custom username with validation';
