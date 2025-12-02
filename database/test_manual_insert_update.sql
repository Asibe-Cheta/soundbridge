-- ============================================================================
-- Test Manual INSERT/UPDATE Operations
-- Date: December 2, 2025
-- Purpose: Test if INSERT/UPDATE works directly (bypassing upsert)
-- Status: Diagnostic Script
-- ============================================================================

-- ============================================================================
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with an actual user ID from auth.users
-- ============================================================================

-- ============================================================================
-- Test 1: Direct INSERT (as authenticated user would)
-- ============================================================================
-- This simulates what the API is trying to do
-- Note: You'll need to run this as the authenticated role or with proper permissions

BEGIN;

-- Test INSERT with all required columns
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

-- If the above works, the issue might be with Supabase client's upsert method
-- If it fails, we'll see the exact error

ROLLBACK; -- Don't actually commit, just test

-- ============================================================================
-- Test 2: Check if the issue is with the ON CONFLICT clause
-- ============================================================================
-- Try without ON CONFLICT to see if basic INSERT works

BEGIN;

INSERT INTO public.user_subscriptions (
  user_id,
  tier,
  status
)
VALUES (
  'YOUR_USER_ID_HERE'::uuid,  -- Replace with actual user ID
  'pro',
  'active'
);

ROLLBACK;

-- ============================================================================
-- Test 3: Check column visibility
-- ============================================================================
-- Verify we can see the user_id column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
  AND column_name = 'user_id';

-- ============================================================================
-- Test 4: Check RLS policies are allowing INSERT
-- ============================================================================
-- This will show if RLS is blocking the operation
SET ROLE authenticated;

BEGIN;

-- Try to insert as authenticated role
INSERT INTO public.user_subscriptions (
  user_id,
  tier,
  status
)
VALUES (
  auth.uid(),  -- Use current authenticated user's ID
  'pro',
  'active'
);

ROLLBACK;

RESET ROLE;
