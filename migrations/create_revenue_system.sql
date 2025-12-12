-- Migration: Create Complete Revenue System
-- Date: December 11, 2025
-- Description: Creates all tables and functions needed for the Revenue Management system

-- ===================================
-- 1. REVENUE TRANSACTIONS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL, -- 'tip', 'track_sale', 'subscription', 'event_ticket', 'payout', 'refund'
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL,

  -- Related Entities
  track_id UUID REFERENCES audio_tracks(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  payer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Payment Provider Info
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'

  -- Metadata
  description TEXT,
  metadata JSONB,

  -- Timestamps
  transaction_date TIMESTAMP DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for revenue_transactions
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_user_id ON revenue_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_type ON revenue_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_date ON revenue_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_status ON revenue_transactions(payment_status);

-- ===================================
-- 2. CREATOR BANK ACCOUNTS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS creator_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Stripe Connect Account
  stripe_account_id TEXT UNIQUE,
  stripe_account_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'restricted', 'disabled'

  -- Bank Account Details (last 4 digits only for security)
  bank_name TEXT,
  account_last4 VARCHAR(4),
  account_holder_name TEXT,
  routing_number_last4 VARCHAR(4),

  -- Account Status
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'failed'

  -- Payout Settings
  payout_enabled BOOLEAN DEFAULT FALSE,
  payout_schedule VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly', 'manual'
  minimum_payout_amount DECIMAL(10, 2) DEFAULT 10.00,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  connected_at TIMESTAMP,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for creator_bank_accounts
CREATE INDEX IF NOT EXISTS idx_creator_bank_accounts_user_id ON creator_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_bank_accounts_stripe_id ON creator_bank_accounts(stripe_account_id);

-- ===================================
-- 3. CREATOR REVENUE TABLE (Summary)
-- ===================================

CREATE TABLE IF NOT EXISTS creator_revenue (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Revenue Totals
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  total_paid_out DECIMAL(10, 2) DEFAULT 0,
  available_balance DECIMAL(10, 2) DEFAULT 0,
  pending_balance DECIMAL(10, 2) DEFAULT 0,

  -- Revenue Breakdown by Source
  tips_total DECIMAL(10, 2) DEFAULT 0,
  track_sales_total DECIMAL(10, 2) DEFAULT 0,
  subscription_total DECIMAL(10, 2) DEFAULT 0,
  event_tickets_total DECIMAL(10, 2) DEFAULT 0,

  -- Statistics
  total_transactions INTEGER DEFAULT 0,
  successful_payouts INTEGER DEFAULT 0,
  failed_payouts INTEGER DEFAULT 0,

  -- Timestamps
  last_payout_date TIMESTAMP,
  next_payout_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for creator_revenue
CREATE INDEX IF NOT EXISTS idx_creator_revenue_user_id ON creator_revenue(user_id);

-- ===================================
-- 4. PAYOUT REQUESTS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Payout Details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,

  -- Stripe Info
  stripe_payout_id TEXT,
  stripe_transfer_id TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  failure_reason TEXT,

  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for payout_requests
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_date ON payout_requests(requested_at DESC);

-- ===================================
-- 5. ENABLE RLS ON ALL TABLES
-- ===================================

ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 6. RLS POLICIES
-- ===================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON revenue_transactions;
DROP POLICY IF EXISTS "Users can view own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can view own revenue" ON creator_revenue;
DROP POLICY IF EXISTS "Users can view own payout requests" ON payout_requests;

-- Revenue Transactions Policies
CREATE POLICY "Users can view own transactions"
ON revenue_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Creator Bank Accounts Policies
CREATE POLICY "Users can view own bank account"
ON creator_bank_accounts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own bank account"
ON creator_bank_accounts FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own bank account"
ON creator_bank_accounts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Creator Revenue Policies
CREATE POLICY "Users can view own revenue"
ON creator_revenue FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Payout Requests Policies
CREATE POLICY "Users can view own payout requests"
ON payout_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own payout requests"
ON payout_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ===================================
-- 7. RPC FUNCTIONS
-- ===================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_creator_revenue_summary(UUID);
DROP FUNCTION IF EXISTS process_revenue_transaction(UUID, VARCHAR, DECIMAL, VARCHAR, UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS request_payout(UUID, DECIMAL);

-- Function: Get Creator Revenue Summary
CREATE OR REPLACE FUNCTION get_creator_revenue_summary(user_uuid UUID)
RETURNS TABLE (
  total_earnings DECIMAL,
  available_balance DECIMAL,
  pending_balance DECIMAL,
  total_paid_out DECIMAL,
  tips_total DECIMAL,
  track_sales_total DECIMAL,
  subscription_total DECIMAL,
  event_tickets_total DECIMAL,
  total_transactions INTEGER,
  last_payout_date TIMESTAMP,
  next_payout_date TIMESTAMP
) AS $$
BEGIN
  -- Create revenue record if it doesn't exist
  INSERT INTO creator_revenue (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;

  -- Return revenue summary
  RETURN QUERY
  SELECT
    cr.total_earnings,
    cr.available_balance,
    cr.pending_balance,
    cr.total_paid_out,
    cr.tips_total,
    cr.track_sales_total,
    cr.subscription_total,
    cr.event_tickets_total,
    cr.total_transactions,
    cr.last_payout_date,
    cr.next_payout_date
  FROM creator_revenue cr
  WHERE cr.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function: Process Revenue Transaction
CREATE OR REPLACE FUNCTION process_revenue_transaction(
  user_uuid UUID,
  transaction_type_param VARCHAR,
  amount_param DECIMAL,
  currency_param VARCHAR DEFAULT 'USD',
  track_id_param UUID DEFAULT NULL,
  event_id_param UUID DEFAULT NULL,
  payer_id_param UUID DEFAULT NULL,
  stripe_payment_intent_id_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  platform_fee_amount DECIMAL;
  net_amount_calc DECIMAL;
  transaction_id UUID;
BEGIN
  -- Calculate platform fee (3% + $0.30)
  platform_fee_amount := (amount_param * 0.03) + 0.30;
  net_amount_calc := amount_param - platform_fee_amount;

  -- Create transaction record
  INSERT INTO revenue_transactions (
    user_id,
    transaction_type,
    amount,
    currency,
    platform_fee,
    net_amount,
    track_id,
    event_id,
    payer_id,
    stripe_payment_intent_id,
    payment_status
  ) VALUES (
    user_uuid,
    transaction_type_param,
    amount_param,
    currency_param,
    platform_fee_amount,
    net_amount_calc,
    track_id_param,
    event_id_param,
    payer_id_param,
    stripe_payment_intent_id_param,
    'completed'
  ) RETURNING id INTO transaction_id;

  -- Update creator revenue summary
  INSERT INTO creator_revenue (user_id, total_earnings, available_balance, total_transactions)
  VALUES (user_uuid, net_amount_calc, net_amount_calc, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_earnings = creator_revenue.total_earnings + net_amount_calc,
    available_balance = creator_revenue.available_balance + net_amount_calc,
    total_transactions = creator_revenue.total_transactions + 1,
    tips_total = CASE WHEN transaction_type_param = 'tip'
                 THEN creator_revenue.tips_total + net_amount_calc
                 ELSE creator_revenue.tips_total END,
    track_sales_total = CASE WHEN transaction_type_param = 'track_sale'
                        THEN creator_revenue.track_sales_total + net_amount_calc
                        ELSE creator_revenue.track_sales_total END,
    subscription_total = CASE WHEN transaction_type_param = 'subscription'
                         THEN creator_revenue.subscription_total + net_amount_calc
                         ELSE creator_revenue.subscription_total END,
    event_tickets_total = CASE WHEN transaction_type_param = 'event_ticket'
                          THEN creator_revenue.event_tickets_total + net_amount_calc
                          ELSE creator_revenue.event_tickets_total END,
    updated_at = NOW();

  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Request Payout
CREATE OR REPLACE FUNCTION request_payout(
  user_uuid UUID,
  amount_param DECIMAL
)
RETURNS UUID AS $$
DECLARE
  payout_id UUID;
  current_balance DECIMAL;
BEGIN
  -- Check available balance
  SELECT available_balance INTO current_balance
  FROM creator_revenue
  WHERE user_id = user_uuid;

  IF current_balance IS NULL OR current_balance < amount_param THEN
    RAISE EXCEPTION 'Insufficient balance for payout';
  END IF;

  -- Create payout request
  INSERT INTO payout_requests (user_id, amount, status)
  VALUES (user_uuid, amount_param, 'pending')
  RETURNING id INTO payout_id;

  -- Update creator revenue to move amount to pending
  UPDATE creator_revenue
  SET
    available_balance = available_balance - amount_param,
    pending_balance = pending_balance + amount_param,
    updated_at = NOW()
  WHERE user_id = user_uuid;

  RETURN payout_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 8. GRANT PERMISSIONS
-- ===================================

GRANT EXECUTE ON FUNCTION get_creator_revenue_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_revenue_transaction(UUID, VARCHAR, DECIMAL, VARCHAR, UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION request_payout(UUID, DECIMAL) TO authenticated;

-- ===================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_revenue_transactions_updated_at ON revenue_transactions;
DROP TRIGGER IF EXISTS update_creator_bank_accounts_updated_at ON creator_bank_accounts;
DROP TRIGGER IF EXISTS update_creator_revenue_updated_at ON creator_revenue;
DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON payout_requests;

-- Create triggers
CREATE TRIGGER update_revenue_transactions_updated_at
BEFORE UPDATE ON revenue_transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_bank_accounts_updated_at
BEFORE UPDATE ON creator_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_revenue_updated_at
BEFORE UPDATE ON creator_revenue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON payout_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- VERIFICATION QUERIES
-- ===================================

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('revenue_transactions', 'creator_bank_accounts', 'creator_revenue', 'payout_requests')
ORDER BY table_name;

-- Verify functions were created
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('get_creator_revenue_summary', 'process_revenue_transaction', 'request_payout')
ORDER BY routine_name;
