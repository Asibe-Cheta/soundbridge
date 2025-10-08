-- Mobile Team Approved Schema Fix
-- Based on mobile team's response and recommendations
-- This adds missing columns with sensible defaults for upload compatibility

-- Add missing columns that web app needs (minimal approach)
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS lyrics TEXT,
ADD COLUMN IF NOT EXISTS lyrics_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS audio_quality VARCHAR(20) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS bitrate INTEGER DEFAULT 128,
ADD COLUMN IF NOT EXISTS sample_rate INTEGER DEFAULT 44100,
ADD COLUMN IF NOT EXISTS channels INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS codec VARCHAR(20) DEFAULT 'mp3',
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_lyrics ON audio_tracks(lyrics) WHERE lyrics IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audio_tracks_quality ON audio_tracks(audio_quality);

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
AND column_name IN ('lyrics', 'lyrics_language', 'audio_quality', 'bitrate', 'sample_rate', 'channels', 'codec', 'processing_status')
ORDER BY column_name;
