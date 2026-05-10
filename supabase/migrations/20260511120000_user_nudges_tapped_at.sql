-- Engagement nudges: record when user tapped through to the info screen (stops 3-day repeat).
-- See WEB_TEAM_USER_NUDGES_TAPPED_AT_MIGRATION.MD

ALTER TABLE user_nudges
  ADD COLUMN IF NOT EXISTS tapped_at TIMESTAMPTZ;

-- Allow clients to set tapped_at on their own rows (INSERT-only RLS blocked UPDATE/upsert before).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_nudges'
      AND policyname = 'Users can update own nudge state'
  ) THEN
    CREATE POLICY "Users can update own nudge state"
      ON user_nudges
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
