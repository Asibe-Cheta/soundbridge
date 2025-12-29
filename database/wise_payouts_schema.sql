-- Wise Payouts Database Schema
-- Migration: Create table for tracking Wise payouts
-- Date: 2025-01-XX
-- Purpose: Track international payouts via Wise API

-- Create wise_payouts table
CREATE TABLE IF NOT EXISTS wise_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'GHS', 'KES', 'USD', 'GBP', 'EUR')),
  wise_transfer_id VARCHAR(255) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  recipient_account_number VARCHAR(50),
  recipient_account_name VARCHAR(255),
  recipient_bank_code VARCHAR(10),
  reference VARCHAR(255) UNIQUE NOT NULL,
  error_message TEXT,
  wise_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wise_payouts_creator_id ON wise_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_wise_payouts_wise_transfer_id ON wise_payouts(wise_transfer_id);
CREATE INDEX IF NOT EXISTS idx_wise_payouts_status ON wise_payouts(status);
CREATE INDEX IF NOT EXISTS idx_wise_payouts_created_at ON wise_payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wise_payouts_reference ON wise_payouts(reference);

-- Enable Row Level Security (RLS)
ALTER TABLE wise_payouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own Wise payouts" ON wise_payouts;
DROP POLICY IF EXISTS "Service role can manage all Wise payouts" ON wise_payouts;

-- RLS Policy: Users can only view their own payouts
CREATE POLICY "Users can view their own Wise payouts" ON wise_payouts
  FOR SELECT
  USING (auth.uid() = creator_id);

-- RLS Policy: Service role can insert/update/delete all payouts
-- This allows backend services to create and update payout records
CREATE POLICY "Service role can manage all Wise payouts" ON wise_payouts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wise_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_wise_payouts_updated_at ON wise_payouts;
CREATE TRIGGER trigger_update_wise_payouts_updated_at
  BEFORE UPDATE ON wise_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_wise_payouts_updated_at();

-- Create function to automatically set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_wise_payout_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set completed_at
DROP TRIGGER IF EXISTS trigger_set_wise_payout_completed_at ON wise_payouts;
CREATE TRIGGER trigger_set_wise_payout_completed_at
  BEFORE UPDATE ON wise_payouts
  FOR EACH ROW
  EXECUTE FUNCTION set_wise_payout_completed_at();

-- Add comments for documentation
COMMENT ON TABLE wise_payouts IS 'Tracks international payouts processed through Wise API';
COMMENT ON COLUMN wise_payouts.creator_id IS 'Reference to the creator/user receiving the payout';
COMMENT ON COLUMN wise_payouts.wise_transfer_id IS 'Unique transfer ID from Wise API';
COMMENT ON COLUMN wise_payouts.status IS 'Current status of the payout: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN wise_payouts.reference IS 'Unique internal reference for tracking the payout';
COMMENT ON COLUMN wise_payouts.wise_response IS 'Full JSON response from Wise API for debugging and audit';
COMMENT ON COLUMN wise_payouts.completed_at IS 'Timestamp when payout was completed (status = completed)';

