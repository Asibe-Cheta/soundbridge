-- SoundBridge In-App Purchase Integration Schema Update
-- Adds support for Apple App Store and Google Play Store purchases

-- Update user_subscriptions table to support IAP
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_platform TEXT DEFAULT 'stripe' 
  CHECK (subscription_platform IN ('stripe', 'apple', 'google'));

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS iap_receipt TEXT; -- Store receipt data

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS iap_transaction_id TEXT; -- Store transaction ID

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS iap_original_transaction_id TEXT; -- For Apple subscriptions

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS iap_product_id TEXT; -- Store product ID from app stores

-- Create index for faster IAP lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_iap_transaction 
  ON user_subscriptions(iap_transaction_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_platform 
  ON user_subscriptions(subscription_platform);

-- IAP Product Configuration Table
CREATE TABLE IF NOT EXISTS iap_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('apple', 'google')),
  product_id TEXT NOT NULL, -- Product ID from app store
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'enterprise')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  price_usd DECIMAL(8,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(platform, product_id)
);

-- Insert default IAP product configurations
INSERT INTO iap_products (platform, product_id, tier, billing_cycle, price_usd) VALUES
-- Apple App Store Products
('apple', 'com.soundbridge.pro.monthly', 'pro', 'monthly', 9.99),
('apple', 'com.soundbridge.pro.yearly', 'pro', 'yearly', 99.99),
('apple', 'com.soundbridge.enterprise.monthly', 'enterprise', 'monthly', 29.99),
('apple', 'com.soundbridge.enterprise.yearly', 'enterprise', 'yearly', 299.99),

-- Google Play Store Products
('google', 'soundbridge_pro_monthly', 'pro', 'monthly', 9.99),
('google', 'soundbridge_pro_yearly', 'pro', 'yearly', 99.99),
('google', 'soundbridge_enterprise_monthly', 'enterprise', 'monthly', 29.99),
('google', 'soundbridge_enterprise_yearly', 'enterprise', 'yearly', 299.99)

ON CONFLICT (platform, product_id) DO NOTHING;

-- IAP Receipt Verification Log (for debugging and audit)
CREATE TABLE IF NOT EXISTS iap_receipt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('apple', 'google')),
  receipt_data TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'valid', 'invalid', 'expired')),
  transaction_id TEXT,
  product_id TEXT,
  purchase_date TIMESTAMP,
  expires_date TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create RLS policies for IAP tables
ALTER TABLE iap_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE iap_receipt_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read product configurations
CREATE POLICY "Anyone can read IAP products" ON iap_products
  FOR SELECT USING (true);

-- Users can only see their own receipt logs
CREATE POLICY "Users can read their own receipt logs" ON iap_receipt_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own receipt logs
CREATE POLICY "Users can insert their own receipt logs" ON iap_receipt_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON iap_products TO authenticated;
GRANT SELECT, INSERT ON iap_receipt_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;

-- Update existing RLS policies for user_subscriptions to work with IAP
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

COMMENT ON TABLE iap_products IS 'Configuration for In-App Purchase products across Apple and Google stores';
COMMENT ON TABLE iap_receipt_logs IS 'Audit log for IAP receipt verification attempts';
COMMENT ON COLUMN user_subscriptions.subscription_platform IS 'Platform used for subscription: stripe, apple, or google';
COMMENT ON COLUMN user_subscriptions.iap_receipt IS 'Raw receipt data from app store';
COMMENT ON COLUMN user_subscriptions.iap_transaction_id IS 'Transaction ID from app store';
COMMENT ON COLUMN user_subscriptions.iap_product_id IS 'Product ID from app store';
