-- Migration: Add missing profile columns
-- Date: December 11, 2025
-- Description: Adds website, phone, genres, and experience_level columns to profiles table

-- Add website column if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add phone column if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add genres column if missing (array of text for multiple genres)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS genres TEXT[];

-- Add experience level if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('website', 'phone', 'genres', 'experience_level')
ORDER BY column_name;
