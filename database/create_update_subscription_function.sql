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
  -- Update existing subscription - use fully qualified table name to avoid ambiguity
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
  WHERE public.user_subscriptions.user_id = p_user_id;
  
  -- Return the updated row - use fully qualified column names to avoid ambiguity
  RETURN QUERY
  SELECT 
    public.user_subscriptions.id,
    public.user_subscriptions.user_id,
    public.user_subscriptions.tier,
    public.user_subscriptions.status,
    public.user_subscriptions.billing_cycle,
    public.user_subscriptions.stripe_customer_id,
    public.user_subscriptions.stripe_subscription_id,
    public.user_subscriptions.subscription_start_date,
    public.user_subscriptions.subscription_renewal_date,
    public.user_subscriptions.subscription_ends_at,
    public.user_subscriptions.money_back_guarantee_end_date,
    public.user_subscriptions.money_back_guarantee_eligible,
    public.user_subscriptions.refund_count,
    public.user_subscriptions.created_at,
    public.user_subscriptions.updated_at
  FROM public.user_subscriptions
  WHERE public.user_subscriptions.user_id = p_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_subscription_to_pro TO anon;

-- Comment for documentation
COMMENT ON FUNCTION update_user_subscription_to_pro IS 'Updates user subscription to Pro tier. Bypasses PostgREST column resolution issues.';
