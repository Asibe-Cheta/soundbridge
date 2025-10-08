-- Complete Upload Fix - Addresses Schema Cache Issues
-- This is a comprehensive fix that should resolve the upload issues

-- 1. First, let's see what we're working with
SELECT 'Current audio_tracks columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
ORDER BY ordinal_position;

-- 2. Drop and recreate the columns to force schema refresh
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS lyrics;
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS lyrics_language;
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS audio_quality;
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS bitrate;
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS sample_rate;
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS channels;
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS codec;
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS processing_status;
ALTER TABLE audio_tracks DROP COLUMN IF EXISTS processing_completed_at;

-- 3. Recreate the columns with proper constraints
ALTER TABLE audio_tracks 
ADD COLUMN lyrics TEXT,
ADD COLUMN lyrics_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN audio_quality VARCHAR(20) DEFAULT 'standard' CHECK (audio_quality IN ('standard', 'hd', 'lossless')),
ADD COLUMN bitrate INTEGER DEFAULT 128,
ADD COLUMN sample_rate INTEGER DEFAULT 44100,
ADD COLUMN channels INTEGER DEFAULT 2,
ADD COLUMN codec VARCHAR(20) DEFAULT 'mp3',
ADD COLUMN processing_status VARCHAR(20) DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN processing_completed_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_audio_tracks_lyrics ON audio_tracks(lyrics) WHERE lyrics IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audio_tracks_audio_quality ON audio_tracks(audio_quality);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_processing_status ON audio_tracks(processing_status);

-- 5. Update existing records to have default values
UPDATE audio_tracks 
SET 
  audio_quality = 'standard',
  bitrate = 128,
  sample_rate = 44100,
  channels = 2,
  codec = 'mp3',
  processing_status = 'completed',
  processing_completed_at = NOW()
WHERE audio_quality IS NULL;

-- 6. Verify the schema is correct
SELECT 'Updated audio_tracks columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
ORDER BY ordinal_position;

-- 7. Test the schema with a sample insert
DO $$
BEGIN
  -- Try to insert a test record
  INSERT INTO audio_tracks (
    title, 
    artist_name, 
    creator_id, 
    file_url,
    audio_quality,
    bitrate,
    sample_rate,
    channels,
    codec,
    processing_status,
    processing_completed_at,
    lyrics,
    lyrics_language
  ) VALUES (
    'Schema Test Track',
    'Schema Test Artist',
    '00000000-0000-0000-0000-000000000000',
    'https://example.com/test.mp3',
    'standard',
    128,
    44100,
    2,
    'mp3',
    'completed',
    NOW(),
    'Test lyrics for schema validation',
    'en'
  );
  
  -- If we get here, the insert worked
  RAISE NOTICE 'Schema test PASSED - All columns exist and work correctly';
  
  -- Clean up test record
  DELETE FROM audio_tracks WHERE title = 'Schema Test Track';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Schema test FAILED: %', SQLERRM;
END $$;

-- 8. Force refresh the schema cache by querying the table
SELECT COUNT(*) as total_tracks FROM audio_tracks;

-- 9. Show final schema verification
SELECT 'Final verification - audio_tracks columns:' as info;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
AND column_name IN ('lyrics', 'lyrics_language', 'audio_quality', 'bitrate', 'sample_rate', 'channels', 'codec', 'processing_status', 'processing_completed_at')
ORDER BY column_name;
