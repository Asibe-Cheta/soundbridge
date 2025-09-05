-- =====================================================
-- FIX EXISTING USERS WITHOUT PROFILES
-- =====================================================
-- This script creates profiles for existing users who don't have them

-- Insert profiles for users who don't have them yet
INSERT INTO profiles (
  id,
  username,
  display_name,
  role,
  location,
  country,
  bio,
  onboarding_completed,
  onboarding_step,
  profile_completed,
  first_action_completed,
  onboarding_skipped,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)),
  COALESCE(
    TRIM(CONCAT(
      COALESCE(au.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(au.raw_user_meta_data->>'last_name', '')
    )),
    COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1))
  ),
  COALESCE(au.raw_user_meta_data->>'role', 'listener'),
  COALESCE(au.raw_user_meta_data->>'location', 'london'),
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'location', '') ILIKE '%nigeria%' THEN 'Nigeria'
    ELSE 'UK'
  END,
  COALESCE(au.raw_user_meta_data->>'bio', ''),
  TRUE, -- Mark existing users as having completed onboarding
  'completed', -- onboarding_step
  TRUE, -- profile_completed
  TRUE, -- first_action_completed
  FALSE, -- onboarding_skipped
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND au.email_confirmed_at IS NOT NULL; -- Only confirmed users

-- Update existing profiles to have onboarding columns if they don't exist
UPDATE profiles 
SET 
  onboarding_completed = COALESCE(onboarding_completed, TRUE),
  onboarding_step = COALESCE(onboarding_step, 'completed'),
  profile_completed = COALESCE(profile_completed, TRUE),
  first_action_completed = COALESCE(first_action_completed, TRUE),
  onboarding_skipped = COALESCE(onboarding_skipped, FALSE),
  onboarding_completed_at = COALESCE(onboarding_completed_at, created_at)
WHERE onboarding_completed IS NULL;
