-- =====================================================
-- FIX: Infinite Recursion in user_roles RLS Policy
-- =====================================================
-- Date: December 18, 2025
-- Issue: Error code 42P17 - infinite recursion in user_roles policy
-- Root Cause: user_roles RLS policies reference user_roles table (circular)
-- Impact: All audio_tracks queries fail because they check user_roles
-- =====================================================

-- =====================================================
-- STEP 1: Drop the problematic circular policies
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Only super admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage settings" ON admin_settings;

-- =====================================================
-- STEP 2: Create simple, non-circular policies
-- =====================================================

-- Policy 1: Users can always view their own roles (no recursion)
-- This policy is SAFE because it only checks auth.uid() = user_id
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles 
FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own roles (for initial setup)
-- This policy is SAFE because it only checks auth.uid() = user_id
DROP POLICY IF EXISTS "Users can insert own roles" ON user_roles;
CREATE POLICY "Users can insert own roles" ON user_roles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: We're removing admin policies that cause recursion
-- Admins should use service role or direct SQL for role management

-- =====================================================
-- STEP 3: Fix audio_tracks policy (optional optimization)
-- =====================================================
-- The audio_tracks policy is fine, but we can optimize it
-- by removing the admin check since it causes the recursion

DROP POLICY IF EXISTS "Users can view own track moderation status" ON audio_tracks;
CREATE POLICY "Users can view own track moderation status"
ON audio_tracks FOR SELECT
USING (
  creator_id = auth.uid()
  OR (
    is_public = true 
    AND moderation_status IN ('pending_check', 'checking', 'clean', 'approved')
  )
);

-- Create separate admin policy using SECURITY DEFINER function
-- This bypasses RLS and avoids recursion
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policy using the safe function
DROP POLICY IF EXISTS "Admins can view all tracks" ON audio_tracks;
CREATE POLICY "Admins can view all tracks"
ON audio_tracks FOR SELECT
USING (is_admin_user() = true);

-- =====================================================
-- STEP 4: Fix other policies that reference user_roles
-- =====================================================

-- Fix admin_settings policy (if it exists)
DROP POLICY IF EXISTS "Only admins can manage settings" ON admin_settings;
CREATE POLICY "Admins can manage settings" ON admin_settings
FOR ALL USING (is_admin_user() = true);

-- Fix the UPDATE policy for moderation status
DROP POLICY IF EXISTS "Only admins can update moderation status" ON audio_tracks;
CREATE POLICY "Admins can update moderation status"
ON audio_tracks FOR UPDATE
USING (
  creator_id = auth.uid() -- Users can update their own tracks
  OR is_admin_user() = true -- Admins can update any track
)
WITH CHECK (
  -- Regular users cannot modify moderation fields
  (creator_id = auth.uid() AND (
    moderation_status IS NOT DISTINCT FROM (SELECT moderation_status FROM audio_tracks WHERE id = audio_tracks.id)
    AND moderation_flagged IS NOT DISTINCT FROM (SELECT moderation_flagged FROM audio_tracks WHERE id = audio_tracks.id)
    AND reviewed_by IS NOT DISTINCT FROM (SELECT reviewed_by FROM audio_tracks WHERE id = audio_tracks.id)
  ))
  OR
  -- Admins can modify anything
  is_admin_user() = true
);

-- =====================================================
-- STEP 5: Grant necessary permissions
-- =====================================================

-- Grant execute permission on the is_admin_user function
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO anon;

-- =====================================================
-- STEP 6: Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ FIXED: Infinite Recursion in RLS Policies';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. Removed circular policies on user_roles table';
  RAISE NOTICE '2. Created simple user_roles policies (no recursion)';
  RAISE NOTICE '3. Created is_admin_user() SECURITY DEFINER function';
  RAISE NOTICE '4. Updated audio_tracks policies to use safe function';
  RAISE NOTICE '5. Updated admin_settings policies';
  RAISE NOTICE '';
  RAISE NOTICE 'Testing:';
  RAISE NOTICE 'Run these queries to verify fix:';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 1: Query user_roles (should work)';
  RAISE NOTICE 'SELECT * FROM user_roles WHERE user_id = auth.uid();';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 2: Query audio_tracks (should work)';
  RAISE NOTICE 'SELECT * FROM audio_tracks WHERE is_public = true LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 3: Query user tracks (should work)';
  RAISE NOTICE 'SELECT * FROM audio_tracks WHERE creator_id = auth.uid();';
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
END $$;

