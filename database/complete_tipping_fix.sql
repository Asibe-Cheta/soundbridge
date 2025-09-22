-- Complete Tipping System Fix for Live Supabase Database
-- Run this script in your Supabase SQL editor to fix all tipping issues

-- ==============================================
-- 1. CREATE TIP ANALYTICS TABLE (Required for API)
-- ==============================================

CREATE TABLE IF NOT EXISTS tip_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_tier TEXT NOT NULL CHECK (tipper_tier IN ('free', 'pro', 'enterprise')),
  tip_amount DECIMAL(10,2) NOT NULL CHECK (tip_amount > 0),
  platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
  creator_earnings DECIMAL(10,2) NOT NULL CHECK (creator_earnings >= 0),
  fee_percentage DECIMAL(5,2) NOT NULL CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  tip_message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2. CREATE CREATOR TIPS TABLE (Backward Compatibility)
-- ==============================================

CREATE TABLE IF NOT EXISTS creator_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. CREATE REVENUE TRANSACTIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('tip', 'track_sale', 'subscription', 'payout')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
  creator_earnings DECIMAL(10,2) NOT NULL CHECK (creator_earnings >= 0),
  source_type TEXT,
  source_id UUID,
  source_title TEXT,
  customer_email TEXT,
  customer_name TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 4. CREATE CREATOR REVENUE TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS creator_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_earned DECIMAL(10,2) DEFAULT 0 CHECK (total_earned >= 0),
  total_paid_out DECIMAL(10,2) DEFAULT 0 CHECK (total_paid_out >= 0),
  pending_balance DECIMAL(10,2) DEFAULT 0 CHECK (pending_balance >= 0),
  available_balance DECIMAL(10,2) DEFAULT 0 CHECK (available_balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 5. CREATE USER UPLOAD STATS TABLE (Required for tier detection)
-- ==============================================

CREATE TABLE IF NOT EXISTS user_upload_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_tier TEXT DEFAULT 'free' CHECK (current_tier IN ('free', 'pro', 'enterprise')),
  total_uploads INTEGER DEFAULT 0 CHECK (total_uploads >= 0),
  total_size_mb DECIMAL(10,2) DEFAULT 0 CHECK (total_size_mb >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE tip_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_upload_stats ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 7. CREATE RLS POLICIES
-- ==============================================

-- Tip Analytics Policies
DROP POLICY IF EXISTS "Users can view tips they sent or received" ON tip_analytics;
DROP POLICY IF EXISTS "Users can insert tips they send" ON tip_analytics;

CREATE POLICY "Users can view tips they sent or received" ON tip_analytics
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = tipper_id);

CREATE POLICY "Users can insert tips they send" ON tip_analytics
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- Creator Tips Policies  
DROP POLICY IF EXISTS "Users can view tips they sent or received" ON creator_tips;
DROP POLICY IF EXISTS "Users can insert tips they send" ON creator_tips;

CREATE POLICY "Users can view tips they sent or received" ON creator_tips
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = tipper_id);

CREATE POLICY "Users can insert tips they send" ON creator_tips
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- Revenue Transactions Policies
DROP POLICY IF EXISTS "Users can view their own revenue transactions" ON revenue_transactions;
DROP POLICY IF EXISTS "Users can insert their own revenue transactions" ON revenue_transactions;

CREATE POLICY "Users can view their own revenue transactions" ON revenue_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own revenue transactions" ON revenue_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Creator Revenue Policies
DROP POLICY IF EXISTS "Users can view their own revenue" ON creator_revenue;
DROP POLICY IF EXISTS "Users can update their own revenue" ON creator_revenue;

CREATE POLICY "Users can view their own revenue" ON creator_revenue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenue" ON creator_revenue
  FOR ALL USING (auth.uid() = user_id);

-- User Upload Stats Policies
DROP POLICY IF EXISTS "Users can view their own upload stats" ON user_upload_stats;
DROP POLICY IF EXISTS "Users can update their own upload stats" ON user_upload_stats;

CREATE POLICY "Users can view their own upload stats" ON user_upload_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload stats" ON user_upload_stats
  FOR ALL USING (auth.uid() = user_id);

