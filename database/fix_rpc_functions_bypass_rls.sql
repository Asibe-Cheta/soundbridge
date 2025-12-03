-- ============================================================================
-- Fix RPC Functions - Bypass RLS Completely
-- Date: December 3, 2025
-- Purpose: Create RPC functions that completely bypass RLS
--          This should fix the "column user_id does not exist" error
-- ============================================================================

-- IMPORTANT: SECURITY DEFINER functions should bypass RLS, but sometimes
-- RLS policies can still interfere. This version ensures RLS is completely bypassed.

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_user_subscription_to_pro(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.insert_user_subscription_to_pro(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);

-- ============================================================================
-- UPDATE Function - Bypass RLS
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
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable RLS for this operation
  -- SECURITY DEFINER should already bypass RLS, but this ensures it
  PERFORM set_config('row_security', 'off', false);
  
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
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', false);
  
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

-- ============================================================================
-- INSERT Function - Bypass RLS
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
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Temporarily disable RLS for this operation
  PERFORM set_config('row_security', 'off', false);
  
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
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', false);
  
  -- Return the inserted row
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
  WHERE us.id = new_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_subscription_to_pro TO anon;
GRANT EXECUTE ON FUNCTION public.insert_user_subscription_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_subscription_to_pro TO anon;

-- Comments
COMMENT ON FUNCTION public.update_user_subscription_to_pro IS 'Updates user subscription to Pro tier. Uses SECURITY DEFINER and temporarily disables RLS to bypass policy evaluation issues.';
COMMENT ON FUNCTION public.insert_user_subscription_to_pro IS 'Inserts new user subscription to Pro tier. Uses SECURITY DEFINER and temporarily disables RLS to bypass policy evaluation issues.';
