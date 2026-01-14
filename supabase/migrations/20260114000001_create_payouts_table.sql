-- Create payouts table for mobile app compatibility
-- This table matches the mobile team's expected schema

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  method VARCHAR(50) NOT NULL DEFAULT 'stripe' CHECK (method IN ('stripe', 'wise')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_transfer_id VARCHAR(255),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_requested_at ON payouts(requested_at DESC);

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own payouts" ON payouts;
CREATE POLICY "Users can view own payouts"
  ON payouts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Backend can insert payouts" ON payouts;
CREATE POLICY "Backend can insert payouts"
  ON payouts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Backend can update payouts" ON payouts;
CREATE POLICY "Backend can update payouts"
  ON payouts FOR UPDATE
  USING (true);
