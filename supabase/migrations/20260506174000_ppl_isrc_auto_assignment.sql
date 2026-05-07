-- PPL ISRC auto-assignment migration (WEB_TEAM_ISRC_MIGRATION.MD)
-- Adds year-scoped sequence state + assignment RPC and supporting columns.

-- 1) Sequence table (single-row, row-locked by UPDATE ... RETURNING in RPC)
CREATE TABLE IF NOT EXISTS isrc_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  year VARCHAR(2) NOT NULL DEFAULT TO_CHAR(NOW(), 'YY'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT isrc_sequence_single_row CHECK (id = 1)
);

INSERT INTO isrc_sequence (id, last_sequence, year)
VALUES (1, 0, TO_CHAR(NOW(), 'YY'))
ON CONFLICT (id) DO NOTHING;

-- 2) New columns on audio_tracks
ALTER TABLE audio_tracks
  ADD COLUMN IF NOT EXISTS isrc_source TEXT
    CHECK (isrc_source IN ('acrcloud_detected', 'user_provided', 'soundbridge_generated')),
  ADD COLUMN IF NOT EXISTS is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers_only', 'private'));

-- 3) RPC function (atomic increment + year rollover)
CREATE OR REPLACE FUNCTION assign_soundbridge_isrc(p_track_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_isrc TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YY');

  -- Lock/update the single sequence row for this transaction.
  UPDATE isrc_sequence
  SET
    last_sequence = CASE
                      WHEN year != v_year THEN 1
                      ELSE last_sequence + 1
                    END,
    year = v_year,
    updated_at = NOW()
  WHERE id = 1
  RETURNING last_sequence INTO v_sequence;

  v_isrc := 'GB-KTZ-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');

  -- Only assign if still no ISRC and track is not marked as cover.
  UPDATE audio_tracks
  SET
    isrc_code = v_isrc,
    isrc_source = 'soundbridge_generated'
  WHERE id = p_track_id
    AND isrc_code IS NULL
    AND (is_cover = FALSE OR is_cover IS NULL);

  RETURN v_isrc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Allow authenticated users to execute assignment RPC
GRANT EXECUTE ON FUNCTION assign_soundbridge_isrc(UUID) TO authenticated;

-- 5) Deny direct client access to sequence state; function is SECURITY DEFINER
ALTER TABLE isrc_sequence ENABLE ROW LEVEL SECURITY;
