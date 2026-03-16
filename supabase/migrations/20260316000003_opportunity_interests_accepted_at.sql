-- Optional: when poster accepts an interest and creates a project, accepted_at can store that time (handler already sets status='accepted', updated_at).
ALTER TABLE opportunity_interests
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN opportunity_interests.accepted_at IS 'When poster accepted the interest (project created). Optional; use updated_at if not set.';
