-- =====================================================
-- Stream Events Tracking Schema
-- =====================================================
-- Purpose: Track detailed listening events for analytics
-- Features: Demographics, geographic data, engagement metrics
-- Used by: Premium/Unlimited tier advanced analytics
-- =====================================================

-- Create stream_events table to track every play event
CREATE TABLE IF NOT EXISTS stream_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identifiers
  track_id UUID NOT NULL REFERENCES audio_tracks(id) ON DELETE CASCADE,
  listener_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous listeners
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamp
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Listening behavior
  duration_listened INTEGER NOT NULL, -- Seconds listened
  total_duration INTEGER NOT NULL, -- Total track duration in seconds
  completion_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_duration > 0 THEN (duration_listened::NUMERIC / total_duration::NUMERIC * 100)
      ELSE 0
    END
  ) STORED,

  -- Geographic data
  ip_address INET, -- Store IP for GeoIP lookup
  country_code VARCHAR(2), -- ISO 3166-1 alpha-2
  country_name VARCHAR(100),
  city VARCHAR(100),
  region VARCHAR(100),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  timezone VARCHAR(50),

  -- Referral & source tracking
  referrer_url TEXT,
  referrer_type VARCHAR(50), -- 'direct', 'social', 'search', 'external', 'internal'
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),

  -- Device & platform
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop', 'unknown'
  platform VARCHAR(50), -- 'ios', 'android', 'web'
  user_agent TEXT,

  -- Engagement metrics
  liked_track BOOLEAN DEFAULT FALSE,
  shared_track BOOLEAN DEFAULT FALSE,
  followed_creator BOOLEAN DEFAULT FALSE,
  tipped_creator BOOLEAN DEFAULT FALSE,
  purchased_ticket BOOLEAN DEFAULT FALSE, -- If user bought event ticket after listening

  -- Session tracking
  session_id UUID, -- Group plays in same listening session

  -- Indexes for fast queries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Track analytics queries (by creator)
CREATE INDEX idx_stream_events_creator_id ON stream_events(creator_id);
CREATE INDEX idx_stream_events_track_id ON stream_events(track_id);

-- Date range queries
CREATE INDEX idx_stream_events_played_at ON stream_events(played_at DESC);
CREATE INDEX idx_stream_events_creator_played_at ON stream_events(creator_id, played_at DESC);

-- Geographic queries
CREATE INDEX idx_stream_events_country_code ON stream_events(country_code);
CREATE INDEX idx_stream_events_city ON stream_events(city);

-- Engagement queries
CREATE INDEX idx_stream_events_engagement ON stream_events(creator_id, played_at)
  WHERE liked_track = TRUE OR shared_track = TRUE OR followed_creator = TRUE;

-- Composite index for dashboard queries
CREATE INDEX idx_stream_events_dashboard ON stream_events(creator_id, played_at DESC, completion_percentage);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE stream_events ENABLE ROW LEVEL SECURITY;

-- Creators can view their own stream events
CREATE POLICY "Creators can view own stream events"
  ON stream_events
  FOR SELECT
  USING (creator_id = auth.uid());

-- Service role can insert stream events (from audio player)
CREATE POLICY "Service can insert stream events"
  ON stream_events
  FOR INSERT
  WITH CHECK (true);

-- Prevent updates and deletes (analytics data should be immutable)
CREATE POLICY "No updates to stream events"
  ON stream_events
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes to stream events"
  ON stream_events
  FOR DELETE
  USING (false);

-- =====================================================
-- Materialized View for Quick Stats
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS stream_event_stats AS
SELECT
  creator_id,
  track_id,
  DATE(played_at) as date,
  COUNT(*) as total_plays,
  COUNT(DISTINCT listener_id) as unique_listeners,
  AVG(completion_percentage) as avg_completion,
  COUNT(*) FILTER (WHERE completion_percentage >= 75) as completed_plays,
  COUNT(DISTINCT country_code) as countries_reached,
  COUNT(*) FILTER (WHERE liked_track = TRUE) as likes_from_plays,
  COUNT(*) FILTER (WHERE shared_track = TRUE) as shares_from_plays,
  COUNT(*) FILTER (WHERE followed_creator = TRUE) as follows_from_plays,
  COUNT(*) FILTER (WHERE tipped_creator = TRUE) as tips_from_plays
FROM stream_events
GROUP BY creator_id, track_id, DATE(played_at);

-- Index on materialized view
CREATE INDEX idx_stream_stats_creator_date ON stream_event_stats(creator_id, date DESC);
CREATE INDEX idx_stream_stats_track_date ON stream_event_stats(track_id, date DESC);

