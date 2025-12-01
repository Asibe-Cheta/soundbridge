-- SoundBridge New Onboarding Flow Schema
-- Implements new 7-screen onboarding flow with user type selection and money-back guarantee
-- Date: December 2024
-- Based on: ONBOARDING_NEW_FLOW.md and WEB_TEAM_ONBOARDING_ENDPOINTS_REQUEST.md
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- This script is idempotent (safe to run multiple times)

-- ============================================================================
-- 1. ADD ONBOARDING_USER_TYPE TO PROFILES TABLE
-- ============================================================================

-- Add onboarding_user_type field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_user_type VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN profiles.onboarding_user_type IS 'User type selected during onboarding: music_creator, podcast_creator, industry_professional, music_lover, or null';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_user_type ON profiles(onboarding_user_type) WHERE onboarding_user_type IS NOT NULL;

-- ============================================================================
-- 2. ADD MONEY_BACK_GUARANTEE_END_DATE TO USER_SUBSCRIPTIONS TABLE
-- ============================================================================

-- Add money_back_guarantee_end_date field to user_subscriptions table
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS money_back_guarantee_end_date TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN user_subscriptions.money_back_guarantee_end_date IS 'End date of 7-day money-back guarantee window (subscription_start_date + 7 days)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_money_back_guarantee_end_date 
ON user_subscriptions(money_back_guarantee_end_date) 
WHERE money_back_guarantee_end_date IS NOT NULL;

-- ============================================================================
-- 3. CREATE ONBOARDING_ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_name VARCHAR(100) NOT NULL,
  screen_name VARCHAR(50),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_event_name ON onboarding_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_screen_name ON onboarding_analytics(screen_name);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created_at ON onboarding_analytics(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE onboarding_analytics IS 'Tracks onboarding flow analytics events for conversion optimization';
COMMENT ON COLUMN onboarding_analytics.event_name IS 'Event name: onboarding_started, user_type_selected, profile_created, value_demo_viewed, tier_selected, payment_method_added, onboarding_completed';
COMMENT ON COLUMN onboarding_analytics.screen_name IS 'Current screen: welcome, userType, quickSetup, valueDemo, tierSelection, payment, welcomeConfirmation';
COMMENT ON COLUMN onboarding_analytics.properties IS 'Additional event properties as JSONB (user_type, selected_tier, time_spent, etc.)';

-- ============================================================================
-- 4. UPDATE EXISTING PROFILES WITH DEFAULT VALUES
-- ============================================================================

-- Set default onboarding_user_type to null for existing profiles (if not already set)
-- This is safe to run multiple times
UPDATE profiles
SET onboarding_user_type = NULL
WHERE onboarding_user_type IS NULL;

-- ============================================================================
-- 5. CREATE FUNCTION TO CALCULATE MONEY_BACK_GUARANTEE_END_DATE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_money_back_guarantee_end_date(start_date TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Return start_date + 7 days
  RETURN start_date + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment
COMMENT ON FUNCTION calculate_money_back_guarantee_end_date IS 'Calculates the end date of the 7-day money-back guarantee window';
