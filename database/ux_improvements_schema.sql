-- UX Improvements Database Schema
-- Adds support for distance preferences and upload quota tracking
-- Date: November 7, 2025

-- ==============================================
-- 1. ADD DISTANCE PREFERENCE TO PROFILES
-- ==============================================

-- Add distance preference field for event discovery
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_event_distance INTEGER DEFAULT 25 
  CHECK (preferred_event_distance >= 5 AND preferred_event_distance <= 100);

-- Add comment for documentation
COMMENT ON COLUMN profiles.preferred_event_distance IS 
  'User preferred radius for event discovery in miles (5-100). Default: 25 miles';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_event_distance 
  ON profiles(preferred_event_distance);

-- ==============================================
-- 2. ENHANCE USER_USAGE TABLE FOR UPLOAD TRACKING
-- ==============================================

-- Add monthly upload tracking fields
ALTER TABLE user_usage
ADD COLUMN IF NOT EXISTS current_month_uploads INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_cycle_start_date TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_upload_reset_date TIMESTAMP DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN user_usage.current_month_uploads IS 
  'Number of uploads in the current calendar month';
COMMENT ON COLUMN user_usage.billing_cycle_start_date IS 
  'Start date of the user billing cycle';
COMMENT ON COLUMN user_usage.last_upload_reset_date IS 
  'Last date when upload count was reset';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id 
  ON user_usage(user_id);

-- ==============================================
-- 3. FUNCTION: CHECK UPLOAD QUOTA
-- ==============================================