-- Function to refresh materialized view (run via cron)
CREATE OR REPLACE FUNCTION refresh_stream_event_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stream_event_stats;
END;
$$;

-- =====================================================
-- Helper Functions for Analytics Queries
-- =====================================================

-- Get top countries for a creator
CREATE OR REPLACE FUNCTION get_creator_top_countries(
  p_creator_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  play_count BIGINT,
  unique_listeners BIGINT,
  avg_completion NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.country_code,
    se.country_name,
    COUNT(*) as play_count,
    COUNT(DISTINCT se.listener_id) as unique_listeners,
    AVG(se.completion_percentage) as avg_completion
  FROM stream_events se
  WHERE se.creator_id = p_creator_id
    AND se.played_at >= p_start_date
    AND se.played_at <= p_end_date
    AND se.country_code IS NOT NULL
  GROUP BY se.country_code, se.country_name
  ORDER BY play_count DESC
  LIMIT p_limit;
END;
$$;

-- Get peak listening hours for a creator
CREATE OR REPLACE FUNCTION get_creator_peak_hours(
  p_creator_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  hour_of_day INTEGER,
  play_count BIGINT,
  avg_completion NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM se.played_at AT TIME ZONE 'UTC')::INTEGER as hour_of_day,
    COUNT(*) as play_count,
    AVG(se.completion_percentage) as avg_completion
  FROM stream_events se
  WHERE se.creator_id = p_creator_id
    AND se.played_at >= p_start_date
    AND se.played_at <= p_end_date
  GROUP BY hour_of_day
  ORDER BY hour_of_day;
END;
$$;

-- Get referrer breakdown for a creator
CREATE OR REPLACE FUNCTION get_creator_referrer_stats(
  p_creator_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  referrer_type VARCHAR(50),
  play_count BIGINT,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(se.referrer_type, 'unknown') as referrer_type,
    COUNT(*) as play_count,
    (COUNT(*) FILTER (WHERE se.followed_creator = TRUE OR se.tipped_creator = TRUE)::NUMERIC / COUNT(*)::NUMERIC * 100) as conversion_rate
  FROM stream_events se
  WHERE se.creator_id = p_creator_id
    AND se.played_at >= p_start_date
    AND se.played_at <= p_end_date
  GROUP BY se.referrer_type
  ORDER BY play_count DESC;
END;
$$;

-- Get listener demographics (requires user profile data)
CREATE OR REPLACE FUNCTION get_creator_demographics(
  p_creator_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  age_group VARCHAR(20),
  gender VARCHAR(20),
  listener_count BIGINT,
  avg_completion NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) < 18 THEN 'Under 18'
      WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) BETWEEN 18 AND 24 THEN '18-24'
      WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) BETWEEN 25 AND 34 THEN '25-34'
      WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) BETWEEN 35 AND 44 THEN '35-44'
      WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) BETWEEN 45 AND 54 THEN '45-54'
      WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) >= 55 THEN '55+'
      ELSE 'Unknown'
    END as age_group,
    COALESCE(p.gender, 'Unknown') as gender,
    COUNT(DISTINCT se.listener_id) as listener_count,
    AVG(se.completion_percentage) as avg_completion
  FROM stream_events se
  LEFT JOIN profiles p ON p.id = se.listener_id
  WHERE se.creator_id = p_creator_id
    AND se.played_at >= p_start_date
    AND se.played_at <= p_end_date
    AND se.listener_id IS NOT NULL
  GROUP BY age_group, gender
  ORDER BY listener_count DESC;
END;
$$;

-- =====================================================
-- Comments & Documentation
-- =====================================================

COMMENT ON TABLE stream_events IS 'Tracks detailed listening events for Premium/Unlimited analytics';
COMMENT ON COLUMN stream_events.completion_percentage IS 'Auto-calculated: (duration_listened / total_duration) * 100';
COMMENT ON COLUMN stream_events.ip_address IS 'Used for GeoIP lookup, can be anonymized after processing';
COMMENT ON COLUMN stream_events.referrer_type IS 'Categorized referrer: direct, social, search, external, internal';
COMMENT ON COLUMN stream_events.session_id IS 'Groups multiple plays in same listening session';

COMMENT ON FUNCTION get_creator_top_countries IS 'Returns top countries by play count for a creator (Premium/Unlimited analytics)';
COMMENT ON FUNCTION get_creator_peak_hours IS 'Returns listening activity by hour of day (Premium/Unlimited analytics)';
COMMENT ON FUNCTION get_creator_referrer_stats IS 'Returns referrer breakdown with conversion rates (Premium/Unlimited analytics)';
COMMENT ON FUNCTION get_creator_demographics IS 'Returns age/gender demographics of listeners (Premium/Unlimited analytics)';
