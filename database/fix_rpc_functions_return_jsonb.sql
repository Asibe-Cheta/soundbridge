-- ============================================================================
-- Fix RPC Functions - Return JSONB Instead of TABLE
-- Date: December 3, 2025
-- Purpose: Change RPC functions to return JSONB (single object) instead of TABLE
--          This matches the API route expectation after user's changes
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_user_subscription_to_pro(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.insert_user_subscription_to_pro(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);

-- ============================================================================
-- UPDATE Function - Return JSONB
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_user_subscription_to_pro(
  p_user_id UUID,
  p_billing_cycle TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_subscription_start_date TIMESTAMPTZ,
  p_subscription_renewal_date TIMESTAMPTZ,
  p_subscription_ends_at TIMESTAMPTZ,
  p_money_back_guarantee_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
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
  WHERE public.user_subscriptions.user_id = p_user_id;
  
  -- Return the updated row as JSONB
  SELECT to_jsonb(us.*) INTO result
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;
  
  RETURN result;
END;
$$;

-- ============================================================================
-- INSERT Function - Return JSONB
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_user_subscription_to_pro(
  p_user_id UUID,
  p_billing_cycle TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_subscription_start_date TIMESTAMPTZ,
  p_subscription_renewal_date TIMESTAMPTZ,
  p_subscription_ends_at TIMESTAMPTZ,
  p_money_back_guarantee_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  result JSONB;
BEGIN
  -- Insert new subscription
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
    p_user_id,
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
  
  -- Return the inserted row as JSONB
  SELECT to_jsonb(us.*) INTO result
  FROM public.user_subscriptions us
  WHERE us.id = new_id;
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_subscription_to_pro TO anon;
GRANT EXECUTE ON FUNCTION public.insert_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_subscription_to_pro TO anon;

-- Comments
COMMENT ON FUNCTION public.update_user_subscription_to_pro IS 'Updates user subscription to Pro tier. Returns JSONB object instead of TABLE to avoid column resolution issues.';
COMMENT ON FUNCTION public.insert_user_subscription_to_pro IS 'Inserts new user subscription to Pro tier. Returns JSONB object instead of TABLE to avoid column resolution issues.';
