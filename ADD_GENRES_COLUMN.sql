-- Add genres column to profiles table
-- This column will store user's preferred music genres as a JSON array

-- Add the genres column to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS genres JSONB DEFAULT '[]'::jsonb;

-- Add a comment to describe the column
COMMENT ON COLUMN profiles.genres IS 'Array of preferred music genres stored as JSON';

-- Create an index on the genres column for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_genres ON profiles USING GIN (genres);

-- Update RLS policies to allow users to read and write their own genres
-- (These policies should already exist, but let's make sure they cover the genres column)

-- Allow users to read their own profile including genres
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile including genres
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile including genres
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'genres';
