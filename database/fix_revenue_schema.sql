-- Fix for revenue schema issues
-- This ensures the creator_revenue table exists with the correct structure

-- Add missing columns to existing creator_revenue table
ALTER TABLE creator_revenue 
ADD COLUMN IF NOT EXISTS available_balance DECIMAL(12,2) DEFAULT 0.00;

-- Update existing records to have available_balance
UPDATE creator_revenue 
SET available_balance = COALESCE(total_earned, 0) - COALESCE(total_paid_out, 0)
WHERE available_balance IS NULL;

-- Create creator_revenue table if it doesn't exist (with all columns)
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
GRANT SELECT ON creator_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION get_creator_revenue_summary(UUID) TO authenticated;
