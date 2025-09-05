-- =====================================================
-- FIX PROFILE CREATION TRIGGER
-- =====================================================
-- This script fixes the automatic profile creation trigger
-- to work with the current profiles table structure

-- First, drop the existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a new function that properly handles profile creation
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'listener'),
    COALESCE(NEW.raw_user_meta_data->>'location', 'london'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'location', '') ILIKE '%nigeria%' THEN 'Nigeria'
      ELSE 'UK'
    END,
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    FALSE, -- onboarding_completed
    'role_selection', -- onboarding_step
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

-- Create the trigger to automatically create profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
