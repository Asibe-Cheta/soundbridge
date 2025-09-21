-- Revenue Sharing & Monetization Schema for SoundBridge (Final Version)
-- This creates everything step by step and handles the final insert properly

-- Drop existing functions first (if they exist)
DROP FUNCTION IF EXISTS calculate_platform_fee(TEXT, DECIMAL);
DROP FUNCTION IF EXISTS record_revenue_transaction(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS process_creator_payout(UUID, DECIMAL);
DROP FUNCTION IF EXISTS get_creator_revenue_summary(UUID);

-- Bank account information for payouts
CREATE TABLE IF NOT EXISTS creator_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bank account details (encrypted)
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL, -- Encrypted account number
  routing_number_encrypted TEXT NOT NULL, -- Encrypted routing number
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Stripe Connect integration
  stripe_account_id TEXT, -- Stripe Connect account ID
  stripe_bank_token TEXT, -- Stripe bank account token
  
  -- Verification status
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'rejected')),
  verification_attempts INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id) -- One bank account per user
);

-- Revenue tracking and earnings
CREATE TABLE IF NOT EXISTS creator_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Earnings breakdown
  total_earned DECIMAL(12,2) DEFAULT 0.00,
  total_paid_out DECIMAL(12,2) DEFAULT 0.00,
  pending_balance DECIMAL(12,2) DEFAULT 0.00,
  available_balance DECIMAL(12,2) DEFAULT 0.00,
  
  -- Payout settings
  payout_threshold DECIMAL(8,2) DEFAULT 50.00, -- Minimum amount for payout
  payout_frequency TEXT DEFAULT 'monthly' CHECK (payout_frequency IN ('weekly', 'monthly', 'quarterly')),
  next_payout_date DATE,
  auto_payout_enabled BOOLEAN DEFAULT false,
  
  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_connected BOOLEAN DEFAULT false,
  
  -- Metadata
  last_payout_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Individual revenue transactions
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('track_sale', 'tip', 'subscription', 'event_ticket', 'merchandise', 'payout', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  creator_earnings DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Source details
  source_type TEXT, -- 'audio_track', 'event', 'profile', etc.
  source_id UUID, -- ID of the track/event/etc.
  source_title TEXT, -- Title for display purposes
  
  -- Customer details (for tracking)
  customer_email TEXT,
  customer_name TEXT,
  
  -- Stripe details
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'disputed')),
  
  -- Metadata
  transaction_date TIMESTAMP DEFAULT NOW(),
  payout_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Paid content (tracks, events, etc.)
CREATE TABLE IF NOT EXISTS paid_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content details
  content_type TEXT NOT NULL CHECK (content_type IN ('track', 'event', 'album', 'subscription')),
  content_id UUID NOT NULL, -- References audio_tracks, events, etc.
  
  -- Pricing
  price DECIMAL(8,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_free BOOLEAN DEFAULT false,
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  available_from TIMESTAMP,
  available_until TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(content_type, content_id) -- One price per content item
);

-- Tips and donations
CREATE TABLE IF NOT EXISTS creator_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tip details
  amount DECIMAL(8,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  
  -- Stripe details
  stripe_payment_intent_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Creator subscriptions (fan subscriptions)
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription details
  tier_name TEXT NOT NULL, -- 'basic', 'premium', 'vip'
  price DECIMAL(8,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Stripe subscription
  stripe_subscription_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  
  -- Dates
  started_at TIMESTAMP DEFAULT NOW(),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(creator_id, subscriber_id) -- One subscription per creator-subscriber pair
);

-- Subscription tiers for creators
CREATE TABLE IF NOT EXISTS creator_subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tier details
  tier_name TEXT NOT NULL, -- 'basic', 'premium', 'vip'
  price DECIMAL(8,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Benefits
  description TEXT,
  benefits TEXT[], -- Array of benefit descriptions
  
  -- Stripe price ID
  stripe_price_id TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(creator_id, tier_name) -- One tier per name per creator
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_creator_bank_accounts_user_id ON creator_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_revenue_user_id ON creator_revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_user_id ON revenue_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_type ON revenue_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_date ON revenue_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_paid_content_user_id ON paid_content(user_id);
CREATE INDEX IF NOT EXISTS idx_paid_content_type_id ON paid_content(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_creator_tips_creator_id ON creator_tips(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_tips_tipper_id ON creator_tips(tipper_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_creator_id ON creator_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_subscriber_id ON creator_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscription_tiers_creator_id ON creator_subscription_tiers(creator_id);

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
  -- Get user tier
  SELECT COALESCE(us.current_tier, 'free') INTO user_tier
  FROM user_upload_stats us
  WHERE us.user_id = user_uuid;
  
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

-- Function to process payout
CREATE OR REPLACE FUNCTION process_creator_payout(
  user_uuid UUID,
  payout_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL;
  bank_account_exists BOOLEAN;
BEGIN
  -- Check if user has sufficient balance
  SELECT available_balance INTO current_balance
  FROM creator_revenue
  WHERE user_id = user_uuid;
  
  IF current_balance IS NULL OR current_balance < payout_amount THEN
    RETURN false;
  END IF;
  
  -- Check if user has bank account set up
  SELECT EXISTS(SELECT 1 FROM creator_bank_accounts WHERE user_id = user_uuid AND is_verified = true)
  INTO bank_account_exists;
  
  IF NOT bank_account_exists THEN
    RETURN false;
  END IF;
  
  -- Update revenue record
  UPDATE creator_revenue
  SET 
    available_balance = available_balance - payout_amount,
    total_paid_out = total_paid_out + payout_amount,
    last_payout_at = NOW(),
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Record payout transaction
  INSERT INTO revenue_transactions (
    user_id,
    transaction_type,
    amount,
    platform_fee,
    creator_earnings,
    status,
    payout_date
  ) VALUES (
    user_uuid,
    'payout',
    -payout_amount, -- Negative amount for payout
    0.00,
    -payout_amount,
    'completed',
    NOW()
  );
  
  RETURN true;
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
    COALESCE((
      SELECT SUM(creator_earnings) 
      FROM revenue_transactions 
      WHERE user_id = user_uuid 
      AND transaction_type != 'payout'
      AND transaction_date >= date_trunc('month', CURRENT_DATE)
    ), 0) as this_month_earnings,
    COALESCE((
      SELECT SUM(creator_earnings) 
      FROM revenue_transactions 
      WHERE user_id = user_uuid 
      AND transaction_type != 'payout'
      AND transaction_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
      AND transaction_date < date_trunc('month', CURRENT_DATE)
    ), 0) as last_month_earnings,
    COALESCE((
      SELECT SUM(amount) 
      FROM creator_tips 
      WHERE creator_id = user_uuid 
      AND status = 'completed'
    ), 0) as total_tips,
    COALESCE((
      SELECT SUM(creator_earnings) 
      FROM revenue_transactions 
      WHERE user_id = user_uuid 
      AND transaction_type = 'track_sale'
      AND status = 'completed'
    ), 0) as total_track_sales,
    COALESCE((
      SELECT SUM(creator_earnings) 
      FROM revenue_transactions 
      WHERE user_id = user_uuid 
      AND transaction_type = 'subscription'
      AND status = 'completed'
    ), 0) as total_subscriptions
  FROM creator_revenue cr
  WHERE cr.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default revenue records for existing users (using a different approach)
-- First, let's insert records for users who don't have revenue records yet
INSERT INTO creator_revenue (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM creator_revenue WHERE user_id IS NOT NULL
);
