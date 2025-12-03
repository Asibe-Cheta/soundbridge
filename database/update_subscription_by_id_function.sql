-- ============================================================================
-- Create UPDATE Function for user_subscriptions (Bypass PostgREST Issues)
-- Date: December 3, 2025
-- Purpose: Direct SQL function to update subscription by ID
--          This bypasses PostgREST column resolution issues
--          CRITICAL: Explicitly disable RLS during function execution
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
RETURNS TABLE (
  id UUID,
  tier TEXT,
  status TEXT,
  billing_cycle TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_renewal_date TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  money_back_guarantee_end_date TIMESTAMPTZ,
  money_back_guarantee_eligible BOOLEAN,
  refund_count INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  -- CRITICAL: Disable RLS for this function execution
  PERFORM set_config('row_security', 'off', false);
  
  -- Update the subscription by ID (primary key) using direct SQL
  -- Use EXECUTE with dynamic SQL to ensure no PostgREST interference
  EXECUTE format('
    UPDATE %I.user_subscriptions
    SET
      tier = $1,
      status = $2,
      billing_cycle = $3,
      stripe_customer_id = $4,
      stripe_subscription_id = $5,
      subscription_start_date = $6,
      subscription_renewal_date = $7,
      subscription_ends_at = $8,
      money_back_guarantee_end_date = $9,
      money_back_guarantee_eligible = $10,
      refund_count = $11,
      updated_at = NOW()
    WHERE id = $12
    RETURNING id
  ', 'public')
  USING 
    p_tier,
    p_status,
    p_billing_cycle,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_subscription_start_date,
    p_subscription_renewal_date,
    p_subscription_ends_at,
    p_money_back_guarantee_end_date,
    p_money_back_guarantee_eligible,
    p_refund_count,
    subscription_id
  INTO result_id;
  
  -- Now select the updated row (RLS is disabled, so this should work)
  RETURN QUERY
  SELECT 
    us.id,
    us.tier,
    us.status,
    us.billing_cycle,
    us.stripe_customer_id,
    us.stripe_subscription_id,
    us.subscription_start_date,
    us.subscription_renewal_date,
    us.subscription_ends_at,
    us.money_back_guarantee_end_date,
    us.money_back_guarantee_eligible,
    us.refund_count,
    us.updated_at
  FROM user_subscriptions us
  WHERE us.id = result_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_subscription_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_subscription_by_id TO anon;

-- Add comment
COMMENT ON FUNCTION update_user_subscription_by_id IS 'Updates user_subscriptions by ID, bypassing PostgREST column resolution issues';
