-- Post/Drop UX: multiple images (image_urls) and 3,000 character limit
-- From: WEB_TEAM_UX_POST.md (mobile team → web team)

-- Add image_urls array to posts (first image can stay in post_attachments / image_url for backwards compat)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT NULL;

COMMENT ON COLUMN posts.image_urls IS 'Ordered list of image URLs for multi-image posts (up to 9). First image also in post_attachments for compat.';

-- Raise content character limit from 500 to 3,000 (LinkedIn parity)
-- Drop ANY check constraint on posts that limits content length (by name or by definition)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'posts'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~ 'char_length\s*\(\s*content\s*\)'
  LOOP
    EXECUTE format('ALTER TABLE posts DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE posts ADD CONSTRAINT posts_content_max_3000 CHECK (char_length(content) <= 3000);
