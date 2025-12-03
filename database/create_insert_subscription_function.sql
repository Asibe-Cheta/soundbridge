-- ============================================================================
-- Create Function to Insert Subscription (Bypass PostgREST issues)
-- Date: December 2, 2025
-- Purpose: Create a PostgreSQL function to insert subscriptions
-- This bypasses PostgREST column resolution issues for INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_user_subscription_to_pro(
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
DECLARE
  new_id UUID;
BEGIN
  -- Insert new subscription
  -- Use explicit table qualification to avoid ambiguity
  INSERT INTO public.user_subscriptions (
    user_id,
    tier,
    status,
    billing_cycle,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_start_date,
    subscription_renewal_date,
    subscription_ends_at,
    money_back_guarantee_end_date,
    money_back_guarantee_eligible,
    refund_count
  )
  VALUES (
    p_user_id,  -- Function parameter, not ambiguous
    'pro',
    'active',
    p_billing_cycle,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_subscription_start_date,
    p_subscription_renewal_date,
    p_subscription_ends_at,
    p_money_back_guarantee_end_date,
    true,
    0
  )
  RETURNING public.user_subscriptions.id INTO new_id;
  
  -- Return the inserted row - use fully qualified column names to avoid ambiguity
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
  WHERE public.user_subscriptions.id = new_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION insert_user_subscription_to_pro TO anon;

-- Comment for documentation
COMMENT ON FUNCTION insert_user_subscription_to_pro IS 'Inserts new user subscription to Pro tier. Bypasses PostgREST column resolution issues for INSERT.';
