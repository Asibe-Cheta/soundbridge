-- ============================================================================
-- Test Direct INSERT into user_subscriptions
-- Date: December 2, 2025
-- Purpose: Test if INSERT works directly (bypassing Supabase client)
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with actual user ID
-- ============================================================================

-- Test 1: Simple INSERT (will fail if user_id already exists due to unique constraint)
-- Replace 'YOUR_USER_ID_HERE' with an actual UUID from auth.users
BEGIN;

INSERT INTO public.user_subscriptions (
  user_id,
  tier,
  status,
  billing_cycle
)
VALUES (
  'YOUR_USER_ID_HERE'::uuid,  -- Replace with actual user ID
  'pro',
  'active',
  'monthly'
);

-- If successful, rollback to not actually create the record
ROLLBACK;

-- Test 2: INSERT with ON CONFLICT (simulates upsert)
BEGIN;

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
  'YOUR_USER_ID_HERE'::uuid,  -- Replace with actual user ID
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
  0
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
  updated_at = NOW();

ROLLBACK;

-- Test 3: Check if we can see the user_id column in INSERT context
-- This query should work if the column exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
  AND column_name = 'user_id';
