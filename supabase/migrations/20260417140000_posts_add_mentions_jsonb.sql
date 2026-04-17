-- Post @mentions metadata (parallel to inline @username in posts.content).
-- Used by notification dispatch; optional JSON array, default empty.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN posts.mentions IS
  'Array of { userId, username, display_name } for mention notifications; content keeps plain @username text.';
