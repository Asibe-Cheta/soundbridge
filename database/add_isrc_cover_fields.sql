-- Add ISRC and cover song fields to audio_tracks table
-- Date: January 2, 2026

-- Add columns for cover song verification
ALTER TABLE audio_tracks
ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS isrc_code VARCHAR(12),
ADD COLUMN IF NOT EXISTS isrc_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS isrc_verified_at TIMESTAMPTZ;

-- Add index for ISRC lookups
CREATE INDEX IF NOT EXISTS idx_audio_tracks_isrc_code ON audio_tracks(isrc_code) WHERE isrc_code IS NOT NULL;

-- Add index for cover songs
CREATE INDEX IF NOT EXISTS idx_audio_tracks_is_cover ON audio_tracks(is_cover) WHERE is_cover = true;

-- Add comment for documentation
COMMENT ON COLUMN audio_tracks.is_cover IS 'Indicates if this is a cover song';
COMMENT ON COLUMN audio_tracks.isrc_code IS 'ISRC code for cover song verification (format: XX-XXX-YY-NNNNN)';
COMMENT ON COLUMN audio_tracks.isrc_verified IS 'Whether the ISRC code has been verified via MusicBrainz';
COMMENT ON COLUMN audio_tracks.isrc_verified_at IS 'Timestamp when ISRC was verified';

