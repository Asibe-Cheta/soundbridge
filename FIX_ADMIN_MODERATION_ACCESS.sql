-- ============================================================================
-- FIX: Admin Moderation Panel Access for asibechetachukwu@gmail.com
-- ============================================================================
-- Date: December 22, 2025
-- Issue: /admin/moderation not letting user log in despite being admin
-- Other admin pages (/admin/dashboard, /admin/copyright) work fine
-- Root Cause: Missing entry in user_roles table
-- ============================================================================

-- Step 1: Check if user_roles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
);

-- Step 2: Find the user ID for asibechetachukwu@gmail.com
SELECT 
    u.id as user_id,
    u.email,
    p.display_name,
    p.role as profile_role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'asibechetachukwu@gmail.com';

-- Step 3: Check current roles in user_roles table
SELECT ur.*, u.email
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'asibechetachukwu@gmail.com';

-- Step 4: Insert admin role if missing
-- Replace 'USER_ID_HERE' with actual UUID from Step 2
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
    u.id,
    'admin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'asibechetachukwu@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Verify the fix
SELECT 
    u.email,
    ur.role,
    ur.created_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'asibechetachukwu@gmail.com';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all admin users
SELECT 
    u.email,
    ur.role,
    ur.created_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role IN ('admin', 'super_admin', 'moderator')
ORDER BY ur.created_at DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Admin access fixed for asibechetachukwu@gmail.com';
    RAISE NOTICE '✅ User can now access /admin/moderation';
    RAISE NOTICE '🔄 Please log out and log back in to refresh session';
END $$;

