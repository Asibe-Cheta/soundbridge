-- SoundBridge Tier Restructure Schema
-- Implements Free/Pro tier structure with limits and 7-day money-back guarantee
-- Date: December 2024
-- Based on: TIER_RESTRUCTURE.md
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- This script is idempotent (safe to run multiple times)

-- ============================================================================
-- 1. UPDATE USER_SUBSCRIPTIONS TABLE
-- ============================================================================

-- Add missing fields to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS money_back_guarantee_eligible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS refund_count INTEGER DEFAULT 0;

-- Update status enum to remove 'trial' (no free trials)
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_status_check 
CHECK (status IN ('active', 'cancelled', 'expired', 'past_due'));

-- Add comments for documentation
COMMENT ON COLUMN user_subscriptions.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN user_subscriptions.stripe_subscription_id IS 'Stripe subscription ID for recurring payments';
COMMENT ON COLUMN user_subscriptions.subscription_start_date IS 'Date when subscription started (for 7-day money-back guarantee calculation)';
COMMENT ON COLUMN user_subscriptions.subscription_renewal_date IS 'Date when subscription renews';
COMMENT ON COLUMN user_subscriptions.money_back_guarantee_eligible IS 'Whether user is eligible for 7-day money-back guarantee (false after 3+ refunds)';
COMMENT ON COLUMN user_subscriptions.refund_count IS 'Number of refunds this user has requested';

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_start_date ON user_subscriptions(subscription_start_date) WHERE subscription_start_date IS NOT NULL;

-- ============================================================================
-- 2. UPDATE AUDIO_TRACKS TABLE
-- ============================================================================

