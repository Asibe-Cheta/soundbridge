-- ============================================================================
-- Create UPDATE Function for user_subscriptions (Bypass PostgREST Issues)
-- Date: December 3, 2025
-- Purpose: Direct SQL function to update subscription by ID
--          This bypasses PostgREST column resolution issues
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_subscription_by_id(
  subscription_id UUID,
  p_tier TEXT,
  p_status TEXT,
  p_billing_cycle TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_subscription_start_date TIMESTAMPTZ,
  p_subscription_renewal_date TIMESTAMPTZ,
  p_subscription_ends_at TIMESTAMPTZ,
  p_money_back_guarantee_end_date TIMESTAMPTZ,
  p_money_back_guarantee_eligible BOOLEAN,
  p_refund_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row user_subscriptions%ROWTYPE;
BEGIN
  -- Update the subscription by ID (primary key)
  UPDATE user_subscriptions
  SET
    tier = p_tier,
    status = p_status,
    billing_cycle = p_billing_cycle,
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    subscription_start_date = p_subscription_start_date,
    subscription_renewal_date = p_subscription_renewal_date,
    subscription_ends_at = p_subscription_ends_at,
    money_back_guarantee_end_date = p_money_back_guarantee_end_date,
    money_back_guarantee_eligible = p_money_back_guarantee_eligible,
    refund_count = p_refund_count,
    updated_at = NOW()
  WHERE id = subscription_id
  RETURNING * INTO updated_row;
  
  -- Return the updated row as JSONB
  RETURN to_jsonb(updated_row);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_subscription_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_subscription_by_id TO anon;

-- Add comment
COMMENT ON FUNCTION update_user_subscription_by_id IS 'Updates user_subscriptions by ID, bypassing PostgREST column resolution issues';
