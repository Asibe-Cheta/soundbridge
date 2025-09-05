-- =====================================================
-- COMPLETE ONBOARDING FIX
-- =====================================================
-- This script fixes all onboarding-related issues:
-- 1. Fixes the profile creation trigger
-- 2. Creates profiles for existing users
-- 3. Ensures all onboarding columns exist

-- Step 1: Add onboarding columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'role_selection',
ADD COLUMN IF NOT EXISTS selected_role TEXT, -- This stores the onboarding role (musician, podcaster, etc.)
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_action_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);

-- Step 3: Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 4: Create a new function that properly handles profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with all required fields and onboarding defaults
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
    selected_role,
    profile_completed,
    first_action_completed,
    onboarding_skipped,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(
      TRIM(CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      )),
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    ),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'listener') IN ('musician', 'podcaster', 'event_promoter') THEN 'creator'::user_role
      ELSE 'listener'::user_role
    END,
    COALESCE(NEW.raw_user_meta_data->>'location', 'london'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'location', '') ILIKE '%nigeria%' THEN 'Nigeria'
      ELSE 'UK'
    END,
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    FALSE, -- onboarding_completed
    'role_selection', -- onboarding_step
    COALESCE(NEW.raw_user_meta_data->>'role', 'listener'), -- selected_role (stores the onboarding role)
    FALSE, -- profile_completed
    FALSE, -- first_action_completed
    FALSE, -- onboarding_skipped
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the trigger to automatically create profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 6: Create profiles for existing users who don't have them
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
  selected_role,
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
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'role', 'listener') IN ('musician', 'podcaster', 'event_promoter') THEN 'creator'::user_role
    ELSE 'listener'::user_role
  END,
  COALESCE(au.raw_user_meta_data->>'location', 'london'),
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'location', '') ILIKE '%nigeria%' THEN 'Nigeria'
    ELSE 'UK'
  END,
  COALESCE(au.raw_user_meta_data->>'bio', ''),
  TRUE, -- Mark existing users as having completed onboarding
  'completed', -- onboarding_step
  COALESCE(au.raw_user_meta_data->>'role', 'listener'), -- selected_role
  TRUE, -- profile_completed
  TRUE, -- first_action_completed
  FALSE, -- onboarding_skipped
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND au.email_confirmed_at IS NOT NULL; -- Only confirmed users

-- Step 7: Update existing profiles to have onboarding columns if they don't exist
UPDATE profiles 
SET 
  onboarding_completed = COALESCE(onboarding_completed, TRUE),
  onboarding_step = COALESCE(onboarding_step, 'completed'),
  profile_completed = COALESCE(profile_completed, TRUE),
  first_action_completed = COALESCE(first_action_completed, TRUE),
  onboarding_skipped = COALESCE(onboarding_skipped, FALSE),
  onboarding_completed_at = COALESCE(onboarding_completed_at, created_at)
WHERE onboarding_completed IS NULL;

-- Step 8: Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- Step 9: Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Step 10: Create storage policies for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Success message
SELECT 'Onboarding fix completed successfully!' as status;
