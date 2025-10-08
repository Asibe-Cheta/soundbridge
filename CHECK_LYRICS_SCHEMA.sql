-- Check if lyrics columns exist in audio_tracks table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
AND column_name IN ('lyrics', 'lyrics_language')
ORDER BY column_name;

-- Check recent tracks and their lyrics
SELECT 
  id,
  title,
  artist_name,
  CASE 
    WHEN lyrics IS NOT NULL THEN 'HAS_LYRICS' 
    ELSE 'NO_LYRICS' 
  END as lyrics_status,
  CASE 
    WHEN lyrics IS NOT NULL THEN LENGTH(lyrics) 
    ELSE 0 
  END as lyrics_length,
  lyrics_language,
  created_at
FROM audio_tracks 
ORDER BY created_at DESC 
LIMIT 10;
