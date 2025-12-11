-- =====================================================
-- Check if Subscription Columns Exist and Add Them
-- =====================================================

-- STEP 1: Check if subscription columns exist
-- This will show you the current columns in the profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================

-- STEP 2: Add subscription columns if they don't exist
-- Run this ONLY if STEP 1 shows that subscription_tier column doesn't exist

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
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_uploads_lifetime INTEGER DEFAULT 0;

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_custom_username ON profiles(custom_username) WHERE custom_username IS NOT NULL;

-- =====================================================

-- STEP 3: Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
  AND column_name LIKE '%subscription%'
ORDER BY ordinal_position;

-- =====================================================

-- STEP 4: Now check your profile with the correct query
SELECT
  u.id as user_id,
  u.email,
  p.username,
  p.display_name,
  p.role,
  p.onboarding_completed,
  p.onboarding_step,
  p.subscription_tier,
  p.subscription_status,
  p.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'asibechetachukwu@gmail.com';

-- =====================================================

-- STEP 5: If profile exists, update onboarding status
UPDATE profiles
SET
  onboarding_completed = true,
  onboarding_step = 'completed',
  subscription_tier = 'free',  -- Change to 'premium' or 'unlimited' if you have a subscription
  subscription_status = 'active',
  updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com'
);

-- =====================================================
