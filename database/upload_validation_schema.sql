-- Upload Validation Schema for SoundBridge
-- Enhanced database schema to support tier-based upload validation and tracking

-- Upload validation tracking table
CREATE TABLE IF NOT EXISTS upload_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_hash TEXT, -- For duplicate detection
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validating', 'success', 'failed', 'cancelled')),
  validation_errors JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',
  applied_rules JSONB, -- Store the validation rules that were applied
  metadata JSONB, -- Store extracted file metadata
  processing_time_ms INTEGER, -- How long validation took
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Upload limits configuration table
CREATE TABLE IF NOT EXISTS upload_limits_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('free', 'pro', 'enterprise')),
  max_file_size BIGINT NOT NULL,
  max_duration_seconds INTEGER NOT NULL,
  allowed_formats TEXT[] NOT NULL,
  processing_type TEXT NOT NULL DEFAULT 'standard' CHECK (processing_type IN ('standard', 'priority', 'instant')),
  copyright_check_level TEXT NOT NULL DEFAULT 'basic' CHECK (copyright_check_level IN ('basic', 'advanced', 'ai-powered')),
  moderation_level TEXT NOT NULL DEFAULT 'automated' CHECK (moderation_level IN ('automated', 'priority', 'human-ai')),
  audio_quality TEXT NOT NULL DEFAULT 'standard' CHECK (audio_quality IN ('standard', 'hd', 'lossless')),
  concurrent_uploads INTEGER NOT NULL DEFAULT 1,
  daily_upload_limit INTEGER, -- NULL means unlimited
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User upload statistics table (enhanced from existing user_usage)
CREATE TABLE IF NOT EXISTS user_upload_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_uploads INTEGER DEFAULT 0,
  successful_uploads INTEGER DEFAULT 0,
  failed_uploads INTEGER DEFAULT 0,
  total_storage_used BIGINT DEFAULT 0,
  current_tier TEXT NOT NULL DEFAULT 'free' CHECK (current_tier IN ('free', 'pro', 'enterprise')),
  last_upload_at TIMESTAMP,
  upload_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Content moderation queue table
CREATE TABLE IF NOT EXISTS content_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES upload_validation_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'reviewing', 'approved', 'flagged', 'rejected')),
  moderation_reason TEXT,
  moderator_id UUID REFERENCES auth.users(id),
  moderation_notes TEXT,
  auto_moderation_score DECIMAL(3,2), -- 0.00 to 1.00
  human_review_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Copyright detection results table
CREATE TABLE IF NOT EXISTS copyright_detection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES upload_validation_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  detection_status TEXT NOT NULL DEFAULT 'pending' CHECK (detection_status IN ('pending', 'scanning', 'clean', 'flagged', 'violation')),
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  matched_content JSONB, -- Details about matched content
  detection_service TEXT, -- Which service was used (audible_magic, pex, etc.)
  scan_duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Upload validation triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_upload_validation_logs_updated_at BEFORE UPDATE ON upload_validation_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upload_limits_config_updated_at BEFORE UPDATE ON upload_limits_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_upload_stats_updated_at BEFORE UPDATE ON user_upload_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_moderation_queue_updated_at BEFORE UPDATE ON content_moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copyright_detection_results_updated_at BEFORE UPDATE ON copyright_detection_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user upload limits based on their tier
