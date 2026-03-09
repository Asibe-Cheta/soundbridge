-- Add id column to follows for API .select('id', 'created_at') and mobile compatibility
-- @see urgent_follows_table_missing_id.md
-- Table may have been created with composite PRIMARY KEY (follower_id, following_id) only;
-- we add a surrogate id so existing code and APIs work.

ALTER TABLE follows
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();

-- Ensure id is unique (table keeps composite PK; id is a surrogate key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_id ON follows(id);

COMMENT ON COLUMN follows.id IS 'Surrogate key for API and references; table may also have composite PK (follower_id, following_id).';
