-- ============================================================================
-- Fix Ambiguous user_id Column Reference in RPC Functions
-- Date: December 3, 2025
-- Purpose: Fix PostgreSQL error 42702 - column reference "user_id" is ambiguous
-- ============================================================================

-- Drop and recreate the UPDATE function with explicit column qualification
DROP FUNCTION IF EXISTS update_user_subscription_to_pro(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
);

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
DECLARE
  v_user_id UUID;
BEGIN
  -- Store parameter in local variable to avoid any ambiguity
  v_user_id := p_user_id;
  
  -- Update existing subscription with explicit table qualification
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
  WHERE public.user_subscriptions.user_id = v_user_id;
  
  -- Return the updated row with explicit table qualification
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
  WHERE public.user_subscriptions.user_id = v_user_id;
END;
$$;

-- Drop and recreate the INSERT function with explicit column qualification
DROP FUNCTION IF EXISTS insert_user_subscription_to_pro(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
);

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
  v_user_id UUID;
BEGIN
  -- Store parameter in local variable to avoid any ambiguity
  v_user_id := p_user_id;
  
  -- Insert new subscription with explicit column qualification
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
    v_user_id,
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
  
  -- Return the inserted row with explicit table qualification
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_subscription_to_pro TO anon;
GRANT EXECUTE ON FUNCTION insert_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION insert_user_subscription_to_pro TO anon;

-- Comments for documentation
COMMENT ON FUNCTION update_user_subscription_to_pro IS 'Updates user subscription to Pro tier. Uses explicit table qualification to avoid column ambiguity.';
COMMENT ON FUNCTION insert_user_subscription_to_pro IS 'Inserts new user subscription to Pro tier. Uses explicit table qualification to avoid column ambiguity.';
