-- =====================================================
-- VERIFY DATABASE CHANGES APPLIED CORRECTLY
-- =====================================================
-- Run this to verify if our previous fixes actually worked

-- STEP 1: Check if user role was actually changed
SELECT 
  'USER ROLE CHECK' as check_type,
  id,
  username,
  display_name,
  role,
  updated_at
FROM profiles 
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- STEP 2: Check if RLS policies exist and are correct
SELECT 
  'RLS POLICIES CHECK' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'creator_bank_accounts'
ORDER BY policyname;

-- STEP 3: Check if the creator_bank_accounts table exists and structure
SELECT 
  'TABLE STRUCTURE CHECK' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'creator_bank_accounts'
ORDER BY ordinal_position;

-- STEP 4: Check if RLS is enabled on the table
SELECT 
  'RLS STATUS CHECK' as check_type,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'creator_bank_accounts';

-- STEP 5: Test auth functions with your specific user ID
SELECT 
  'AUTH FUNCTIONS TEST' as check_type,
  auth.uid() as current_user_id,
  (auth.jwt() ->> 'sub')::uuid as jwt_user_id,
  'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid as target_user_id,
  auth.uid() = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid as uid_matches,
  (auth.jwt() ->> 'sub')::uuid = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid as jwt_matches;

-- STEP 6: Check if there are any existing records that might conflict
SELECT 
  'EXISTING RECORDS CHECK' as check_type,
  count(*) as existing_records,
  array_agg(user_id) as user_ids
FROM creator_bank_accounts 
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- STEP 7: Try a test insert (this might fail, but will show us the exact error)
-- Uncomment this if you want to test, but it might create a dummy record
/*
INSERT INTO creator_bank_accounts (
  user_id,
  stripe_account_id,
  account_status,
  created_at,
  updated_at
) VALUES (
  'bd8a455d-a54d-45c5-968d-e4cf5e8d928e',
  'test_account_123',
  'pending',
  NOW(),
  NOW()
);
*/
