-- Wallet System Database Schema
-- This file contains the database schema for the digital wallet system

-- User Wallets Table
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'tip_received', 'tip_sent', 'payout', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  description TEXT,
  reference_id VARCHAR(255), -- External reference (Stripe payment intent, etc.)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB, -- Additional transaction data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet Withdrawal Methods Table
CREATE TABLE IF NOT EXISTS wallet_withdrawal_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('bank_transfer', 'paypal', 'crypto', 'prepaid_card')),
  method_name VARCHAR(100) NOT NULL, -- User-friendly name
  is_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  encrypted_details JSONB, -- Encrypted withdrawal method details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_methods_user_id ON wallet_withdrawal_methods(user_id);

-- RLS Policies for user_wallets
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallets" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" ON user_wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" ON user_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet transactions" ON wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for wallet_withdrawal_methods
ALTER TABLE wallet_withdrawal_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal methods" ON wallet_withdrawal_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal methods" ON wallet_withdrawal_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withdrawal methods" ON wallet_withdrawal_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own withdrawal methods" ON wallet_withdrawal_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Functions for wallet operations
CREATE OR REPLACE FUNCTION create_user_wallet(user_uuid UUID, wallet_currency VARCHAR(3) DEFAULT 'USD')
RETURNS UUID AS $$
DECLARE
  wallet_id UUID;
BEGIN
  INSERT INTO user_wallets (user_id, currency)
  VALUES (user_uuid, wallet_currency)
  ON CONFLICT (user_id, currency) DO NOTHING
  RETURNING id INTO wallet_id;
  
  -- If no new wallet was created, get the existing one
  IF wallet_id IS NULL THEN
    SELECT id INTO wallet_id FROM user_wallets WHERE user_id = user_uuid AND currency = wallet_currency;
  END IF;
  
  RETURN wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_wallet_transaction(
  user_uuid UUID,
  transaction_type VARCHAR(20),
  amount DECIMAL(10,2),
  description TEXT DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL,
  metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  wallet_id UUID;
  transaction_id UUID;
  current_balance DECIMAL(10,2);
BEGIN
  -- Get or create wallet for user
  SELECT id INTO wallet_id FROM user_wallets WHERE user_id = user_uuid AND currency = 'USD';
  
  IF wallet_id IS NULL THEN
    wallet_id := create_user_wallet(user_uuid, 'USD');
  END IF;
  
  -- Get current balance
  SELECT balance INTO current_balance FROM user_wallets WHERE id = wallet_id;
  
  -- Insert transaction
  INSERT INTO wallet_transactions (
    wallet_id, user_id, transaction_type, amount, description, reference_id, metadata
  ) VALUES (
    wallet_id, user_uuid, transaction_type, amount, description, reference_id, metadata
  ) RETURNING id INTO transaction_id;
  
  -- Update wallet balance
  UPDATE user_wallets 
  SET balance = balance + amount, updated_at = NOW()
  WHERE id = wallet_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update wallet balance when transactions are completed
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update balance if transaction status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE user_wallets 
    SET balance = balance + NEW.amount, updated_at = NOW()
    WHERE id = NEW.wallet_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance
  AFTER UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();
