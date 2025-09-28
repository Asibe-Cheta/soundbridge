-- =====================================================
-- DEEP RLS INVESTIGATION - STRIPE CONNECT FAILURE
-- =====================================================
-- This will help us understand exactly why RLS is still failing

-- STEP 1: Check the EXACT RLS policy conditions
SELECT 
  'CURRENT RLS POLICIES' as check_type,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'creator_bank_accounts'
ORDER BY cmd, policyname;

-- STEP 2: Test the exact auth conditions that our policy checks
SELECT 
  'AUTH CONDITION TEST' as check_type,
  auth.uid() as current_auth_uid,
  (auth.jwt() ->> 'sub')::uuid as current_jwt_sub,
  'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid as target_user_id,
  
  -- Test the exact conditions from our RLS policy
  (auth.uid() = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid) as uid_condition_passes,
  ((auth.jwt() ->> 'sub')::uuid = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid) as jwt_condition_passes,
  
  -- Test the combined OR condition (this should be TRUE for insert to work)
  (auth.uid() = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid 
   OR 
   (auth.jwt() ->> 'sub')::uuid = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid) as combined_condition_passes;

-- STEP 3: Check if there are any other constraints or triggers
SELECT 
  'TABLE CONSTRAINTS' as check_type,
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'creator_bank_accounts';

-- STEP 4: Check for any triggers that might interfere
SELECT 
  'TRIGGERS CHECK' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'creator_bank_accounts';

-- STEP 5: Test a simple insert with minimal data to see exact error
-- (This will likely fail but show us the exact failure point)
-- UNCOMMENT THE NEXT SECTION TO TEST:
/*
DO $$
BEGIN
  BEGIN
    INSERT INTO creator_bank_accounts (
      user_id,
      stripe_account_id,
      account_status,
      created_at,
      updated_at
    ) VALUES (
      'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid,
      'test_account_' || extract(epoch from now())::text,
      'pending',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'SUCCESS: Insert worked! The issue is not with RLS policies.';
    
    -- Clean up the test record
    DELETE FROM creator_bank_accounts 
    WHERE stripe_account_id LIKE 'test_account_%';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAILED: Insert failed with error: %', SQLERRM;
  END;
END $$;
*/

-- STEP 6: Check if RLS is actually enabled and working
SELECT 
  'RLS ENABLED CHECK' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN 'RLS is ENABLED - policies will be enforced'
    ELSE 'RLS is DISABLED - policies will be ignored'
  END as status_explanation
FROM pg_tables 
WHERE tablename = 'creator_bank_accounts';

-- STEP 7: Check current user context and permissions
SELECT 
  'USER CONTEXT' as check_type,
  current_user as current_database_user,
  session_user as session_database_user,
  current_setting('role') as current_role;
