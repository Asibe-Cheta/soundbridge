-- Read-only. Lists everyone who currently has any form of admin access,
-- across all three paths requireAdmin() checks (src/lib/admin-auth.ts):
-- profiles.is_admin, profiles.role, and the separate user_roles table.
-- Run this yourself and check every row -- nothing here is granted or
-- revoked automatically.

-- 1) profiles.is_admin = true
SELECT 'profiles.is_admin' AS source, p.id, u.email, p.username, p.display_name, p.is_admin, p.role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.is_admin = true
ORDER BY p.created_at;

-- 2) profiles.role in admin-tier values
SELECT 'profiles.role' AS source, p.id, u.email, p.username, p.display_name, p.is_admin, p.role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(p.role::text) IN ('admin', 'super_admin', 'moderator')
ORDER BY p.created_at;

-- 3) user_roles table
SELECT 'user_roles' AS source, p.id, u.email, p.username, p.display_name, p.is_admin, p.role, ur.role AS user_roles_role
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE lower(ur.role) IN ('admin', 'super_admin', 'moderator')
ORDER BY ur.user_id;

-- 4) Everyone with admin access via ANY of the three paths, deduplicated,
--    for a single list to review.
SELECT DISTINCT u.email, p.username, p.display_name, p.is_admin, p.role,
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND lower(ur.role) IN ('admin', 'super_admin', 'moderator')
  ) AS has_user_roles_entry
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.is_admin = true
   OR lower(p.role::text) IN ('admin', 'super_admin', 'moderator')
   OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id AND lower(ur.role) IN ('admin', 'super_admin', 'moderator')
      )
ORDER BY u.email;
