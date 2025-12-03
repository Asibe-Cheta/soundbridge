-- ============================================================================
-- Fix RPC Functions - Use RETURNS JSONB Instead of RETURNS TABLE
-- Date: December 3, 2025
-- Purpose: Fix "column user_id does not exist" error by avoiding RLS evaluation
--          on RETURN QUERY. RETURNS TABLE triggers RLS, RETURNS JSONB doesn't.
-- Based on: Claude's diagnosis - RLS + RETURNS TABLE conflict
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_user_subscription_to_pro(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.insert_user_subscription_to_pro(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);

-- ============================================================================
-- UPDATE Function - Returns JSONB
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
  result_row RECORD;
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
  WHERE public.user_subscriptions.user_id = p_user_id
  RETURNING * INTO result_row;
  
  -- Return as JSONB instead of TABLE to avoid RLS evaluation
  RETURN row_to_json(result_row)::JSONB;
END;
$$;

-- ============================================================================
-- INSERT Function - Returns JSONB
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
  result_row RECORD;
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
  RETURNING * INTO result_row;
  
  -- Return as JSONB instead of TABLE to avoid RLS evaluation
  RETURN row_to_json(result_row)::JSONB;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_subscription_to_pro TO anon;
GRANT EXECUTE ON FUNCTION public.insert_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_subscription_to_pro TO anon;

-- Comments
COMMENT ON FUNCTION public.update_user_subscription_to_pro IS 'Updates user subscription to Pro tier. Returns JSONB to avoid RLS evaluation on RETURN QUERY.';
COMMENT ON FUNCTION public.insert_user_subscription_to_pro IS 'Inserts new user subscription to Pro tier. Returns JSONB to avoid RLS evaluation on RETURN QUERY.';
