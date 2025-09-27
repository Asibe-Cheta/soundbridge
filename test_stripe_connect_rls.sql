-- Test script to verify Stripe Connect RLS policies work correctly
-- Run this after applying the RLS fix to test the policies

-- Test 1: Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'creator_bank_accounts';

-- Test 2: List all policies for creator_bank_accounts
SELECT 
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'creator_bank_accounts'
ORDER BY policyname;

-- Test 3: Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'creator_bank_accounts' 
  AND grantee = 'authenticated';

-- Test 4: Verify auth functions work (this will show current auth context)
SELECT 
  auth.uid() as current_auth_uid,
  auth.role() as current_auth_role,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'Authenticated'
    ELSE 'Not authenticated'
  END as auth_status;

-- Test 5: Check if table structure is correct
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'creator_bank_accounts'
ORDER BY ordinal_position;

-- Success message
SELECT 'RLS policy test completed. Check results above.' as test_status;
