-- ============================================================================
-- Test Direct UPSERT Operation (SQL equivalent)
-- Date: December 2, 2025
-- Purpose: Test if direct SQL INSERT ... ON CONFLICT works
-- IMPORTANT: Replace 'YOUR_USER_ID' with an actual user ID
-- ============================================================================

-- This simulates what Supabase's upsert() method does
-- If this works but Supabase upsert() fails, it's a Supabase client issue

BEGIN;

-- Test the exact operation that the API is trying to do
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
  refund_count,
  updated_at
)
VALUES (
  'YOUR_USER_ID'::uuid,  -- Replace with actual user ID from auth.users
  'pro',
  'active',
  'monthly',
  'cus_test123',
  'sub_test123',
  NOW(),
  NOW() + INTERVAL '1 month',
  NOW() + INTERVAL '1 month',
  NOW() + INTERVAL '7 days',
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
  money_back_guarantee_eligible = EXCLUDED.money_back_guarantee_eligible,
  refund_count = EXCLUDED.refund_count,
  updated_at = EXCLUDED.updated_at;

-- If this works, the issue is with Supabase client's upsert() method
-- If this fails, we'll see the exact error

ROLLBACK; -- Don't commit, just test
