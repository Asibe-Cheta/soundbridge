-- ============================================================
-- ADD REPOSTED_FROM_ID COLUMN TO POSTS TABLE
-- ============================================================
-- Date: December 19, 2025
-- Purpose: Enable repost indicator feature
-- 
-- This migration adds a column to track which post was reposted,
-- allowing the UI to display "User X reposted" indicators.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- This script is idempotent (safe to run multiple times)
-- ============================================================

-- Step 1: Add the reposted_from_id column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'reposted_from_id'
  ) THEN
    ALTER TABLE posts 
    ADD COLUMN reposted_from_id UUID REFERENCES posts(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Column reposted_from_id added successfully';
  ELSE
    RAISE NOTICE 'Column reposted_from_id already exists';
  END IF;
END $$;

-- Step 2: Add index for better query performance (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'posts' 
    AND indexname = 'idx_posts_reposted_from_id'
  ) THEN
    CREATE INDEX idx_posts_reposted_from_id 
    ON posts(reposted_from_id) 
    WHERE reposted_from_id IS NOT NULL;
    
    RAISE NOTICE 'Index idx_posts_reposted_from_id created successfully';
  ELSE
    RAISE NOTICE 'Index idx_posts_reposted_from_id already exists';
  END IF;
END $$;

-- Step 3: Add comment to document the column
COMMENT ON COLUMN posts.reposted_from_id IS 
  'Reference to the original post if this post is a repost. NULL for original posts.';

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'posts' 
-- AND column_name = 'reposted_from_id';

-- ============================================================
-- NOTES
-- ============================================================
-- - Column is nullable: Original posts have NULL, reposts have the original post ID
-- - Foreign key constraint: References posts(id) with ON DELETE SET NULL
--   (If original post is deleted, reposted_from_id becomes NULL)
-- - Index: Only indexes non-null values for better performance
-- - Safe to run multiple times: Uses DO blocks to check existence first

