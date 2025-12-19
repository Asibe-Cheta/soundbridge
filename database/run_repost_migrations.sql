-- ============================================================
-- COMPLETE REPOST MIGRATION SCRIPT
-- ============================================================
-- Date: December 20, 2025
-- Purpose: Run all repost-related migrations in order
-- 
-- This script runs all migrations needed for repost enhancements:
-- 1. Create post_reposts table
-- 2. Backfill existing reposts
-- 3. Add 'repost' to notification types
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Create post_reposts table
-- ============================================================
\echo 'Step 1: Creating post_reposts table...'

CREATE TABLE IF NOT EXISTS post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repost_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(post_id, user_id),
  UNIQUE(repost_post_id),
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (repost_post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id ON post_reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_user_id ON post_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_repost_post_id ON post_reposts(repost_post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_user ON post_reposts(post_id, user_id);

-- Enable RLS
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "post_reposts_select_policy" ON post_reposts;
CREATE POLICY "post_reposts_select_policy" ON post_reposts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_reposts_insert_policy" ON post_reposts;
CREATE POLICY "post_reposts_insert_policy" ON post_reposts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_reposts_delete_policy" ON post_reposts;
CREATE POLICY "post_reposts_delete_policy" ON post_reposts
  FOR DELETE USING (auth.uid() = user_id);

\echo '✅ Step 1 complete: post_reposts table created'

-- ============================================================
-- STEP 2: Backfill existing reposts
-- ============================================================
\echo 'Step 2: Backfilling existing reposts...'

INSERT INTO post_reposts (post_id, user_id, repost_post_id)
SELECT 
  reposted_from_id as post_id,
  user_id,
  id as repost_post_id
FROM posts
WHERE reposted_from_id IS NOT NULL
  AND deleted_at IS NULL
ON CONFLICT (post_id, user_id) DO NOTHING;

\echo '✅ Step 2 complete: Existing reposts backfilled'

-- ============================================================
-- STEP 3: Add repost to notification types
-- ============================================================
\echo 'Step 3: Adding repost to notification types...'

-- Update notifications table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_type_check'
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('follow', 'like', 'comment', 'share', 'repost', 'collaboration', 'collaboration_request', 'event', 'system', 'post_reaction', 'post_comment', 'comment_reply', 'connection_request', 'connection_accepted'));
  END IF;
END $$;

-- Update notification_logs table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'notification_logs'
  ) THEN
    IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'notification_logs_notification_type_check'
      AND table_name = 'notification_logs'
    ) THEN
      ALTER TABLE notification_logs DROP CONSTRAINT notification_logs_notification_type_check;
      ALTER TABLE notification_logs
      ADD CONSTRAINT notification_logs_notification_type_check 
      CHECK (notification_type IN ('follow', 'like', 'comment', 'share', 'repost', 'collaboration', 'collaboration_request', 'event', 'system', 'post_reaction', 'post_comment', 'comment_reply', 'connection_request', 'connection_accepted'));
    END IF;
  END IF;
END $$;

\echo '✅ Step 3 complete: Notification types updated'

-- ============================================================
-- VERIFICATION
-- ============================================================
\echo ''
\echo '========================================'
\echo 'VERIFICATION'
\echo '========================================'

-- Count reposts
SELECT 
  (SELECT COUNT(*) FROM posts WHERE reposted_from_id IS NOT NULL AND deleted_at IS NULL) as reposts_in_posts,
  (SELECT COUNT(*) FROM post_reposts) as reposts_in_table;

-- Check table exists
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'post_reposts') as column_count
FROM information_schema.tables
WHERE table_name = 'post_reposts';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'post_reposts'
ORDER BY indexname;

\echo ''
\echo '✅ All migrations complete!'
\echo 'Next steps:'
\echo '1. Deploy API changes (POST/DELETE endpoints)'
\echo '2. Update post queries to include user_reposted field'
\echo '3. Test repost functionality'

