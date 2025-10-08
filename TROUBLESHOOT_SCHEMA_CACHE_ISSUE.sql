-- Troubleshoot Schema Cache Issue
-- This will help diagnose why the upload is still failing after schema changes

-- 1. Check if the columns actually exist in the database
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
AND column_name IN ('lyrics', 'lyrics_language', 'audio_quality', 'bitrate', 'sample_rate', 'channels', 'codec', 'processing_status')
ORDER BY column_name;

-- 2. Check the current structure of audio_tracks table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'audio_tracks' 
ORDER BY ordinal_position;

-- 3. Try to refresh the schema cache by running a simple query
SELECT COUNT(*) as total_tracks FROM audio_tracks;

-- 4. Check if there are any constraints or triggers that might be interfering
SELECT 
  constraint_name, 
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'audio_tracks';

-- 5. Check if the user_subscriptions table exists and has data
SELECT 
  COUNT(*) as total_subscriptions,
  tier,
  status
FROM user_subscriptions 
GROUP BY tier, status;

-- 6. Test the RPC functions directly
SELECT check_storage_limit('00000000-0000-0000-0000-000000000000'::UUID, 1048576) as storage_check;
SELECT check_upload_count_limit('00000000-0000-0000-0000-000000000000'::UUID) as upload_check;

-- 7. Force refresh schema cache by creating and dropping a temporary table
CREATE TEMPORARY TABLE schema_refresh_test (id SERIAL);
DROP TABLE schema_refresh_test;
