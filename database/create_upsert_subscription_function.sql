-- ============================================================================
-- Create Upsert Function for user_subscriptions (Optional but Recommended)
-- Date: December 3, 2025
-- Purpose: Avoid UPDATE entirely by using INSERT with ON CONFLICT
--          This is simpler and avoids RLS UPDATE policy issues
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_user_subscription(
  p_user_id UUID,
  p_tier TEXT,
  p_status TEXT,
  p_billing_cycle TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_subscription_start_date TIMESTAMPTZ,
  p_subscription_renewal_date TIMESTAMPTZ,
  p_subscription_ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Use INSERT with ON CONFLICT to avoid UPDATE entirely
  INSERT INTO user_subscriptions (
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
    refund_count,
    updated_at
  )
  VALUES (
    p_user_id,
    p_tier,
    p_status,
    p_billing_cycle,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_subscription_start_date,
    p_subscription_renewal_date,
    p_subscription_ends_at,
    p_subscription_start_date + INTERVAL '7 days',
    true,
    0,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    tier = EXCLUDED.tier,
    status = EXCLUDED.status,
    billing_cycle = EXCLUDED.billing_cycle,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    subscription_start_date = EXCLUDED.subscription_start_date,
    subscription_renewal_date = EXCLUDED.subscription_renewal_date,
    subscription_ends_at = EXCLUDED.subscription_ends_at,
    money_back_guarantee_end_date = EXCLUDED.money_back_guarantee_end_date,
    updated_at = NOW()
  RETURNING to_jsonb(user_subscriptions.*) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION upsert_user_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_subscription TO anon;

-- Add comment
COMMENT ON FUNCTION upsert_user_subscription IS 'Upserts user subscription using INSERT with ON CONFLICT, avoiding RLS UPDATE policy issues';
