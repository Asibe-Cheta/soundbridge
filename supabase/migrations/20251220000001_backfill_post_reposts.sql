-- ============================================================
-- BACKFILL EXISTING REPOSTS INTO POST_REPOSTS TABLE
-- ============================================================
-- Date: December 20, 2025
-- Purpose: Migrate existing reposts to the new post_reposts table
-- 
-- This migration backfills all existing reposts (posts with reposted_from_id)
-- into the post_reposts table for tracking.
-- 
-- IMPORTANT: Run this AFTER creating the post_reposts table
-- ============================================================

-- Backfill existing reposts into post_reposts table
-- Uses NOT EXISTS instead of ON CONFLICT so it works even if the unique constraint
-- wasn't created (e.g. when CREATE TABLE was skipped because table already existed)
INSERT INTO post_reposts (post_id, user_id, repost_post_id)
SELECT p.reposted_from_id, p.user_id, p.id
FROM posts p
WHERE p.reposted_from_id IS NOT NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM post_reposts pr
    WHERE pr.post_id = p.reposted_from_id AND pr.user_id = p.user_id
  );

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify the backfill:
-- 
-- -- Count reposts in posts table
-- SELECT COUNT(*) as reposts_in_posts
-- FROM posts
-- WHERE reposted_from_id IS NOT NULL AND deleted_at IS NULL;
-- 
-- -- Count reposts in post_reposts table
-- SELECT COUNT(*) as reposts_in_table
-- FROM post_reposts;
-- 
-- -- These counts should match (or be close if there were duplicates)

-- ============================================================
-- NOTES
-- ============================================================
-- - ON CONFLICT DO NOTHING: Handles cases where user reposted same post multiple times
--   (only the first repost will be tracked, which is acceptable)
-- - Only backfills non-deleted posts
-- - Safe to run multiple times (idempotent)