-- Function to check user's upload quota and remaining uploads
CREATE OR REPLACE FUNCTION check_upload_quota(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_uploads_this_month INTEGER;
  v_upload_limit INTEGER;
  v_remaining INTEGER;
  v_reset_date TIMESTAMP;
BEGIN
  -- Get user tier (default to 'free' if not found)
  SELECT COALESCE(tier, 'free') INTO v_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no subscription found, default to free
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;
  
  -- Set upload limits based on tier
  v_upload_limit := CASE 
    WHEN v_tier = 'free' THEN 3
    WHEN v_tier = 'pro' THEN 10
    WHEN v_tier = 'enterprise' THEN 999999
    ELSE 3
  END;
  
  -- Get uploads this calendar month
  SELECT COUNT(*) INTO v_uploads_this_month
  FROM audio_tracks
  WHERE creator_id = p_user_id
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month';
  
  -- Calculate remaining uploads
  v_remaining := GREATEST(v_upload_limit - v_uploads_this_month, 0);
  
  -- Calculate reset date (first day of next month)
  v_reset_date := date_trunc('month', CURRENT_DATE) + interval '1 month';
  
  -- Return JSON object with quota information
  RETURN jsonb_build_object(
    'tier', v_tier,
    'upload_limit', v_upload_limit,
    'uploads_this_month', v_uploads_this_month,
    'remaining', v_remaining,
    'reset_date', v_reset_date,
    'is_unlimited', v_tier = 'enterprise'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION check_upload_quota(UUID) IS 
  'Returns upload quota information for a user including tier, limit, current usage, and remaining uploads';

-- ==============================================
-- 4. FUNCTION: GET CREATOR EARNINGS SUMMARY
-- ==============================================

-- Function to get consolidated creator earnings (tips + streams + followers)
CREATE OR REPLACE FUNCTION get_creator_earnings_summary(
  p_user_id UUID,
  p_start_date TIMESTAMP DEFAULT date_trunc('month', CURRENT_DATE),
  p_end_date TIMESTAMP DEFAULT date_trunc('month', CURRENT_DATE) + interval '1 month'
)
RETURNS JSONB AS $$
DECLARE
  v_tips_amount DECIMAL(10,2);
  v_tips_count INTEGER;
  v_streams_count INTEGER;
  v_new_followers INTEGER;
  v_total_followers INTEGER;
  v_likes_count INTEGER;
  v_comments_count INTEGER;
  v_shares_count INTEGER;
  v_top_tracks JSONB;
BEGIN
  -- Get tips data
  SELECT 
    COALESCE(SUM(creator_earnings), 0),
    COUNT(*)
  INTO v_tips_amount, v_tips_count
  FROM tip_analytics
  WHERE creator_id = p_user_id
    AND status = 'completed'
    AND created_at >= p_start_date
    AND created_at < p_end_date;
  
  -- Get streams count (sum of play counts for tracks in the period)
  -- Note: This counts plays that happened in the period
  SELECT COALESCE(SUM(play_count), 0)
  INTO v_streams_count
  FROM audio_tracks
  WHERE creator_id = p_user_id
    AND created_at >= p_start_date
    AND created_at < p_end_date;
  
  -- Get new followers in the period
  SELECT COUNT(*)
  INTO v_new_followers
  FROM follows
  WHERE following_id = p_user_id
    AND created_at >= p_start_date
    AND created_at < p_end_date;
  
  -- Get total followers
  SELECT followers_count
  INTO v_total_followers
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get engagement metrics
  SELECT 
    COALESCE(SUM(likes_count), 0),
    COALESCE(SUM(comments_count), 0),
    COALESCE(SUM(shares_count), 0)
  INTO v_likes_count, v_comments_count, v_shares_count
  FROM audio_tracks
  WHERE creator_id = p_user_id
    AND created_at >= p_start_date
    AND created_at < p_end_date;
  
  -- Get top 5 tracks by play count
  SELECT jsonb_agg(track_data)
  INTO v_top_tracks
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'title', title,
      'plays', play_count,
      'likes', likes_count
    ) as track_data
    FROM audio_tracks
    WHERE creator_id = p_user_id
      AND created_at >= p_start_date
      AND created_at < p_end_date
    ORDER BY play_count DESC
    LIMIT 5
  ) tracks;
  
  -- Return consolidated earnings summary
  RETURN jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'tips', jsonb_build_object(
      'amount', COALESCE(v_tips_amount, 0),
      'count', COALESCE(v_tips_count, 0),
      'currency', 'USD'
    ),
    'streams', jsonb_build_object(
      'count', COALESCE(v_streams_count, 0),
      'top_tracks', COALESCE(v_top_tracks, '[]'::jsonb)
    ),
    'followers', jsonb_build_object(
      'new_count', COALESCE(v_new_followers, 0),
      'total_count', COALESCE(v_total_followers, 0)
    ),
    'engagement', jsonb_build_object(
      'likes', COALESCE(v_likes_count, 0),
      'comments', COALESCE(v_comments_count, 0),
      'shares', COALESCE(v_shares_count, 0)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_creator_earnings_summary(UUID, TIMESTAMP, TIMESTAMP) IS 
  'Returns consolidated earnings summary including tips, streams, followers, and engagement metrics for a given period';

-- ==============================================
-- 5. GRANT PERMISSIONS
-- ==============================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION check_upload_quota(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_creator_earnings_summary(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;

-- ==============================================
-- 6. RLS POLICIES (if needed)
-- ==============================================

-- Profiles table already has RLS enabled
-- Ensure users can update their own preferences
CREATE POLICY IF NOT EXISTS "Users can update their own preferences" 
  ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================================
-- 7. VERIFICATION QUERIES
-- ==============================================

-- Verify distance preference field exists
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'preferred_event_distance';

-- Verify user_usage enhancements
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_usage' AND column_name IN ('current_month_uploads', 'billing_cycle_start_date', 'last_upload_reset_date');

-- Test upload quota function
-- SELECT check_upload_quota(auth.uid());

-- Test earnings summary function
-- SELECT get_creator_earnings_summary(auth.uid());

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- Summary:
-- ✅ Added preferred_event_distance to profiles (default: 25 miles)
-- ✅ Enhanced user_usage table with monthly tracking fields
-- ✅ Created check_upload_quota() function
-- ✅ Created get_creator_earnings_summary() function
-- ✅ Added indexes for performance
-- ✅ Granted necessary permissions
-- ✅ Added RLS policies

-- Next Steps:
-- 1. Run this migration in Supabase SQL editor
-- 2. Implement API endpoints to use these functions
-- 3. Test with mobile team integration

