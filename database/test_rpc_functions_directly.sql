-- ============================================================================
-- Test RPC Functions Directly
-- Purpose: Test if the RPC functions work correctly with direct SQL calls
-- ============================================================================

-- Test 1: Check if functions exist
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('update_user_subscription_to_pro', 'insert_user_subscription_to_pro')
ORDER BY p.proname;

-- Test 2: Try calling UPDATE function with a test user_id
-- Replace 'YOUR_USER_ID_HERE' with an actual user_id from your database
DO $$
DECLARE
  test_user_id UUID := 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'; -- Replace with actual user_id
  result RECORD;
BEGIN
  -- Try UPDATE function
  SELECT * INTO result FROM update_user_subscription_to_pro(
    test_user_id,
    'monthly',
    'cus_test123',
    'sub_test123',
    NOW(),
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '7 days'
  ) LIMIT 1;
  
  RAISE NOTICE 'UPDATE function succeeded. Result: %', result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'UPDATE function failed: % - %', SQLSTATE, SQLERRM;
END $$;

-- Test 3: Try calling INSERT function (only if user doesn't have subscription)
-- This will fail if user already has subscription due to unique constraint
DO $$
DECLARE
  test_user_id UUID := 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'; -- Replace with actual user_id
  result RECORD;
  user_has_subscription BOOLEAN;
BEGIN
  -- Check if user has subscription
  SELECT EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id = test_user_id) INTO user_has_subscription;
  
  IF user_has_subscription THEN
    RAISE NOTICE 'User already has subscription, skipping INSERT test';
  ELSE
    -- Try INSERT function
    SELECT * INTO result FROM insert_user_subscription_to_pro(
      test_user_id,
      'monthly',
      'cus_test123',
      'sub_test123',
      NOW(),
      NOW() + INTERVAL '1 month',
      NOW() + INTERVAL '1 month',
      NOW() + INTERVAL '7 days'
    ) LIMIT 1;
    
    RAISE NOTICE 'INSERT function succeeded. Result: %', result;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'INSERT function failed: % - %', SQLSTATE, SQLERRM;
END $$;
