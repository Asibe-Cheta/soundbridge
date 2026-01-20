-- Add file_size column to audio_tracks and backfill from audio_metadata where possible

ALTER TABLE audio_tracks
ADD COLUMN IF NOT EXISTS file_size BIGINT;

UPDATE audio_tracks
SET file_size = (audio_metadata->>'size')::bigint
WHERE file_size IS NULL
  AND audio_metadata IS NOT NULL
  AND audio_metadata ? 'size';
