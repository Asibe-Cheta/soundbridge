-- ============================================================================
-- Create Function to Update Subscription (Bypass PostgREST issues)
-- Date: December 2, 2025
-- Purpose: Create a PostgreSQL function to update subscriptions
-- This bypasses PostgREST column resolution issues
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_subscription_to_pro(
  p_user_id UUID,
  p_billing_cycle TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_subscription_start_date TIMESTAMPTZ,
  p_subscription_renewal_date TIMESTAMPTZ,
  p_subscription_ends_at TIMESTAMPTZ,
  p_money_back_guarantee_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update existing subscription
  UPDATE public.user_subscriptions
  SET
    tier = 'pro',
    status = 'active',
    billing_cycle = p_billing_cycle,
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    subscription_start_date = p_subscription_start_date,
    subscription_renewal_date = p_subscription_renewal_date,
    subscription_ends_at = p_subscription_ends_at,
    money_back_guarantee_end_date = p_money_back_guarantee_end_date,
    money_back_guarantee_eligible = true,
    refund_count = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Return the updated row
  RETURN QUERY
  SELECT 
    us.id,
    us.user_id,
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
    us.created_at,
    us.updated_at
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_subscription_to_pro TO anon;

-- Comment for documentation
COMMENT ON FUNCTION update_user_subscription_to_pro IS 'Updates user subscription to Pro tier. Bypasses PostgREST column resolution issues.';
