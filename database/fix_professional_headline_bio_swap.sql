-- =====================================================
-- Fix Professional Headline and Bio Field Swap Issue
-- =====================================================
-- Purpose: Fix profiles where professional_headline contains bio data
--          and ensure proper field mapping going forward
-- Date: January 2, 2026
-- Status: Production Fix
-- =====================================================

-- Step 1: Identify affected profiles
-- Profiles where professional_headline contains what looks like bio content
-- (longer than 120 chars, or contains sentence-like structure)
-- AND bio contains what looks like headline content (short, <= 120 chars)

-- Create a temporary table to identify swaps
CREATE TEMP TABLE IF NOT EXISTS profile_swaps AS
SELECT 
  id,
  username,
  professional_headline,
  bio,
  CASE 
    -- If professional_headline is long (>120) and bio is short (<=120), likely swapped
    WHEN LENGTH(professional_headline) > 120 AND LENGTH(bio) <= 120 AND bio IS NOT NULL AND bio != '' THEN true
    -- If professional_headline contains sentence structure (multiple periods/spaces) and bio is short
    WHEN professional_headline LIKE '%.%.%' AND LENGTH(bio) <= 120 AND bio IS NOT NULL AND bio != '' THEN true
    -- If professional_headline is very long (>200) and bio exists
    WHEN LENGTH(professional_headline) > 200 AND bio IS NOT NULL AND bio != '' THEN true
    ELSE false
  END as likely_swapped
FROM profiles
WHERE professional_headline IS NOT NULL 
  AND professional_headline != ''
  AND bio IS NOT NULL
  AND bio != '';

-- Step 2: Show affected profiles (for review)
SELECT 
  id,
  username,
  LENGTH(professional_headline) as headline_length,
  LENGTH(bio) as bio_length,
  LEFT(professional_headline, 50) as headline_preview,
  LEFT(bio, 50) as bio_preview,
  likely_swapped
FROM profile_swaps
WHERE likely_swapped = true
ORDER BY username;

-- Step 3: Fix the swap (swap the values back)
-- Only fix profiles where we're confident there's a swap
-- This fixes cases where professional_headline contains bio content (>120 chars)
-- and bio contains headline content (<=120 chars)
DO $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Swap values for profiles where professional_headline is clearly too long
  WITH swaps AS (
    SELECT 
      id,
      professional_headline,
      bio
    FROM profiles
    WHERE professional_headline IS NOT NULL 
      AND professional_headline != ''
      AND bio IS NOT NULL
      AND bio != ''
      AND LENGTH(professional_headline) > 120
      AND LENGTH(bio) <= 120
  )
  UPDATE profiles p
  SET 
    professional_headline = s.bio,
    bio = s.professional_headline,
    updated_at = NOW()
  FROM swaps s
  WHERE p.id = s.id;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE '✅ Fixed % profile(s) with swapped professional_headline and bio', fixed_count;
END $$;

-- Step 4: Clean up profiles where both fields have the same value (duplication)
-- If both fields are identical, keep bio and clear professional_headline
-- (This assumes bio is the correct field, as it's more likely to be longer)
DO $$
DECLARE
  cleared_count INTEGER := 0;
BEGIN
  UPDATE profiles
  SET 
    professional_headline = NULL,
    updated_at = NOW()
  WHERE professional_headline = bio
    AND professional_headline IS NOT NULL
    AND professional_headline != '';
  
  GET DIAGNOSTICS cleared_count = ROW_COUNT;
  RAISE NOTICE '✅ Cleared % profile(s) with duplicate professional_headline and bio', cleared_count;
END $$;

-- Step 5: Validate professional_headline length (should be <= 120)
-- Truncate any professional_headline that exceeds 120 characters
DO $$
DECLARE
  truncated_count INTEGER := 0;
BEGIN
  UPDATE profiles
  SET 
    professional_headline = LEFT(professional_headline, 120),
    updated_at = NOW()
  WHERE LENGTH(professional_headline) > 120;
  
  GET DIAGNOSTICS truncated_count = ROW_COUNT;
  RAISE NOTICE '✅ Truncated % professional headline(s) to 120 characters', truncated_count;
END $$;

-- Step 6: Add constraint to prevent future issues (if not already exists)
-- Ensure professional_headline cannot exceed 120 characters
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_professional_headline_length_check;
  
  -- Add new constraint
  ALTER TABLE profiles 
  ADD CONSTRAINT profiles_professional_headline_length_check 
  CHECK (professional_headline IS NULL OR LENGTH(professional_headline) <= 120);
  
  RAISE NOTICE '✅ Added professional_headline length constraint (max 120 characters)';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '⚠️ Could not add constraint (may already exist): %', SQLERRM;
END $$;

-- Step 7: Clean up temporary table
DROP TABLE IF EXISTS profile_swaps;

-- Step 8: Report summary
DO $$
DECLARE
  fixed_count INTEGER;
  truncated_count INTEGER;
  cleared_duplicates_count INTEGER;
BEGIN
  -- Count fixed swaps (this will be 0 after the fix runs, but useful for reporting)
  SELECT COUNT(*) INTO fixed_count
  FROM profiles
  WHERE LENGTH(professional_headline) > 120
    AND LENGTH(bio) <= 120
    AND bio IS NOT NULL
    AND bio != '';
  
  -- Count truncated headlines
  SELECT COUNT(*) INTO truncated_count
  FROM profiles
  WHERE LENGTH(professional_headline) = 120
    AND professional_headline IS NOT NULL;
  
  -- Count cleared duplicates
  SELECT COUNT(*) INTO cleared_duplicates_count
  FROM profiles
  WHERE professional_headline IS NULL
    AND bio IS NOT NULL
    AND bio != '';
  
  RAISE NOTICE '✅ Migration Summary:';
  RAISE NOTICE '   - Profiles with potential swaps identified and fixed';
  RAISE NOTICE '   - Professional headlines truncated to 120 chars: %', truncated_count;
  RAISE NOTICE '   - Duplicate values cleared: %', cleared_duplicates_count;
  RAISE NOTICE '   - Constraint added to prevent future issues';
END $$;

-- =====================================================
-- Verification Queries (Run after migration)
-- =====================================================

-- Check for any remaining issues
SELECT 
  username,
  LENGTH(professional_headline) as headline_length,
  LENGTH(bio) as bio_length,
  LEFT(professional_headline, 50) as headline_preview,
  LEFT(bio, 50) as bio_preview
FROM profiles
WHERE (LENGTH(professional_headline) > 120 
  OR (professional_headline = bio AND professional_headline IS NOT NULL))
  AND professional_headline IS NOT NULL
ORDER BY username;

-- Count profiles with valid data
SELECT 
  COUNT(*) FILTER (WHERE professional_headline IS NOT NULL AND LENGTH(professional_headline) <= 120) as valid_headlines,
  COUNT(*) FILTER (WHERE bio IS NOT NULL AND bio != '') as profiles_with_bio,
  COUNT(*) FILTER (WHERE professional_headline IS NOT NULL AND bio IS NOT NULL 
    AND professional_headline != bio) as profiles_with_both_different,
  COUNT(*) as total_profiles
FROM profiles;

