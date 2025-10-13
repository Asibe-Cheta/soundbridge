-- ============================================
-- ADVERTISEMENT SYSTEM - DATABASE SETUP
-- ============================================
-- Run this script in Supabase SQL Editor
-- Date: October 13, 2025
-- Purpose: Track ad impressions and clicks for free tier monetization
-- ============================================

-- Step 1: Create ad_impressions table
-- ============================================
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ad_id VARCHAR(255) NOT NULL,
  ad_type VARCHAR(50) NOT NULL CHECK (ad_type IN ('banner', 'interstitial')),
  clicked BOOLEAN DEFAULT false,
  impression_time TIMESTAMPTZ DEFAULT NOW(),
  click_time TIMESTAMPTZ,
  page_url TEXT,
  user_agent TEXT,
  device_type VARCHAR(50),
  platform VARCHAR(50) DEFAULT 'web',
  placement VARCHAR(100),
  session_id UUID
);

-- Step 2: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_id ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_id ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_time ON ad_impressions(impression_time DESC);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_type ON ad_impressions(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_clicked ON ad_impressions(clicked);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_platform ON ad_impressions(platform);

-- Step 3: Create ad_config table for dynamic ad settings
-- ============================================
CREATE TABLE IF NOT EXISTS ad_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  show_banners BOOLEAN DEFAULT true,
  show_interstitials BOOLEAN DEFAULT true,
  interstitial_frequency INTEGER DEFAULT 3, -- Show every N tracks
  banner_positions TEXT[] DEFAULT ARRAY['feed', 'sidebar'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier)
);

-- Step 4: Insert default ad configurations
-- ============================================
INSERT INTO ad_config (tier, show_banners, show_interstitials, interstitial_frequency, banner_positions)
VALUES 
  ('free', true, true, 3, ARRAY['feed', 'sidebar', 'footer']),
  ('pro', false, false, 0, ARRAY[]::TEXT[]),
  ('enterprise', false, false, 0, ARRAY[]::TEXT[])
ON CONFLICT (tier) DO NOTHING;

-- Step 5: Create function to get ad config for user
-- ============================================
CREATE OR REPLACE FUNCTION get_ad_config_for_user(user_uuid UUID)
RETURNS TABLE (
  show_banners BOOLEAN,
  show_interstitials BOOLEAN,
  interstitial_frequency INTEGER,
  banner_positions TEXT[]
) AS $$
DECLARE
  user_tier TEXT;
BEGIN
  -- Get user's subscription tier
  SELECT tier INTO user_tier
  FROM user_subscriptions
  WHERE user_id = user_uuid
  AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Default to free tier if no subscription found
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Return ad config for user's tier
  RETURN QUERY
  SELECT ac.show_banners, ac.show_interstitials, ac.interstitial_frequency, ac.banner_positions
  FROM ad_config ac
  WHERE ac.tier = user_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to check if user should see ads
-- ============================================
CREATE OR REPLACE FUNCTION should_show_ads(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
BEGIN
  -- Get user's subscription tier
  SELECT tier INTO user_tier
  FROM user_subscriptions
  WHERE user_id = user_uuid
  AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Default to free tier if no subscription found
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Only free tier sees ads
  RETURN user_tier = 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to track ad impression
-- ============================================
CREATE OR REPLACE FUNCTION track_ad_impression(
  p_user_id UUID,
  p_ad_id VARCHAR(255),
  p_ad_type VARCHAR(50),
  p_page_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type VARCHAR(50) DEFAULT NULL,
  p_placement VARCHAR(100) DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  impression_id UUID;
BEGIN
  INSERT INTO ad_impressions (
    user_id,
    ad_id,
    ad_type,
    page_url,
    user_agent,
    device_type,
    platform,
    placement,
    session_id
  ) VALUES (
    p_user_id,
    p_ad_id,
    p_ad_type,
    p_page_url,
    p_user_agent,
    p_device_type,
    'web',
    p_placement,
    p_session_id
  )
  RETURNING id INTO impression_id;
  
  RETURN impression_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to track ad click
-- ============================================
CREATE OR REPLACE FUNCTION track_ad_click(
  p_ad_id VARCHAR(255),
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the most recent impression for this ad
  UPDATE ad_impressions
  SET clicked = true,
      click_time = NOW()
  WHERE ad_id = p_ad_id
  AND (user_id = p_user_id OR p_user_id IS NULL)
  AND (session_id = p_session_id OR p_session_id IS NULL)
  AND clicked = false
  AND impression_time >= NOW() - INTERVAL '1 hour'
  ORDER BY impression_time DESC
  LIMIT 1;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create RLS policies for ad_impressions
-- ============================================
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own ad impressions
CREATE POLICY "Users can insert their own ad impressions"
ON ad_impressions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own ad impressions
CREATE POLICY "Users can view their own ad impressions"
ON ad_impressions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin can view all ad impressions
CREATE POLICY "Admins can view all ad impressions"
ON ad_impressions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Step 10: Create RLS policies for ad_config
-- ============================================
ALTER TABLE ad_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read ad config
CREATE POLICY "Everyone can read ad config"
ON ad_config FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can modify ad config
CREATE POLICY "Only admins can modify ad config"
ON ad_config FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Step 11: Create analytics view for ad performance
-- ============================================
CREATE OR REPLACE VIEW ad_analytics AS
SELECT 
  ad_id,
  ad_type,
  placement,
  COUNT(*) as total_impressions,
  SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as total_clicks,
  ROUND((SUM(CASE WHEN clicked THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 2) as ctr_percentage,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', impression_time) as date
FROM ad_impressions
GROUP BY ad_id, ad_type, placement, DATE_TRUNC('day', impression_time)
ORDER BY date DESC, total_impressions DESC;

-- Step 12: Grant permissions
-- ============================================
GRANT SELECT ON ad_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_ad_config_for_user(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION should_show_ads(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_ad_impression TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_ad_click TO authenticated, anon;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ad_impressions', 'ad_config');

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_ad_config_for_user', 'should_show_ads', 'track_ad_impression', 'track_ad_click');

-- View ad config
SELECT * FROM ad_config ORDER BY tier;

-- ============================================
-- DONE! Ad system database is ready
-- ============================================

