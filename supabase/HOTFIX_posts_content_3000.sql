-- =============================================================================
-- HOTFIX: Fix "posts_content_check" blocking posts over 500 characters
-- Run this in Supabase Dashboard → SQL Editor (project linked to soundbridge.live)
-- =============================================================================
-- Error seen on mobile: new row for relation "posts" violates check constraint "posts_content_check"
-- Cause: DB still has CHECK (char_length(content) <= 500). This script raises it to 3000.
-- =============================================================================

-- Drop the old content-length constraint (name may be posts_content_check or similar)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_check;

-- Drop in case we already added the new one in a previous run
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_max_3000;

-- Add new limit: 3,000 characters
ALTER TABLE posts ADD CONSTRAINT posts_content_max_3000 CHECK (char_length(content) <= 3000);
