-- Force Schema Update - More Aggressive Approach
-- This will force the schema changes even if there are cache issues

-- 1. First, let's check what columns currently exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'audio_tracks';

-- 2. Force add columns with explicit constraints
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

-- 3. Add constraints explicitly
ALTER TABLE audio_tracks 
DROP CONSTRAINT IF EXISTS audio_tracks_audio_quality_check,
ADD CONSTRAINT audio_tracks_audio_quality_check CHECK (audio_quality IN ('standard', 'hd', 'lossless'));

ALTER TABLE audio_tracks 
DROP CONSTRAINT IF EXISTS audio_tracks_processing_status_check,
ADD CONSTRAINT audio_tracks_processing_status_check CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- 4. Force create indexes
DROP INDEX IF EXISTS idx_audio_tracks_lyrics;
DROP INDEX IF EXISTS idx_audio_tracks_quality;
DROP INDEX IF EXISTS idx_audio_tracks_audio_quality;

CREATE INDEX idx_audio_tracks_lyrics ON audio_tracks(lyrics) WHERE lyrics IS NOT NULL;
CREATE INDEX idx_audio_tracks_quality ON audio_tracks(audio_quality);
CREATE INDEX idx_audio_tracks_audio_quality ON audio_tracks(audio_quality);

-- 5. Update existing rows to have default values for new columns
UPDATE audio_tracks 
SET 
  audio_quality = COALESCE(audio_quality, 'standard'),
  bitrate = COALESCE(bitrate, 128),
  sample_rate = COALESCE(sample_rate, 44100),
  channels = COALESCE(channels, 2),
  codec = COALESCE(codec, 'mp3'),
  processing_status = COALESCE(processing_status, 'completed'),
  processing_completed_at = COALESCE(processing_completed_at, NOW())
WHERE audio_quality IS NULL 
   OR bitrate IS NULL 
   OR sample_rate IS NULL 
   OR channels IS NULL 
   OR codec IS NULL 
   OR processing_status IS NULL 
   OR processing_completed_at IS NULL;

-- 6. Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
AND column_name IN ('lyrics', 'lyrics_language', 'audio_quality', 'bitrate', 'sample_rate', 'channels', 'codec', 'processing_status')
ORDER BY column_name;

-- 7. Test inserting a record with all the new columns
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
  'Test Track',
  'Test Artist',
  '00000000-0000-0000-0000-000000000000',
  'https://example.com/test.mp3',
  'standard',
  128,
  44100,
  2,
  'mp3',
  'completed',
  NOW(),
  'Test lyrics',
  'en'
) ON CONFLICT DO NOTHING;

-- 8. Clean up test record
DELETE FROM audio_tracks WHERE title = 'Test Track' AND artist_name = 'Test Artist';
