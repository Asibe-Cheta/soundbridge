-- Update Upload Limits Function for Tier Restructure
-- Free: 3 lifetime uploads (not monthly)
-- Pro: 10 total uploads (not monthly)
-- Enterprise: Unlimited
-- Date: December 2024

-- Drop old function if exists
DROP FUNCTION IF EXISTS check_upload_count_limit(UUID);

-- Create new function with correct limits
CREATE OR REPLACE FUNCTION check_upload_count_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  upload_limit INTEGER;
  current_uploads INTEGER;
BEGIN
  -- Get user's tier
  SELECT COALESCE(tier, 'free') INTO user_tier
  FROM user_subscriptions
  WHERE user_id = user_uuid
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no subscription found, default to free
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Get upload limit based on tier (per TIER_RESTRUCTURE.md)
  upload_limit := CASE 
    WHEN user_tier = 'free' THEN 3     -- 3 lifetime uploads
    WHEN user_tier = 'pro' THEN 10     -- 10 total uploads
    WHEN user_tier = 'enterprise' THEN NULL -- unlimited
  END;
  
  -- If unlimited, allow
  IF upload_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Count current uploads (excluding deleted)
  SELECT COUNT(*) INTO current_uploads
  FROM audio_tracks
  WHERE creator_id = user_uuid
    AND deleted_at IS NULL;
  
  -- Return true if under limit
  RETURN current_uploads < upload_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION check_upload_count_limit(UUID) IS 
  'Checks if user can upload: Free = 3 lifetime, Pro = 10 total, Enterprise = unlimited';
