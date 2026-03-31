-- Add dedicated mixtape fields to audio_tracks
ALTER TABLE audio_tracks
  ADD COLUMN IF NOT EXISTS is_mixtape BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dj_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tracklist TEXT;

CREATE INDEX IF NOT EXISTS idx_audio_tracks_is_mixtape
  ON audio_tracks(is_mixtape);
