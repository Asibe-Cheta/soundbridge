-- ============================================================
-- ADD REPOSTED_FROM_ID COLUMN TO POSTS TABLE
-- ============================================================
-- Date: December 19, 2025
-- Purpose: Enable repost indicator feature
-- 
-- This migration adds a column to track which post was reposted,
-- allowing the UI to display "User X reposted" indicators.
-- ============================================================

-- Add the reposted_from_id column
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS reposted_from_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_reposted_from_id 
ON posts(reposted_from_id) 
WHERE reposted_from_id IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN posts.reposted_from_id IS 
  'Reference to the original post if this post is a repost. NULL for original posts.';

