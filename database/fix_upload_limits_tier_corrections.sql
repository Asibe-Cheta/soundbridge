-- Fix Upload Limits for Tier Corrections
-- Free: 3 lifetime uploads (does NOT reset)
-- Pro: 10 uploads per month (resets on 1st of each month)
-- Enterprise: Unlimited
-- Date: December 2024
-- Based on: TIER_CORRECTIONS.md
--
-- IMPORTANT: This corrects the previous implementation which had Pro = 10 total
-- The correct implementation is Pro = 10/month (resets monthly)

-- Drop old function if exists
DROP FUNCTION IF EXISTS check_upload_count_limit(UUID);

-- Create corrected function with monthly reset for Pro tier
CREATE OR REPLACE FUNCTION check_upload_count_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  upload_limit INTEGER;
  current_uploads INTEGER;
  current_month_start DATE;
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
  
  -- Get upload limit based on tier (per TIER_CORRECTIONS.md)
  upload_limit := CASE 
    WHEN user_tier = 'free' THEN 3     -- 3 lifetime uploads (does NOT reset)
    WHEN user_tier = 'pro' THEN 10    -- 10 uploads per month (resets on 1st)
    WHEN user_tier = 'enterprise' THEN NULL -- unlimited
  END;
  
  -- If unlimited, allow
  IF upload_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- For Free tier: Count total uploads ever (lifetime limit)
  IF user_tier = 'free' THEN
    SELECT COUNT(*) INTO current_uploads
    FROM audio_tracks
    WHERE creator_id = user_uuid
      AND deleted_at IS NULL;
    
    -- Return true if under limit
    RETURN current_uploads < upload_limit;
  END IF;
  
  -- For Pro tier: Count uploads in current month only (resets monthly)
  IF user_tier = 'pro' THEN
    -- Get first day of current month
    current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
    
    -- Count uploads in current month (excluding deleted)
    SELECT COUNT(*) INTO current_uploads
    FROM audio_tracks
    WHERE creator_id = user_uuid
      AND deleted_at IS NULL
      AND created_at >= current_month_start;
    
    -- Return true if under limit
    RETURN current_uploads < upload_limit;
  END IF;
  
  -- Default: allow
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION check_upload_count_limit(UUID) IS 
  'Checks if user can upload: Free = 3 lifetime (no reset), Pro = 10/month (resets on 1st), Enterprise = unlimited';

-- ============================================================================
-- UPDATE check_upload_limit FUNCTION (returns detailed info)
-- ============================================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS check_upload_limit(UUID);

-- Create corrected function that returns detailed upload limit info
CREATE OR REPLACE FUNCTION check_upload_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  upload_limit INTEGER;
  current_uploads INTEGER;
  remaining INTEGER;
  current_month_start DATE;
BEGIN
  -- Get user tier
  SELECT COALESCE(tier, 'free') INTO user_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Set upload limit based on tier
  upload_limit := CASE 
    WHEN user_tier = 'free' THEN 3  -- 3 lifetime uploads
    WHEN user_tier = 'pro' THEN 10  -- 10 uploads per month
    WHEN user_tier = 'enterprise' THEN 999999 -- Unlimited
    ELSE 3
  END;
  
  -- If unlimited, return early
  IF upload_limit >= 999999 THEN
    RETURN jsonb_build_object(
      'tier', user_tier,
      'limit', -1,
      'used', 0,
      'remaining', -1,
      'is_unlimited', true,
      'period', 'unlimited'
    );
  END IF;
  
  -- For Free tier: Count total uploads ever (lifetime limit)
  IF user_tier = 'free' THEN
    SELECT COUNT(*) INTO current_uploads
    FROM audio_tracks
    WHERE creator_id = p_user_id
      AND deleted_at IS NULL;
    
    remaining := GREATEST(upload_limit - current_uploads, 0);
    
    RETURN jsonb_build_object(
      'tier', user_tier,
      'limit', upload_limit,
      'used', current_uploads,
      'remaining', remaining,
      'is_unlimited', false,
      'period', 'lifetime'
    );
  END IF;
  
  -- For Pro tier: Count uploads in current month only
  IF user_tier = 'pro' THEN
    -- Get first day of current month
    current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
    
    -- Count uploads in current month (excluding deleted)
    SELECT COUNT(*) INTO current_uploads
    FROM audio_tracks
    WHERE creator_id = p_user_id
      AND deleted_at IS NULL
      AND created_at >= current_month_start;
    
    remaining := GREATEST(upload_limit - current_uploads, 0);
    
    RETURN jsonb_build_object(
      'tier', user_tier,
      'limit', upload_limit,
      'used', current_uploads,
      'remaining', remaining,
      'is_unlimited', false,
      'period', 'monthly',
      'reset_date', (current_month_start + INTERVAL '1 month')::TEXT
    );
  END IF;
  
  -- Default: return free tier limits
  RETURN jsonb_build_object(
    'tier', 'free',
    'limit', 3,
    'used', 0,
    'remaining', 3,
    'is_unlimited', false,
    'period', 'lifetime'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION check_upload_limit(UUID) IS 
  'Returns detailed upload limit info: Free = 3 lifetime, Pro = 10/month (resets on 1st), Enterprise = unlimited';
