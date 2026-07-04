-- Optional image attachment on comments (API already returns image_url when present).
-- Comments fetch must not require this column until it exists; code selects without it
-- and maps image_url to null until clients start uploading images.

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.post_comments.image_url IS
  'Optional image attached to a comment. Null for text-only comments.';
