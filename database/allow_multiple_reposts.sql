-- ============================================================
-- ALLOW MULTIPLE REPOSTS OF SAME POST
-- ============================================================
-- Date: January 1, 2026
-- Purpose: Remove UNIQUE constraint to allow users to repost the same post multiple times
-- 
-- This migration removes the UNIQUE constraint on (post_id, user_id) in the 
-- post_reposts table, allowing users to create multiple reposts of the same post.
-- 
-- Rationale: This matches standard social media behavior (Twitter, LinkedIn, etc.)
-- where users can repost/share the same content multiple times.
-- ============================================================

-- Remove the UNIQUE constraint on (post_id, user_id)
-- This allows users to repost the same post multiple times
ALTER TABLE post_reposts 
DROP CONSTRAINT IF EXISTS post_reposts_post_id_user_id_key;

-- Also check for constraint with different naming conventions
ALTER TABLE post_reposts 
DROP CONSTRAINT IF EXISTS post_reposts_post_id_user_id_unique;

-- Keep the UNIQUE constraint on repost_post_id (each repost post should only be linked once)
-- This constraint should already exist and should remain

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify the constraint was removed:
-- 
-- SELECT 
--   constraint_name, 
--   constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'post_reposts' 
--   AND constraint_type = 'UNIQUE'
--   AND constraint_name LIKE '%post_id%user_id%';
--
-- This should return 0 rows (the constraint should be gone)
--
-- Verify repost_post_id constraint still exists:
-- 
-- SELECT 
--   constraint_name, 
--   constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'post_reposts' 
--   AND constraint_type = 'UNIQUE'
--   AND constraint_name LIKE '%repost_post_id%';
--
-- This should return 1 row (the constraint should still exist)

-- ============================================================
-- NOTES
-- ============================================================
-- - Users can now repost the same post multiple times
-- - Each repost creates a new post in the posts table
-- - Each repost creates a new record in post_reposts table
-- - The composite index (post_id, user_id) is still useful for queries
-- - DELETE endpoint behavior: Currently deletes the most recent repost (via .single())
--   Future enhancement: Could allow deleting specific reposts by repost_post_id

