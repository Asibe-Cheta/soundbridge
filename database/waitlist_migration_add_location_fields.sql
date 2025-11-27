-- Migration: Add structured location fields to waitlist table
-- Run this in Supabase SQL Editor to add country, state, and city columns

-- Step 1: Add new columns (if they don't exist)
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Step 2: Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_waitlist_country ON waitlist(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_state ON waitlist(state) WHERE state IS NOT NULL;

-- Step 3: Optional - Migrate existing location data if needed
-- If you have existing location data in the old 'location' TEXT field,
-- you can parse it and populate the new fields. This is optional.
-- Example (uncomment if needed):
-- UPDATE waitlist 
-- SET country = CASE 
--   WHEN location ILIKE '%UK%' OR location ILIKE '%United Kingdom%' THEN 'United Kingdom'
--   WHEN location ILIKE '%US%' OR location ILIKE '%United States%' THEN 'United States'
--   ELSE NULL
-- END
-- WHERE country IS NULL AND location IS NOT NULL;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'waitlist'
  AND column_name IN ('country', 'state', 'city')
ORDER BY column_name;