CREATE OR REPLACE FUNCTION get_user_upload_limits(user_uuid UUID)
RETURNS TABLE (
  tier TEXT,
  max_file_size BIGINT,
  max_duration_seconds INTEGER,
  allowed_formats TEXT[],
  processing_type TEXT,
  copyright_check_level TEXT,
  moderation_level TEXT,
  audio_quality TEXT,
  concurrent_uploads INTEGER,
  daily_upload_limit INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ulc.tier,
    ulc.max_file_size,
    ulc.max_duration_seconds,
    ulc.allowed_formats,
    ulc.processing_type,
    ulc.copyright_check_level,
    ulc.moderation_level,
    ulc.audio_quality,
    ulc.concurrent_uploads,
    ulc.daily_upload_limit
  FROM upload_limits_config ulc
  WHERE ulc.tier = (
    SELECT COALESCE(us.tier, 'free')
    FROM user_subscriptions us
    WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    ORDER BY us.created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can upload (respects daily limits)
CREATE OR REPLACE FUNCTION can_user_upload(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  daily_limit INTEGER;
  today_uploads INTEGER;
BEGIN
  -- Get user's tier
  SELECT COALESCE(us.tier, 'free') INTO user_tier
  FROM user_subscriptions us
  WHERE us.user_id = user_uuid 
  AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- Get daily limit for tier
  SELECT ulc.daily_upload_limit INTO daily_limit
  FROM upload_limits_config ulc
  WHERE ulc.tier = user_tier;
  
  -- If no limit, allow upload
  IF daily_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Count today's uploads
  SELECT COUNT(*) INTO today_uploads
  FROM upload_validation_logs uvl
  WHERE uvl.user_id = user_uuid
  AND uvl.created_at >= CURRENT_DATE
  AND uvl.validation_status = 'success';
  
  -- Check if under limit
  RETURN today_uploads < daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user upload statistics
CREATE OR REPLACE FUNCTION update_user_upload_stats(
  user_uuid UUID,
  upload_success BOOLEAN,
  file_size BIGINT,
  user_tier TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_upload_stats (user_id, current_tier)
  VALUES (user_uuid, user_tier)
  ON CONFLICT (user_id) DO UPDATE SET
    total_uploads = user_upload_stats.total_uploads + 1,
    successful_uploads = CASE 
      WHEN upload_success THEN user_upload_stats.successful_uploads + 1
      ELSE user_upload_stats.successful_uploads
    END,
    failed_uploads = CASE 
      WHEN NOT upload_success THEN user_upload_stats.failed_uploads + 1
      ELSE user_upload_stats.failed_uploads
    END,
    total_storage_used = CASE 
      WHEN upload_success THEN user_upload_stats.total_storage_used + file_size
      ELSE user_upload_stats.total_storage_used
    END,
    current_tier = user_tier,
    last_upload_at = CASE 
      WHEN upload_success THEN NOW()
      ELSE user_upload_stats.last_upload_at
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default upload limits configuration
INSERT INTO upload_limits_config (tier, max_file_size, max_duration_seconds, allowed_formats, processing_type, copyright_check_level, moderation_level, audio_quality, concurrent_uploads, daily_upload_limit) VALUES
('free', 104857600, 10800, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'], 'standard', 'basic', 'automated', 'standard', 1, NULL),
('pro', 524288000, 10800, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'], 'priority', 'advanced', 'priority', 'hd', 3, NULL),
('enterprise', 2147483648, 10800, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'], 'instant', 'ai-powered', 'human-ai', 'lossless', 5, NULL)
ON CONFLICT (tier) DO UPDATE SET
  max_file_size = EXCLUDED.max_file_size,
  max_duration_seconds = EXCLUDED.max_duration_seconds,
  allowed_formats = EXCLUDED.allowed_formats,
  processing_type = EXCLUDED.processing_type,
  copyright_check_level = EXCLUDED.copyright_check_level,
  moderation_level = EXCLUDED.moderation_level,
  audio_quality = EXCLUDED.audio_quality,
  concurrent_uploads = EXCLUDED.concurrent_uploads,
  daily_upload_limit = EXCLUDED.daily_upload_limit,
  updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_upload_validation_logs_user_id ON upload_validation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_validation_logs_created_at ON upload_validation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_upload_validation_logs_status ON upload_validation_logs(validation_status);
CREATE INDEX IF NOT EXISTS idx_upload_validation_logs_tier ON upload_validation_logs(tier);

CREATE INDEX IF NOT EXISTS idx_user_upload_stats_user_id ON user_upload_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_upload_stats_tier ON user_upload_stats(current_tier);

CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_status ON content_moderation_queue(moderation_status);
CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_user_id ON content_moderation_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_copyright_detection_results_status ON copyright_detection_results(detection_status);
CREATE INDEX IF NOT EXISTS idx_copyright_detection_results_user_id ON copyright_detection_results(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE upload_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_upload_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE copyright_detection_results ENABLE ROW LEVEL SECURITY;

-- Users can only see their own upload validation logs
CREATE POLICY "Users can view their own upload validation logs" ON upload_validation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload validation logs" ON upload_validation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload validation logs" ON upload_validation_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own upload stats
CREATE POLICY "Users can view their own upload stats" ON user_upload_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload stats" ON user_upload_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload stats" ON user_upload_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Only authenticated users can access upload limits config
CREATE POLICY "Authenticated users can view upload limits" ON upload_limits_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Moderation queue is only accessible by moderators/admins (implement role-based access)
CREATE POLICY "Moderators can view moderation queue" ON content_moderation_queue
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Copyright detection results are only accessible by the user and admins
CREATE POLICY "Users can view their own copyright detection results" ON copyright_detection_results
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Initialize upload stats for existing users
INSERT INTO user_upload_stats (user_id, current_tier)
SELECT 
  u.id,
  COALESCE(us.tier, 'free')
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
WHERE u.id NOT IN (SELECT user_id FROM user_upload_stats)
ON CONFLICT (user_id) DO NOTHING;
