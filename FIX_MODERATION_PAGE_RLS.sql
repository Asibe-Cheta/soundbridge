-- ============================================================================
-- PROPER FIX: Admin Moderation Page RLS Policy
-- ============================================================================
-- Date: December 22, 2025
-- Issue: /admin/moderation fails due to circular RLS policy on user_roles
-- Root Cause: RLS policy queries user_roles to check if user can view user_roles
-- Solution: Remove circular reference, keep only simple policy
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop the problematic circular policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Only super admins can manage user roles" ON user_roles;

-- ============================================================================
-- STEP 2: Keep only the simple, non-circular policy
-- ============================================================================

-- Users can ALWAYS view their own roles (no recursion)
-- This is SAFE because it only checks: auth.uid() = user_id
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles 
FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Allow authenticated users to insert their own roles
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own roles" ON user_roles;
CREATE POLICY "Users can insert own roles" ON user_roles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test: This should return your admin role
SELECT * FROM user_roles 
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com'
);

-- Verify policies (should only show 2 simple policies)
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'user_roles';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies fixed - removed circular reference';
    RAISE NOTICE '✅ user_roles table now uses simple policies only';
    RAISE NOTICE '✅ /admin/moderation should now work';
    RAISE NOTICE '🔄 Please refresh the page after running this';
END $$;

