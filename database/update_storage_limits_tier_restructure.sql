-- Update Storage Limits for Tier Restructure
-- Free: 150MB (per TIER_RESTRUCTURE.md)
-- Pro: 500MB
-- Enterprise: Keep existing (2GB)
-- Date: December 2024

-- Update check_storage_limit function
CREATE OR REPLACE FUNCTION check_storage_limit(user_uuid UUID, file_size BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  user_storage_limit BIGINT;
  current_storage_used BIGINT;
BEGIN
  -- Get user's storage limit based on tier (updated per TIER_RESTRUCTURE.md)
  SELECT 
    CASE 
      WHEN us.tier = 'free' THEN 157286400      -- 150MB (150 * 1024 * 1024)
      WHEN us.tier = 'pro' THEN 524288000        -- 500MB (500 * 1024 * 1024)
      WHEN us.tier = 'enterprise' THEN 2147483648 -- 2GB
      ELSE 157286400                            -- default 150MB for free tier
    END
  INTO user_storage_limit
  FROM user_subscriptions us
  WHERE us.user_id = user_uuid
  AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no subscription found, use free tier limits
  IF user_storage_limit IS NULL THEN
    user_storage_limit := 157286400; -- 150MB for free tier
  END IF;
  
  -- Calculate current storage used (sum of file sizes)
  SELECT COALESCE(SUM(
    CASE 
      WHEN original_file_size IS NOT NULL THEN original_file_size
      ELSE 0
    END
  ), 0)
  INTO current_storage_used
  FROM audio_tracks
  WHERE creator_id = user_uuid
    AND deleted_at IS NULL;
  
  -- Return true if adding this file won't exceed the limit
  RETURN (current_storage_used + file_size) <= user_storage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_storage_limit(UUID, BIGINT) IS 
  'Checks storage limit: Free = 150MB, Pro = 500MB, Enterprise = 2GB';