-- ==============================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_id ON tip_analytics(creator_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_tipper_id ON tip_analytics(tipper_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_created_at ON tip_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_status ON tip_analytics(status);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_stripe_id ON tip_analytics(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_creator_tips_creator_id ON creator_tips(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_tips_tipper_id ON creator_tips(tipper_id);
CREATE INDEX IF NOT EXISTS idx_creator_tips_created_at ON creator_tips(created_at);
CREATE INDEX IF NOT EXISTS idx_creator_tips_status ON creator_tips(status);
CREATE INDEX IF NOT EXISTS idx_creator_tips_stripe_id ON creator_tips(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_revenue_transactions_user_id ON revenue_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_type ON revenue_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_created_at ON revenue_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_stripe_id ON revenue_transactions(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_creator_revenue_user_id ON creator_revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_user_upload_stats_user_id ON user_upload_stats(user_id);

-- ==============================================
-- 9. CREATE REQUIRED DATABASE FUNCTIONS
-- ==============================================

-- Function to calculate platform fee based on user tier
CREATE OR REPLACE FUNCTION calculate_platform_fee(
  user_tier TEXT,
  transaction_amount DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE 
    WHEN user_tier = 'free' THEN transaction_amount * 0.10 -- 10% fee for free users
    WHEN user_tier = 'pro' THEN transaction_amount * 0.05  -- 5% fee for pro users
    WHEN user_tier = 'enterprise' THEN transaction_amount * 0.02 -- 2% fee for enterprise users
    ELSE transaction_amount * 0.10 -- Default 10% fee
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a revenue transaction
CREATE OR REPLACE FUNCTION record_revenue_transaction(
  user_uuid UUID,
  transaction_type_param TEXT,
  amount_param DECIMAL,
  source_type_param TEXT DEFAULT NULL,
  source_id_param UUID DEFAULT NULL,
  source_title_param TEXT DEFAULT NULL,
  customer_email_param TEXT DEFAULT NULL,
  customer_name_param TEXT DEFAULT NULL,
  stripe_payment_intent_id_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  transaction_id UUID;
  user_tier TEXT;
  platform_fee_amount DECIMAL;
  creator_earnings_amount DECIMAL;
BEGIN
  -- Get user tier (default to 'free' if not found)
  SELECT COALESCE(us.current_tier, 'free') INTO user_tier
  FROM user_upload_stats us
  WHERE us.user_id = user_uuid;
  
  -- If user not found in upload stats, default to 'free'
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Calculate platform fee and creator earnings
  platform_fee_amount := calculate_platform_fee(user_tier, amount_param);
  creator_earnings_amount := amount_param - platform_fee_amount;
  
  -- Insert transaction record
  INSERT INTO revenue_transactions (
    user_id,
    transaction_type,
    amount,
    platform_fee,
    creator_earnings,
    source_type,
    source_id,
    source_title,
    customer_email,
    customer_name,
    stripe_payment_intent_id
  ) VALUES (
    user_uuid,
    transaction_type_param,
    amount_param,
    platform_fee_amount,
    creator_earnings_amount,
    source_type_param,
    source_id_param,
    source_title_param,
    customer_email_param,
    customer_name_param,
    stripe_payment_intent_id_param
  ) RETURNING id INTO transaction_id;
  
  -- Update creator revenue totals
  INSERT INTO creator_revenue (user_id, total_earned, available_balance)
  VALUES (user_uuid, creator_earnings_amount, creator_earnings_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    total_earned = creator_revenue.total_earned + creator_earnings_amount,
    available_balance = creator_revenue.available_balance + creator_earnings_amount,
    updated_at = NOW();
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get creator revenue summary
CREATE OR REPLACE FUNCTION get_creator_revenue_summary(user_uuid UUID)
RETURNS TABLE (
  total_earned DECIMAL,
  total_paid_out DECIMAL,
  pending_balance DECIMAL,
  available_balance DECIMAL,
  this_month_earnings DECIMAL,
  last_month_earnings DECIMAL,
  total_tips DECIMAL,
  total_track_sales DECIMAL,
  total_subscriptions DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(cr.total_earned, 0) as total_earned,
    COALESCE(cr.total_paid_out, 0) as total_paid_out,
    COALESCE(cr.pending_balance, 0) as pending_balance,
    COALESCE(cr.available_balance, 0) as available_balance,
    COALESCE(
      (SELECT SUM(creator_earnings) 
       FROM revenue_transactions 
       WHERE user_id = user_uuid 
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
      ), 0
    ) as this_month_earnings,
    COALESCE(
      (SELECT SUM(creator_earnings) 
       FROM revenue_transactions 
       WHERE user_id = user_uuid 
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      ), 0
    ) as last_month_earnings,
    COALESCE(
      (SELECT SUM(creator_earnings) 
       FROM revenue_transactions 
       WHERE user_id = user_uuid AND transaction_type = 'tip'
      ), 0
    ) as total_tips,
    COALESCE(
      (SELECT SUM(creator_earnings) 
       FROM revenue_transactions 
       WHERE user_id = user_uuid AND transaction_type = 'track_sale'
      ), 0
    ) as total_track_sales,
    COALESCE(
      (SELECT SUM(creator_earnings) 
       FROM revenue_transactions 
       WHERE user_id = user_uuid AND transaction_type = 'subscription'
      ), 0
    ) as total_subscriptions
  FROM creator_revenue cr
  WHERE cr.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 10. INSERT DEFAULT USER STATS FOR EXISTING USERS
-- ==============================================

INSERT INTO user_upload_stats (user_id, current_tier, total_uploads, total_size_mb)
SELECT id, 'free', 0, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_upload_stats)
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT 'Tipping system database setup completed successfully!' as status;
