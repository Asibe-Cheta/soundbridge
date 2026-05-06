-- Fan acquisition nudge dismissal tracking (mobile parity)
-- Stores permanently-sent nudge IDs per user.

CREATE TABLE IF NOT EXISTS user_nudges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nudge_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, nudge_id)
);

ALTER TABLE user_nudges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_nudges'
      AND policyname = 'Users can read own nudge state'
  ) THEN
    CREATE POLICY "Users can read own nudge state"
      ON user_nudges
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_nudges'
      AND policyname = 'Users can insert own nudge state'
  ) THEN
    CREATE POLICY "Users can insert own nudge state"
      ON user_nudges
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_nudges_user_id_idx ON user_nudges (user_id);
