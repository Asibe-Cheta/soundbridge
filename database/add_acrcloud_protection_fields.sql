-- Add ACRCloud audio fingerprinting and ownership verification fields to audio_tracks table
-- Date: January 2, 2026
-- Feature: Hybrid audio protection system (ACRCloud + ISRC verification)

-- Add ACRCloud fingerprinting fields
ALTER TABLE audio_tracks
ADD COLUMN IF NOT EXISTS acrcloud_checked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS acrcloud_match_found BOOLEAN,
ADD COLUMN IF NOT EXISTS acrcloud_detected_artist TEXT,
ADD COLUMN IF NOT EXISTS acrcloud_detected_title TEXT,
ADD COLUMN IF NOT EXISTS acrcloud_detected_isrc TEXT,
ADD COLUMN IF NOT EXISTS acrcloud_detected_album TEXT,
ADD COLUMN IF NOT EXISTS acrcloud_detected_label TEXT,
ADD COLUMN IF NOT EXISTS acrcloud_checked_at TIMESTAMPTZ;

-- Add ownership verification fields
ALTER TABLE audio_tracks
ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS release_status VARCHAR(50) DEFAULT 'pending_review' 
  CHECK (release_status IN ('released_verified', 'unreleased_original', 'pending_review', 'cover', 'disputed')),
ADD COLUMN IF NOT EXISTS ownership_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ownership_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS artist_name_match BOOLEAN,
ADD COLUMN IF NOT EXISTS artist_name_match_confidence FLOAT,
ADD COLUMN IF NOT EXISTS acrcloud_response_data JSONB;

-- Add index for ACRCloud checked tracks
CREATE INDEX IF NOT EXISTS idx_audio_tracks_acrcloud_checked 
ON audio_tracks(acrcloud_checked) 
WHERE acrcloud_checked = true;

-- Add index for release status
CREATE INDEX IF NOT EXISTS idx_audio_tracks_release_status 
ON audio_tracks(release_status);

-- Add index for ownership verification
CREATE INDEX IF NOT EXISTS idx_audio_tracks_ownership_verified 
ON audio_tracks(ownership_verified) 
WHERE ownership_verified = true;

-- Add comments for documentation
COMMENT ON COLUMN audio_tracks.acrcloud_checked IS 'Whether audio was fingerprinted via ACRCloud';
COMMENT ON COLUMN audio_tracks.acrcloud_match_found IS 'Whether ACRCloud found a match for this audio';
COMMENT ON COLUMN audio_tracks.acrcloud_detected_artist IS 'Artist name detected by ACRCloud';
COMMENT ON COLUMN audio_tracks.acrcloud_detected_title IS 'Track title detected by ACRCloud';
COMMENT ON COLUMN audio_tracks.acrcloud_detected_isrc IS 'ISRC code detected by ACRCloud (if available)';
COMMENT ON COLUMN audio_tracks.acrcloud_detected_album IS 'Album name detected by ACRCloud';
COMMENT ON COLUMN audio_tracks.acrcloud_detected_label IS 'Record label detected by ACRCloud';
COMMENT ON COLUMN audio_tracks.acrcloud_checked_at IS 'Timestamp when ACRCloud check was performed';
COMMENT ON COLUMN audio_tracks.is_released IS 'Whether this track is a released/known track';
COMMENT ON COLUMN audio_tracks.release_status IS 'Release status: released_verified, unreleased_original, pending_review, cover, disputed';
COMMENT ON COLUMN audio_tracks.ownership_verified IS 'Whether ownership has been verified (ISRC + artist match)';
COMMENT ON COLUMN audio_tracks.ownership_verified_at IS 'Timestamp when ownership was verified';
COMMENT ON COLUMN audio_tracks.artist_name_match IS 'Whether uploaded artist name matches ACRCloud detected artist';
COMMENT ON COLUMN audio_tracks.artist_name_match_confidence IS 'Confidence score for artist name match (0.0-1.0)';
COMMENT ON COLUMN audio_tracks.acrcloud_response_data IS 'Full ACRCloud API response data (JSON)';

