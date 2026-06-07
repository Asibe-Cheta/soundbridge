-- Backfill profiles.role for users who chose a creator onboarding type but stayed listener.
-- Sound Bridge prod only (aunxdbqukbxyyiusaeqi). Review counts before running UPDATE.

-- 1) Diagnose: creator onboarding type but listener role
SELECT
  p.id,
  u.email,
  p.username,
  p.role,
  p.onboarding_user_type,
  p.onboarding_completed,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'listener'
  AND p.onboarding_user_type IN (
    'music_creator',
    'podcast_creator',
    'industry_professional',
    'event_organiser'
  )
ORDER BY p.created_at DESC;

-- 2) Count affected users
SELECT COUNT(*) AS affected_users
FROM public.profiles
WHERE role = 'listener'
  AND onboarding_user_type IN (
    'music_creator',
    'podcast_creator',
    'industry_professional',
    'event_organiser'
  );

-- 3) Backfill (run after reviewing diagnose output)
UPDATE public.profiles
SET
  role = 'creator',
  updated_at = NOW()
WHERE role = 'listener'
  AND onboarding_user_type IN (
    'music_creator',
    'podcast_creator',
    'industry_professional',
    'event_organiser'
  );

-- 4) Fix your test account explicitly (optional)
UPDATE public.profiles p
SET role = 'creator', updated_at = NOW()
FROM auth.users u
WHERE u.id = p.id
  AND u.email = 'asibecheta2@gmail.com'
  AND p.onboarding_user_type IN (
    'music_creator',
    'podcast_creator',
    'industry_professional',
    'event_organiser'
  );

-- 5) Verify creator count after backfill
SELECT role, COUNT(*) FROM public.profiles GROUP BY role ORDER BY role;
