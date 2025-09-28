-- =====================================================
-- URGENT DATABASE FIXES FOR STRIPE CONNECT
-- =====================================================
-- Run this ENTIRE script in your Supabase SQL Editor
-- This will fix both the user role AND the RLS policies

-- STEP 1: Fix your user role (change from listener to creator)
UPDATE profiles 
SET 
  role = 'creator',
  updated_at = NOW()
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- STEP 2: Verify the role change
SELECT 
  id,
  username,
  display_name,
  role,
  bio,
  location,
  updated_at
FROM profiles 
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- STEP 3: Drop existing RLS policies for creator_bank_accounts
DROP POLICY IF EXISTS "Users can insert their own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON creator_bank_accounts;

-- STEP 4: Create comprehensive RLS policies that work with Bearer tokens
CREATE POLICY "Users can insert their own bank account" ON creator_bank_accounts
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

CREATE POLICY "Users can view their own bank accounts" ON creator_bank_accounts
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

CREATE POLICY "Users can update their own bank accounts" ON creator_bank_accounts
  FOR UPDATE 
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

CREATE POLICY "Users can delete their own bank accounts" ON creator_bank_accounts
  FOR DELETE 
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

-- STEP 5: Verify RLS policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'creator_bank_accounts';

-- STEP 6: Test the auth functions
SELECT 
  auth.uid() as current_user_id,
  (auth.jwt() ->> 'sub')::uuid as jwt_user_id,
  'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid as target_user_id,
  auth.uid() = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid as uid_match,
  (auth.jwt() ->> 'sub')::uuid = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'::uuid as jwt_match;

-- STEP 7: Final verification - check user profile
SELECT 
  id,
  username,
  display_name,
  role,
  onboarding_completed,
  profile_completed,
  updated_at
FROM profiles 
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- SUCCESS MESSAGE
SELECT 'DATABASE FIXES COMPLETED! Your user is now a creator and RLS policies are updated.' as status;
