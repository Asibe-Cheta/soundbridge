-- ============================================================
-- ADD POST_REPOSTS TABLE FOR REPOST TRACKING
-- ============================================================
-- Date: December 20, 2025
-- Purpose: Enable repost toggle behavior (un-repost functionality)
-- 
-- This migration creates a table to track repost relationships,
-- allowing users to un-repost and preventing duplicate reposts.
-- ============================================================

-- Create post_reposts table
CREATE TABLE IF NOT EXISTS post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repost_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One repost per user per post
  UNIQUE(post_id, user_id),
  
  -- Ensure repost_post_id is unique (one repost post can only be linked once)
  UNIQUE(repost_post_id),
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (repost_post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id ON post_reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_user_id ON post_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_repost_post_id ON post_reposts(repost_post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_user ON post_reposts(post_id, user_id); -- Composite for "has user reposted?" queries

-- Enable Row Level Security
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view all reposts (for "who reposted" features)
CREATE POLICY "post_reposts_select_policy" ON post_reposts
  FOR SELECT USING (true);

-- Users can create their own reposts
CREATE POLICY "post_reposts_insert_policy" ON post_reposts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reposts
CREATE POLICY "post_reposts_delete_policy" ON post_reposts
  FOR DELETE USING (auth.uid() = user_id);

-- Add comment to document the table
COMMENT ON TABLE post_reposts IS 
  'Tracks repost relationships between users and posts. Enables toggle behavior for reposts.';

COMMENT ON COLUMN post_reposts.post_id IS 
  'The original post that was reposted.';

COMMENT ON COLUMN post_reposts.user_id IS 
  'The user who reposted.';

COMMENT ON COLUMN post_reposts.repost_post_id IS 
  'The new post created as a result of the repost.';

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify the table was created:
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'post_reposts'
-- ORDER BY ordinal_position;

-- ============================================================
-- NOTES
-- ============================================================
-- - UNIQUE(post_id, user_id): Prevents duplicate reposts
-- - UNIQUE(repost_post_id): Ensures one repost post is only linked once
-- - CASCADE DELETE: If original post is deleted, repost records are deleted
-- - CASCADE DELETE: If repost post is deleted, record is deleted
-- - Composite index (post_id, user_id): Optimizes "has user reposted?" queries

