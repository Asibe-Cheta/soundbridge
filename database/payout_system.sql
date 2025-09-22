-- Payout System Database Schema
-- This script creates tables and functions for managing creator payout requests

-- Create payout requests table
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 25.00), -- Minimum $25 withdrawal
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'failed')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  stripe_transfer_id VARCHAR(255), -- Stripe transfer/payout ID
  bank_account_id UUID REFERENCES creator_bank_accounts(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payout history table (for completed payouts)
CREATE TABLE IF NOT EXISTS payout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id UUID REFERENCES payout_requests(id),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  stripe_payout_id VARCHAR(255),
  bank_account_details JSONB, -- Store bank account info at time of payout
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payout_requests_creator_id ON payout_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at ON payout_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_payout_history_creator_id ON payout_history(creator_id);

-- Create RLS policies
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payout requests" ON payout_requests;
DROP POLICY IF EXISTS "Users can create their own payout requests" ON payout_requests;
DROP POLICY IF EXISTS "Users can view their own payout history" ON payout_history;

-- RLS Policies for payout_requests
CREATE POLICY "Users can view their own payout requests" ON payout_requests
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create their own payout requests" ON payout_requests
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own pending payout requests" ON payout_requests
  FOR UPDATE USING (auth.uid() = creator_id AND status = 'pending');

-- RLS Policies for payout_history
CREATE POLICY "Users can view their own payout history" ON payout_history
  FOR SELECT USING (auth.uid() = creator_id);

-- Function to check if creator has sufficient balance for payout
CREATE OR REPLACE FUNCTION check_sufficient_balance(
  p_creator_id UUID,
  p_amount DECIMAL(10,2)
) RETURNS BOOLEAN AS $$
DECLARE
  available_balance DECIMAL(10,2);
BEGIN
  -- Get available balance from creator_revenue table
  SELECT COALESCE(available_balance, 0) INTO available_balance
  FROM creator_revenue 
  WHERE user_id = p_creator_id;
  
  -- Return true if balance is sufficient
  RETURN available_balance >= p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get creator's payout eligibility
CREATE OR REPLACE FUNCTION get_payout_eligibility(
  p_creator_id UUID
) RETURNS JSON AS $$
DECLARE
  available_balance DECIMAL(10,2);
  pending_requests DECIMAL(10,2);
  min_payout DECIMAL(10,2) := 25.00;
  result JSON;
BEGIN
  -- Get available balance
  SELECT COALESCE(available_balance, 0) INTO available_balance
  FROM creator_revenue 
  WHERE user_id = p_creator_id;
  
  -- Get pending payout requests
  SELECT COALESCE(SUM(amount), 0) INTO pending_requests
  FROM payout_requests 
  WHERE creator_id = p_creator_id 
    AND status IN ('pending', 'approved', 'processing');
  
  -- Build result
  result := json_build_object(
    'available_balance', available_balance,
    'pending_requests', pending_requests,
    'min_payout', min_payout,
    'can_request_payout', (available_balance - pending_requests) >= min_payout,
    'withdrawable_amount', GREATEST(0, available_balance - pending_requests)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a payout request
CREATE OR REPLACE FUNCTION create_payout_request(
  p_amount DECIMAL(10,2),
  p_currency VARCHAR(3) DEFAULT 'USD'
) RETURNS JSON AS $$
DECLARE
  creator_id UUID;
  eligibility JSON;
  request_id UUID;
  result JSON;
BEGIN
  -- Get current user
  creator_id := auth.uid();
  
  IF creator_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check minimum amount
  IF p_amount < 25.00 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal amount is $25.00');
  END IF;
  
  -- Check eligibility
  eligibility := get_payout_eligibility(creator_id);
  
  IF NOT (eligibility->>'can_request_payout')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient balance or pending requests',
      'eligibility', eligibility
    );
  END IF;
  
  -- Check if user has a bank account
  IF NOT EXISTS (
    SELECT 1 FROM creator_bank_accounts 
    WHERE user_id = creator_id AND is_verified = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No verified bank account found');
  END IF;
  
  -- Create payout request
  INSERT INTO payout_requests (creator_id, amount, currency)
  VALUES (creator_id, p_amount, p_currency)
  RETURNING id INTO request_id;
  
  RETURN json_build_object(
    'success', true,
    'request_id', request_id,
    'message', 'Payout request created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get creator's payout requests
CREATE OR REPLACE FUNCTION get_creator_payout_requests(
  p_creator_id UUID
) RETURNS TABLE (
  id UUID,
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  status VARCHAR(20),
  requested_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  rejection_reason TEXT
) AS $$
BEGIN
  -- Check if user is requesting their own data
  IF p_creator_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    pr.id,
    pr.amount,
    pr.currency,
    pr.status,
    pr.requested_at,
    pr.processed_at,
    pr.completed_at,
    pr.admin_notes,
    pr.rejection_reason
  FROM payout_requests pr
  WHERE pr.creator_id = p_creator_id
  ORDER BY pr.requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update payout request status (admin only)
CREATE OR REPLACE FUNCTION update_payout_status(
  p_request_id UUID,
  p_status VARCHAR(20),
  p_admin_notes TEXT DEFAULT NULL,
  p_stripe_transfer_id VARCHAR(255) DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  creator_id UUID;
  amount DECIMAL(10,2);
  result JSON;
BEGIN
  -- Get request details
  SELECT pr.creator_id, pr.amount INTO creator_id, amount
  FROM payout_requests pr
  WHERE pr.id = p_request_id;
  
  IF creator_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Payout request not found');
  END IF;
  
  -- Update the request
  UPDATE payout_requests 
  SET 
    status = p_status,
    admin_notes = p_admin_notes,
    stripe_transfer_id = p_stripe_transfer_id,
    rejection_reason = p_rejection_reason,
    processed_at = CASE WHEN p_status IN ('approved', 'processing', 'rejected') THEN NOW() ELSE processed_at END,
    completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- If completed, create history record
  IF p_status = 'completed' THEN
    INSERT INTO payout_history (payout_request_id, creator_id, amount, stripe_payout_id)
    VALUES (p_request_id, creator_id, amount, p_stripe_transfer_id);
    
    -- Update creator revenue (deduct the paid amount)
    UPDATE creator_revenue 
    SET 
      available_balance = available_balance - amount,
      total_paid_out = COALESCE(total_paid_out, 0) + amount,
      updated_at = NOW()
    WHERE user_id = creator_id;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Payout status updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional - for testing)
-- This will only insert if no payout requests exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM payout_requests LIMIT 1) THEN
    -- You can add sample data here if needed for testing
    NULL;
  END IF;
END $$;
