-- Fix RLS Policies for creator_bank_accounts Table
-- This script fixes the "new row violates row-level security policy" error
-- for Stripe Connect account creation from mobile app with Bearer token auth

-- First, let's check if the table exists and has RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'creator_bank_accounts';

-- Enable RLS on creator_bank_accounts table (if not already enabled)
ALTER TABLE creator_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank account" ON creator_bank_accounts;

-- Create comprehensive RLS policies that work with both cookie and Bearer token auth
-- SELECT policy - users can view their own bank account
CREATE POLICY "Users can view their own bank account" ON creator_bank_accounts
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

-- INSERT policy - users can insert their own bank account
-- This is the critical policy for Stripe Connect account creation
CREATE POLICY "Users can insert their own bank account" ON creator_bank_accounts
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

-- UPDATE policy - users can update their own bank account
CREATE POLICY "Users can update their own bank account" ON creator_bank_accounts
  FOR UPDATE 
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

-- DELETE policy - users can delete their own bank account
CREATE POLICY "Users can delete their own bank account" ON creator_bank_accounts
  FOR DELETE 
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'sub')::uuid = user_id
  );

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_bank_accounts TO authenticated;

-- Verify the policies were created
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
WHERE tablename = 'creator_bank_accounts'
ORDER BY policyname;

-- Test query to verify auth context (run this to debug if needed)
-- SELECT 
--   auth.uid() as auth_uid,
--   auth.jwt() ->> 'sub' as jwt_sub,
--   (auth.jwt() ->> 'sub')::uuid as jwt_sub_uuid,
--   auth.role() as auth_role;

-- Success message
SELECT 'creator_bank_accounts RLS policies fixed successfully! Mobile app Bearer token auth should now work.' as status;
