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
BEGIN
  -- CRITICAL: Disable RLS for this function execution
  PERFORM set_config('row_security', 'off', false);
  
  -- Update the subscription by ID (primary key)
  -- Return only the columns we need (avoid user_id to prevent PostgREST issues)
  RETURN QUERY
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
  WHERE user_subscriptions.id = subscription_id
  RETURNING 
    user_subscriptions.id,
    user_subscriptions.tier,
    user_subscriptions.status,
    user_subscriptions.billing_cycle,
    user_subscriptions.stripe_customer_id,
    user_subscriptions.stripe_subscription_id,
    user_subscriptions.subscription_start_date,
    user_subscriptions.subscription_renewal_date,
    user_subscriptions.subscription_ends_at,
    user_subscriptions.money_back_guarantee_end_date,
    user_subscriptions.money_back_guarantee_eligible,
    user_subscriptions.refund_count,
    user_subscriptions.updated_at;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_subscription_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_subscription_by_id TO anon;

-- Add comment
COMMENT ON FUNCTION update_user_subscription_by_id IS 'Updates user_subscriptions by ID, bypassing PostgREST column resolution issues';
