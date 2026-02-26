-- ISRC auto-assignment (WEB_TEAM_ISRC_AUTO_ASSIGNMENT.MD)
-- Sequential counter + generate function; audio_tracks columns for isrc_source, original_*, suspected_duplicate

-- 1) Sequential counter table (single row)
CREATE TABLE IF NOT EXISTS isrc_counter (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  last_isrc     TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO isrc_counter (id, current_value)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- 2) ISRC generation function (registrant code passed from API env)
CREATE OR REPLACE FUNCTION generate_soundbridge_isrc(p_registrant TEXT DEFAULT 'SBR')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year    TEXT := to_char(NOW(), 'YY');
  v_counter INTEGER;
  v_isrc    TEXT;
BEGIN
  UPDATE isrc_counter
  SET    current_value = current_value + 1,
         updated_at    = NOW()
  WHERE  id = 1
  RETURNING current_value INTO v_counter;

  v_isrc := 'GB-' || COALESCE(NULLIF(trim(p_registrant), ''), 'SBR') || '-' || v_year || '-' || LPAD(v_counter::TEXT, 5, '0');

  UPDATE isrc_counter SET last_isrc = v_isrc WHERE id = 1;

  RETURN v_isrc;
END;
$$;

-- 3) audio_tracks: ISRC and original-work columns
ALTER TABLE audio_tracks
  ADD COLUMN IF NOT EXISTS isrc_code            TEXT,
  ADD COLUMN IF NOT EXISTS isrc_source          TEXT,
  ADD COLUMN IF NOT EXISTS isrc_soundbridge_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_artist_name TEXT,
  ADD COLUMN IF NOT EXISTS original_song_title  TEXT,
  ADD COLUMN IF NOT EXISTS suspected_duplicate  BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audio_tracks_isrc_source_check'
  ) THEN
    ALTER TABLE audio_tracks
    ADD CONSTRAINT audio_tracks_isrc_source_check
    CHECK (isrc_source IS NULL OR isrc_source IN ('user_provided', 'acrcloud_detected', 'soundbridge_generated'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audio_tracks_suspected_duplicate
ON audio_tracks(suspected_duplicate)
WHERE suspected_duplicate = TRUE;

-- Allow authenticated users (API) to call the generator
GRANT EXECUTE ON FUNCTION generate_soundbridge_isrc(TEXT) TO authenticated;
