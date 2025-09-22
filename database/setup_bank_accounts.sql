-- Complete setup for bank accounts and payout system
-- This creates all necessary tables and functions for the payout system

-- Create creator_bank_accounts table
CREATE TABLE IF NOT EXISTS creator_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bank account details (encrypted)
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL DEFAULT '', -- Encrypted account number
  routing_number_encrypted TEXT NOT NULL DEFAULT '', -- Encrypted routing number
  account_type TEXT NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings')),
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

-- Create creator_revenue table if it doesn't exist
CREATE TABLE IF NOT EXISTS creator_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Earnings breakdown
  total_earned DECIMAL(12,2) DEFAULT 0.00,
  total_paid_out DECIMAL(12,2) DEFAULT 0.00,
  pending_balance DECIMAL(12,2) DEFAULT 0.00,
  available_balance DECIMAL(12,2) DEFAULT 0.00,
  
  -- Payout settings
  minimum_payout DECIMAL(12,2) DEFAULT 10.00,
  payout_frequency TEXT DEFAULT 'weekly' CHECK (payout_frequency IN ('daily', 'weekly', 'monthly')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id) -- One revenue record per user
);

-- Create tip_analytics table if it doesn't exist
CREATE TABLE IF NOT EXISTS tip_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tip details
  tip_amount DECIMAL(12,2) NOT NULL,
  platform_fee DECIMAL(12,2) NOT NULL,
  creator_earnings DECIMAL(12,2) NOT NULL,
  fee_percentage DECIMAL(5,2) NOT NULL,
  
  -- User tiers
  tipper_tier TEXT DEFAULT 'free' CHECK (tipper_tier IN ('free', 'pro', 'enterprise')),
  
  -- Additional data
  tip_message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create creator_tips table if it doesn't exist (for backward compatibility)
CREATE TABLE IF NOT EXISTS creator_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tip details
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create revenue_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('tip', 'track_sale', 'subscription', 'payout', 'refund')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Customer information
  customer_email TEXT,
  customer_name TEXT,
  
  -- Payment details
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Timestamps
  transaction_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to existing tables
ALTER TABLE creator_revenue 
ADD COLUMN IF NOT EXISTS available_balance DECIMAL(12,2) DEFAULT 0.00;

-- Update existing records to have available_balance
UPDATE creator_revenue 
SET available_balance = COALESCE(total_earned, 0) - COALESCE(total_paid_out, 0)
WHERE available_balance IS NULL;

-- Create or replace the revenue summary function
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
      FROM tip_analytics 
      WHERE creator_id = user_uuid 
      AND status = 'completed'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) as this_month_earnings,
    COALESCE((
      SELECT SUM(creator_earnings)
      FROM tip_analytics 
      WHERE creator_id = user_uuid 
      AND status = 'completed'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    ), 0) as last_month_earnings,
    COALESCE((
      SELECT SUM(creator_earnings)
      FROM tip_analytics 
      WHERE creator_id = user_uuid 
      AND status = 'completed'
    ), 0) as total_tips,
    0.00 as total_track_sales, -- Placeholder for future track sales
    0.00 as total_subscriptions -- Placeholder for future subscriptions
  FROM creator_revenue cr
  WHERE cr.user_id = user_uuid;
  
  -- If no revenue record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create revenue record for existing users who don't have one
INSERT INTO creator_revenue (user_id, total_earned, total_paid_out, pending_balance, available_balance)
SELECT 
  u.id,
  0.00,
  0.00,
  0.00,
  0.00
FROM auth.users u
LEFT JOIN creator_revenue cr ON cr.user_id = u.id
WHERE cr.user_id IS NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON creator_bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON creator_revenue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tip_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON creator_tips TO authenticated;
GRANT SELECT, INSERT, UPDATE ON revenue_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_creator_revenue_summary(UUID) TO authenticated;

-- Enable Row Level Security (RLS)
ALTER TABLE creator_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bank account" ON creator_bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank account" ON creator_bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank account" ON creator_bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own revenue" ON creator_revenue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own revenue" ON creator_revenue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenue" ON creator_revenue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view tips they sent or received" ON tip_analytics
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = tipper_id);

CREATE POLICY "Users can insert tips they send" ON tip_analytics
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

CREATE POLICY "Users can view tips they sent or received" ON creator_tips
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = tipper_id);

CREATE POLICY "Users can insert tips they send" ON creator_tips
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

CREATE POLICY "Users can view their own transactions" ON revenue_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON revenue_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
