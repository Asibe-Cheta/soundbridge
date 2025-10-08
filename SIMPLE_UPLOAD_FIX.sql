-- Simple Upload Fix - Only Essential Columns
-- This fixes the upload issue without creating complex analytics tables

-- 1. Add lyrics columns to audio_tracks table
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS lyrics TEXT,
ADD COLUMN IF NOT EXISTS lyrics_language VARCHAR(10) DEFAULT 'en';

-- 2. Add essential audio quality columns to audio_tracks table
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS audio_quality TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS bitrate INTEGER DEFAULT 128,
ADD COLUMN IF NOT EXISTS sample_rate INTEGER DEFAULT 44100,
ADD COLUMN IF NOT EXISTS channels INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS codec TEXT DEFAULT 'mp3',
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP DEFAULT NOW();

-- 3. Create simple indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_lyrics ON audio_tracks(lyrics) WHERE lyrics IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audio_tracks_audio_quality ON audio_tracks(audio_quality);

-- 4. Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
AND column_name IN ('lyrics', 'lyrics_language', 'audio_quality', 'bitrate', 'sample_rate', 'channels', 'codec', 'processing_status')
ORDER BY column_name;
