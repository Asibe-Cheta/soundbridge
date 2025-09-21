-- Update upload limits configuration to match new pricing structure
-- Run this to update the database with the new limits

-- Update file size limits
UPDATE upload_limits_config 
SET 
  max_file_size = CASE 
    WHEN tier = 'free' THEN 10485760     -- 10MB
    WHEN tier = 'pro' THEN 52428800      -- 50MB  
    WHEN tier = 'enterprise' THEN 104857600 -- 100MB
  END,
  daily_upload_limit = CASE
    WHEN tier = 'free' THEN 3            -- 3 total uploads (lifetime)
    WHEN tier = 'pro' THEN 10            -- 10 uploads per month
    WHEN tier = 'enterprise' THEN NULL   -- unlimited
  END,
  updated_at = NOW()
WHERE tier IN ('free', 'pro', 'enterprise');

-- Add storage limits to user_upload_stats table if not exists
ALTER TABLE user_upload_stats 
ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 104857600; -- 100MB default

-- Update storage limits based on tier
UPDATE user_upload_stats 
SET storage_limit = CASE
  WHEN current_tier = 'free' THEN 104857600      -- 100MB
  WHEN current_tier = 'pro' THEN 2147483648      -- 2GB
  WHEN current_tier = 'enterprise' THEN 10737418240 -- 10GB
  ELSE 104857600                                 -- default 100MB
END
WHERE storage_limit = 104857600; -- only update default values

-- Create function to check storage limits
CREATE OR REPLACE FUNCTION check_storage_limit(user_uuid UUID, file_size BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  user_storage_limit BIGINT;
  current_storage_used BIGINT;
BEGIN
  -- Get user's storage limit based on tier
  SELECT 
    CASE 
      WHEN us.current_tier = 'free' THEN 104857600      -- 100MB
      WHEN us.current_tier = 'pro' THEN 2147483648      -- 2GB
      WHEN us.current_tier = 'enterprise' THEN 10737418240 -- 10GB
      ELSE 104857600                                    -- default 100MB
    END
  INTO user_storage_limit
  FROM user_upload_stats us
  WHERE us.user_id = user_uuid;
  
  -- Get current storage used
  SELECT COALESCE(total_storage_used, 0) 
  INTO current_storage_used
  FROM user_upload_stats 
  WHERE user_id = user_uuid;
  
  -- Check if adding this file would exceed limit
  RETURN (current_storage_used + file_size) <= user_storage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check upload count limits
CREATE OR REPLACE FUNCTION check_upload_count_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  upload_limit INTEGER;
  current_uploads INTEGER;
  monthly_uploads INTEGER;
BEGIN
  -- Get user's tier
  SELECT COALESCE(us.current_tier, 'free') INTO user_tier
  FROM user_upload_stats us
  WHERE us.user_id = user_uuid;
  
  -- Get upload limit based on tier
  SELECT 
    CASE 
      WHEN user_tier = 'free' THEN 3     -- 3 total uploads (lifetime)
      WHEN user_tier = 'pro' THEN 10     -- 10 uploads per month
      WHEN user_tier = 'enterprise' THEN NULL -- unlimited
    END
  INTO upload_limit;
  
  -- If unlimited, allow
  IF upload_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- For free tier, check total uploads
  IF user_tier = 'free' THEN
    SELECT COALESCE(total_uploads, 0) 
    INTO current_uploads
    FROM user_upload_stats 
    WHERE user_id = user_uuid;
    
    RETURN current_uploads < upload_limit;
  END IF;
  
  -- For pro tier, check monthly uploads
  IF user_tier = 'pro' THEN
    SELECT COUNT(*) 
    INTO monthly_uploads
    FROM upload_validation_logs 
    WHERE user_id = user_uuid 
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND validation_status = 'success';
    
    RETURN monthly_uploads < upload_limit;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
