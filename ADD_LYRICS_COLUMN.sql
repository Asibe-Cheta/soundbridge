-- Add lyrics support to audio_tracks table
-- This allows creators to add lyrics when uploading tracks

ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS lyrics TEXT,
ADD COLUMN IF NOT EXISTS lyrics_language VARCHAR(10) DEFAULT 'en';

-- Create index for lyrics search (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_audio_tracks_lyrics 
ON audio_tracks(lyrics) WHERE lyrics IS NOT NULL;

-- Update the updated_at trigger to include lyrics changes
-- (The trigger already exists, this is just a note that it will work for lyrics too)

-- Sample update to test (optional - remove in production)
-- UPDATE audio_tracks SET lyrics = 'Sample lyrics here' WHERE id = 'some-track-id';

