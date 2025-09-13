-- SoundBridge Subscription & Usage Tracking Schema
-- Supports value-first freemium model with unlimited uploads

-- User subscription tiers
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking (for analytics, not limits)
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  music_uploads INTEGER DEFAULT 0,
  podcast_uploads INTEGER DEFAULT 0,
  event_uploads INTEGER DEFAULT 0,
  total_storage_used BIGINT DEFAULT 0,
  total_plays BIGINT DEFAULT 0,
  total_followers INTEGER DEFAULT 0,
  last_upload_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Revenue tracking for creators
CREATE TABLE IF NOT EXISTS creator_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_paid_out DECIMAL(10,2) DEFAULT 0,
  pending_balance DECIMAL(10,2) DEFAULT 0,
  last_payout_at TIMESTAMP,
  payout_threshold DECIMAL(10,2) DEFAULT 50.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Premium features usage tracking
CREATE TABLE IF NOT EXISTS premium_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_revenue_user_id ON creator_revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_feature_usage_user_id ON premium_feature_usage(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own revenue" ON creator_revenue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own feature usage" ON premium_feature_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_usage_updated_at BEFORE UPDATE ON user_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_revenue_updated_at BEFORE UPDATE ON creator_revenue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_premium_feature_usage_updated_at BEFORE UPDATE ON premium_feature_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user subscription tier
CREATE OR REPLACE FUNCTION get_user_tier(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT tier FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active'
    ORDER BY created_at DESC 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has premium feature access
CREATE OR REPLACE FUNCTION has_premium_feature(user_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT CASE 
      WHEN tier IN ('pro', 'enterprise') THEN true
      ELSE false
    END
    FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active'
    ORDER BY created_at DESC 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default subscription for existing users
INSERT INTO user_subscriptions (user_id, tier, status)
SELECT id, 'free', 'active'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT DO NOTHING;

-- Insert default usage tracking for existing users
INSERT INTO user_usage (user_id)
SELECT id
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_usage)
ON CONFLICT DO NOTHING;

-- Insert default revenue tracking for existing users
INSERT INTO creator_revenue (user_id)
SELECT id
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM creator_revenue)
ON CONFLICT DO NOTHING;