-- Add visibility and tier tracking fields
ALTER TABLE audio_tracks
ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
ADD COLUMN IF NOT EXISTS uploaded_during_tier VARCHAR(10) CHECK (uploaded_during_tier IN ('free', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN audio_tracks.visibility IS 'Track visibility: public (visible to all), private (only creator), unlisted (direct link only)';
COMMENT ON COLUMN audio_tracks.uploaded_during_tier IS 'Tier user had when track was uploaded';
COMMENT ON COLUMN audio_tracks.deleted_at IS 'Soft delete timestamp';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audio_tracks_visibility ON audio_tracks(visibility);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_uploaded_during_tier ON audio_tracks(uploaded_during_tier);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_deleted_at ON audio_tracks(deleted_at) WHERE deleted_at IS NULL;

-- Update existing tracks to have default values
UPDATE audio_tracks
SET visibility = CASE 
  WHEN is_public = true THEN 'public'
  ELSE 'private'
END,
uploaded_during_tier = 'free'
WHERE visibility IS NULL OR uploaded_during_tier IS NULL;

-- ============================================================================
-- 3. CREATE REFUNDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  stripe_refund_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_refunded DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  refund_reason TEXT,
  refund_date TIMESTAMPTZ DEFAULT NOW(),
  refund_count INTEGER NOT NULL DEFAULT 1, -- How many refunds this user has had
  ip_address VARCHAR(45),
  payment_method_last4 VARCHAR(4),
  device_fingerprint TEXT,
  flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for refunds
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_refund_id ON refunds(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_payment_method ON refunds(payment_method_last4) WHERE payment_method_last4 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_flagged ON refunds(flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_refunds_refund_date ON refunds(refund_date);

-- RLS for refunds
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refunds" ON refunds
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all refunds (handled via service role key in API)

-- ============================================================================
-- 4. CREATE DOWNGRADE_TRACK_SELECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS downgrade_track_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downgrade_date TIMESTAMPTZ DEFAULT NOW(),
  from_tier VARCHAR(10) NOT NULL CHECK (from_tier IN ('free', 'pro', 'enterprise')),
  to_tier VARCHAR(10) NOT NULL CHECK (to_tier IN ('free', 'pro', 'enterprise')),
  selected_track_ids UUID[] NOT NULL, -- Array of track IDs user chose to keep public
  auto_selected BOOLEAN DEFAULT false, -- If system auto-selected (e.g., chargeback)
  reason VARCHAR(50) CHECK (reason IN ('refund', 'cancellation', 'payment_failure', 'chargeback', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_downgrade_track_selections_user_id ON downgrade_track_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_downgrade_track_selections_date ON downgrade_track_selections(downgrade_date);

-- RLS
ALTER TABLE downgrade_track_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own downgrade selections" ON downgrade_track_selections
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 5. CREATE USAGE_TRACKING TABLE (for search and message limits)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_type VARCHAR(20) NOT NULL CHECK (usage_type IN ('search', 'message')),
  count INTEGER NOT NULL DEFAULT 0,
  period_start_date TIMESTAMPTZ NOT NULL, -- Start of current billing period (user's signup anniversary)
  period_end_date TIMESTAMPTZ NOT NULL, -- End of current billing period
  last_reset_date TIMESTAMPTZ, -- When counter was last reset
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One record per user per usage type per period
  UNIQUE(user_id, usage_type, period_start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_type ON usage_tracking(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start_date, period_end_date);

-- RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage tracking" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 6. FUNCTIONS FOR TIER LIMITS
-- ============================================================================

-- Function to get user's signup anniversary date (for monthly reset)
CREATE OR REPLACE FUNCTION get_user_signup_anniversary(p_user_id UUID)
RETURNS DATE AS $$
DECLARE
  signup_date DATE;
BEGIN
  SELECT DATE(created_at) INTO signup_date
  FROM auth.users
  WHERE id = p_user_id;
  
  RETURN signup_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current billing period dates (based on signup anniversary)
CREATE OR REPLACE FUNCTION get_current_billing_period(p_user_id UUID)
RETURNS TABLE(period_start TIMESTAMPTZ, period_end TIMESTAMPTZ) AS $$
DECLARE
  signup_date DATE;
  today DATE;
  current_year INTEGER;
  current_month INTEGER;
  signup_day INTEGER;
  period_start_date DATE;
  period_end_date DATE;
BEGIN
  -- Get user signup date
  SELECT DATE(created_at) INTO signup_date
  FROM auth.users
  WHERE id = p_user_id;
  
  today := CURRENT_DATE;
  current_year := EXTRACT(YEAR FROM today);
  current_month := EXTRACT(MONTH FROM today);
  signup_day := EXTRACT(DAY FROM signup_date);
  
  -- Calculate period start (anniversary day of current month, or last day if month is shorter)
  period_start_date := DATE(current_year || '-' || current_month || '-' || 
    LEAST(signup_day, EXTRACT(DAY FROM (DATE_TRUNC('month', today) + INTERVAL '1 month - 1 day'))));
  
  -- If we've passed the anniversary this month, period started on anniversary
  -- Otherwise, period started on anniversary of previous month
  IF EXTRACT(DAY FROM today) < signup_day THEN
    period_start_date := period_start_date - INTERVAL '1 month';
  END IF;
  
  -- Period ends on day before next anniversary
  period_end_date := period_start_date + INTERVAL '1 month';
  
  RETURN QUERY SELECT 
    period_start_date::TIMESTAMPTZ,
    period_end_date::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check search limit
CREATE OR REPLACE FUNCTION check_search_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  search_limit INTEGER;
  current_count INTEGER;
  remaining INTEGER;
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
  reset_date TIMESTAMPTZ;
BEGIN
  -- Get user tier
  SELECT COALESCE(tier, 'free') INTO user_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Set search limit based on tier
  search_limit := CASE 
    WHEN user_tier = 'free' THEN 5
    WHEN user_tier = 'pro' THEN 999999 -- Unlimited
    WHEN user_tier = 'enterprise' THEN 999999
    ELSE 5
  END;
  
  -- If unlimited, return early
  IF search_limit >= 999999 THEN
    RETURN jsonb_build_object(
      'tier', user_tier,
      'limit', -1,
      'used', 0,
      'remaining', -1,
      'is_unlimited', true
    );
  END IF;
  
  -- Get current billing period
  SELECT * INTO period_start, period_end
  FROM get_current_billing_period(p_user_id);
  
  -- Get or create usage tracking record
  INSERT INTO usage_tracking (user_id, usage_type, count, period_start_date, period_end_date)
  VALUES (p_user_id, 'search', 0, period_start, period_end)
  ON CONFLICT (user_id, usage_type, period_start_date)
  DO UPDATE SET updated_at = NOW()
  RETURNING count INTO current_count;
  
  -- If record already existed, get current count
  IF current_count IS NULL THEN
    SELECT count INTO current_count
    FROM usage_tracking
    WHERE user_id = p_user_id 
      AND usage_type = 'search'
      AND period_start_date = period_start;
  END IF;
  
  remaining := GREATEST(search_limit - current_count, 0);
  reset_date := period_end;
  
  RETURN jsonb_build_object(
    'tier', user_tier,
    'limit', search_limit,
    'used', current_count,
    'remaining', remaining,
    'period_start', period_start,
    'period_end', period_end,
    'reset_date', reset_date,
    'is_unlimited', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check message limit (outbound only)
CREATE OR REPLACE FUNCTION check_message_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  message_limit INTEGER;
  current_count INTEGER;
  remaining INTEGER;
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
  reset_date TIMESTAMPTZ;
BEGIN
  -- Get user tier
  SELECT COALESCE(tier, 'free') INTO user_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Set message limit based on tier
  message_limit := CASE 
    WHEN user_tier = 'free' THEN 3
    WHEN user_tier = 'pro' THEN 999999 -- Unlimited
    WHEN user_tier = 'enterprise' THEN 999999
    ELSE 3
  END;
  
  -- If unlimited, return early
  IF message_limit >= 999999 THEN
    RETURN jsonb_build_object(
      'tier', user_tier,
      'limit', -1,
      'used', 0,
      'remaining', -1,
      'is_unlimited', true
    );
  END IF;
  
  -- Get current billing period
  SELECT * INTO period_start, period_end
  FROM get_current_billing_period(p_user_id);
  
  -- Get or create usage tracking record
  INSERT INTO usage_tracking (user_id, usage_type, count, period_start_date, period_end_date)
  VALUES (p_user_id, 'message', 0, period_start, period_end)
  ON CONFLICT (user_id, usage_type, period_start_date)
  DO UPDATE SET updated_at = NOW()
  RETURNING count INTO current_count;
  
  -- If record already existed, get current count
  IF current_count IS NULL THEN
    SELECT count INTO current_count
    FROM usage_tracking
    WHERE user_id = p_user_id 
      AND usage_type = 'message'
      AND period_start_date = period_start;
  END IF;
  
  remaining := GREATEST(message_limit - current_count, 0);
  reset_date := period_end;
  
  RETURN jsonb_build_object(
    'tier', user_tier,
    'limit', message_limit,
    'used', current_count,
    'remaining', remaining,
    'period_start', period_start,
    'period_end', period_end,
    'reset_date', reset_date,
    'is_unlimited', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_usage_type TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
BEGIN
  -- Get current billing period
  SELECT * INTO period_start, period_end
  FROM get_current_billing_period(p_user_id);
  
  -- Insert or update usage tracking
  INSERT INTO usage_tracking (user_id, usage_type, count, period_start_date, period_end_date, last_reset_date)
  VALUES (p_user_id, p_usage_type, p_amount, period_start, period_end, NOW())
  ON CONFLICT (user_id, usage_type, period_start_date)
  DO UPDATE SET 
    count = usage_tracking.count + p_amount,
    updated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check upload limit (Free: 3 lifetime, Pro: 10 total)
CREATE OR REPLACE FUNCTION check_upload_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  upload_limit INTEGER;
  current_uploads INTEGER;
  remaining INTEGER;
BEGIN
  -- Get user tier
  SELECT COALESCE(tier, 'free') INTO user_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Set upload limit based on tier
  upload_limit := CASE 
    WHEN user_tier = 'free' THEN 3  -- 3 lifetime uploads
    WHEN user_tier = 'pro' THEN 10  -- 10 total uploads
    WHEN user_tier = 'enterprise' THEN 999999 -- Unlimited
    ELSE 3
  END;
  
  -- If unlimited, return early
  IF upload_limit >= 999999 THEN
    RETURN jsonb_build_object(
      'tier', user_tier,
      'limit', -1,
      'used', 0,
      'remaining', -1,
      'is_unlimited', true
    );
  END IF;
  
  -- Count current uploads (excluding deleted)
  SELECT COUNT(*) INTO current_uploads
  FROM audio_tracks
  WHERE creator_id = p_user_id
    AND deleted_at IS NULL;
  
  remaining := GREATEST(upload_limit - current_uploads, 0);
  
  RETURN jsonb_build_object(
    'tier', user_tier,
    'limit', upload_limit,
    'used', current_uploads,
    'remaining', remaining,
    'is_unlimited', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is within 7-day money-back guarantee window
CREATE OR REPLACE FUNCTION is_within_money_back_guarantee(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_start TIMESTAMPTZ;
  days_since_start INTEGER;
  is_eligible BOOLEAN;
BEGIN
  -- Get subscription start date
  SELECT subscription_start_date, money_back_guarantee_eligible
  INTO subscription_start, is_eligible
  FROM user_subscriptions
  WHERE user_id = p_user_id 
    AND status = 'active'
    AND tier = 'pro'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no subscription or not eligible, return false
  IF subscription_start IS NULL OR NOT is_eligible THEN
    RETURN false;
  END IF;
  
  -- Calculate days since subscription started
  days_since_start := EXTRACT(DAY FROM (NOW() - subscription_start));
  
  -- Return true if within 7 days
  RETURN days_since_start <= 7;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get refund count for user
CREATE OR REPLACE FUNCTION get_user_refund_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  refund_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO refund_count
  FROM refunds
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(refund_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on refunds
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set uploaded_during_tier when track is uploaded
CREATE OR REPLACE FUNCTION set_uploaded_during_tier()
RETURNS TRIGGER AS $$
DECLARE
  user_tier TEXT;
BEGIN
  -- Get user's current tier
  SELECT COALESCE(tier, 'free') INTO user_tier
  FROM user_subscriptions
  WHERE user_id = NEW.creator_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  NEW.uploaded_during_tier := user_tier;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_track_upload_tier BEFORE INSERT ON audio_tracks
  FOR EACH ROW EXECUTE FUNCTION set_uploaded_during_tier();

-- ============================================================================
-- 8. COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE refunds IS 'Tracks refund history for 7-day money-back guarantee and abuse prevention';
COMMENT ON TABLE downgrade_track_selections IS 'Tracks which tracks users selected to keep public when downgrading from Pro to Free';
COMMENT ON TABLE usage_tracking IS 'Tracks monthly usage of searches and messages, resets on user signup anniversary';

COMMENT ON FUNCTION check_search_limit(UUID) IS 'Returns search limit information for a user based on their tier';
COMMENT ON FUNCTION check_message_limit(UUID) IS 'Returns message limit information for a user based on their tier (outbound only)';
COMMENT ON FUNCTION check_upload_limit(UUID) IS 'Returns upload limit information: Free = 3 lifetime, Pro = 10 total';
COMMENT ON FUNCTION is_within_money_back_guarantee(UUID) IS 'Checks if user is within 7-day money-back guarantee window';
COMMENT ON FUNCTION get_user_refund_count(UUID) IS 'Returns total number of refunds a user has requested';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
