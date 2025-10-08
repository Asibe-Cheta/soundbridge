-- Validation System Fix
-- This ensures the upload validation system is working properly

-- 1. Ensure the required RPC functions exist for upload validation
CREATE OR REPLACE FUNCTION check_storage_limit(user_uuid UUID, file_size BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  user_storage_limit BIGINT;
  current_storage_used BIGINT;
BEGIN
  -- Get user's storage limit based on tier
  SELECT 
    CASE 
      WHEN us.tier = 'free' THEN 104857600      -- 100MB
      WHEN us.tier = 'pro' THEN 524288000       -- 500MB  
      WHEN us.tier = 'enterprise' THEN 2147483648 -- 2GB
      ELSE 104857600                            -- default 100MB
    END
  INTO user_storage_limit
  FROM user_subscriptions us
  WHERE us.user_id = user_uuid
  AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no subscription found, use free tier limits
  IF user_storage_limit IS NULL THEN
    user_storage_limit := 104857600; -- 100MB for free tier
  END IF;
  
  -- Calculate current storage used
  SELECT COALESCE(SUM(file_size), 0)
  INTO current_storage_used
  FROM audio_tracks
  WHERE creator_id = user_uuid;
  
  -- Return true if adding this file won't exceed the limit
  RETURN (current_storage_used + file_size) <= user_storage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to check upload count limits
CREATE OR REPLACE FUNCTION check_upload_count_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  upload_limit INTEGER;
  current_uploads INTEGER;
BEGIN
  -- Get user's tier
  SELECT tier
  INTO user_tier
  FROM user_subscriptions
  WHERE user_id = user_uuid
  AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Set default tier if no subscription found
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Set upload limits based on tier
  upload_limit := CASE 
    WHEN user_tier = 'free' THEN 3
    WHEN user_tier = 'pro' THEN 10
    WHEN user_tier = 'enterprise' THEN 999999 -- effectively unlimited
    ELSE 3
  END;
  
  -- Count current month's uploads
  SELECT COUNT(*)
  INTO current_uploads
  FROM audio_tracks
  WHERE creator_id = user_uuid
  AND created_at >= date_trunc('month', CURRENT_DATE);
  
  -- Return true if under the limit
  RETURN current_uploads < upload_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure user_subscriptions table exists with proper structure
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- 5. Insert default free subscription for existing users who don't have one
INSERT INTO user_subscriptions (user_id, tier, status)
SELECT DISTINCT id, 'free', 'active'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions);

-- 6. Verify the functions work
SELECT 
  'check_storage_limit' as function_name,
  check_storage_limit('00000000-0000-0000-0000-000000000000'::UUID, 1048576) as test_result
UNION ALL
SELECT 
  'check_upload_count_limit' as function_name,
  check_upload_count_limit('00000000-0000-0000-0000-000000000000'::UUID) as test_result;
