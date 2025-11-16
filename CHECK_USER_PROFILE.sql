-- Check if the profile exists for the user having issues
-- User ID from logs: 295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce

SELECT 
    id,
    username,
    display_name,
    role,
    bio,
    location,
    country,
    avatar_url,
    collaboration_enabled,
    auto_decline_unavailable,
    social_links,
    onboarding_completed,
    onboarding_step,
    profile_completed,
    created_at,
    updated_at
FROM profiles
WHERE id = '295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce';

-- Also check if RLS is blocking
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
WHERE tablename = 'profiles'
ORDER BY policyname;

