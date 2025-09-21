-- Audio Quality Schema for SoundBridge
-- Adds audio quality tracking and processing information

-- Add audio quality columns to existing audio_tracks table
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS audio_quality TEXT DEFAULT 'standard' CHECK (audio_quality IN ('standard', 'hd', 'lossless')),
ADD COLUMN IF NOT EXISTS bitrate INTEGER DEFAULT 128,
ADD COLUMN IF NOT EXISTS sample_rate INTEGER DEFAULT 44100,
ADD COLUMN IF NOT EXISTS channels INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS codec TEXT DEFAULT 'mp3',
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS original_file_size BIGINT,
ADD COLUMN IF NOT EXISTS processed_file_size BIGINT;

-- Create audio processing queue table for background processing
CREATE TABLE IF NOT EXISTS audio_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Processing details
  target_quality TEXT NOT NULL CHECK (target_quality IN ('standard', 'hd', 'lossless')),
  target_bitrate INTEGER NOT NULL,
  target_sample_rate INTEGER NOT NULL,
  target_channels INTEGER NOT NULL,
  target_codec TEXT NOT NULL,
  
  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 1, -- Higher number = higher priority
  
  -- File information
  original_file_path TEXT NOT NULL,
  processed_file_path TEXT,
  
  -- Processing metadata
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  processing_duration_seconds INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create audio quality analytics table
CREATE TABLE IF NOT EXISTS audio_quality_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Quality metrics
  total_tracks INTEGER DEFAULT 0,
  standard_quality_tracks INTEGER DEFAULT 0,
  hd_quality_tracks INTEGER DEFAULT 0,
  lossless_quality_tracks INTEGER DEFAULT 0,
  
  -- Storage metrics
  total_storage_used BIGINT DEFAULT 0,
  standard_quality_storage BIGINT DEFAULT 0,
  hd_quality_storage BIGINT DEFAULT 0,
  lossless_quality_storage BIGINT DEFAULT 0,
  
  -- Processing metrics
  total_processing_time_seconds INTEGER DEFAULT 0,
  average_processing_time_seconds DECIMAL(10,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_audio_quality ON audio_tracks(audio_quality);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_processing_status ON audio_tracks(processing_status);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_bitrate ON audio_tracks(bitrate);

CREATE INDEX IF NOT EXISTS idx_audio_processing_queue_status ON audio_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_audio_processing_queue_user_id ON audio_processing_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_processing_queue_track_id ON audio_processing_queue(track_id);
CREATE INDEX IF NOT EXISTS idx_audio_processing_queue_priority ON audio_processing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_audio_processing_queue_created_at ON audio_processing_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_audio_quality_analytics_user_id ON audio_quality_analytics(user_id);

-- Function to update audio quality analytics
CREATE OR REPLACE FUNCTION update_audio_quality_analytics(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audio_quality_analytics (
    user_id,
    total_tracks,
    standard_quality_tracks,
    hd_quality_tracks,
    lossless_quality_tracks,
    total_storage_used,
    standard_quality_storage,
    hd_quality_storage,
    lossless_quality_storage
  )
  SELECT 
    user_uuid,
    COUNT(*) as total_tracks,
    COUNT(*) FILTER (WHERE audio_quality = 'standard') as standard_quality_tracks,
    COUNT(*) FILTER (WHERE audio_quality = 'hd') as hd_quality_tracks,
    COUNT(*) FILTER (WHERE audio_quality = 'lossless') as lossless_quality_tracks,
    COALESCE(SUM(processed_file_size), 0) as total_storage_used,
    COALESCE(SUM(processed_file_size) FILTER (WHERE audio_quality = 'standard'), 0) as standard_quality_storage,
    COALESCE(SUM(processed_file_size) FILTER (WHERE audio_quality = 'hd'), 0) as hd_quality_storage,
    COALESCE(SUM(processed_file_size) FILTER (WHERE audio_quality = 'lossless'), 0) as lossless_quality_storage
  FROM audio_tracks
  WHERE creator_id = user_uuid
  AND processing_status = 'completed'
  
  ON CONFLICT (user_id) DO UPDATE SET
    total_tracks = EXCLUDED.total_tracks,
    standard_quality_tracks = EXCLUDED.standard_quality_tracks,
    hd_quality_tracks = EXCLUDED.hd_quality_tracks,
    lossless_quality_tracks = EXCLUDED.lossless_quality_tracks,
    total_storage_used = EXCLUDED.total_storage_used,
    standard_quality_storage = EXCLUDED.standard_quality_storage,
    hd_quality_storage = EXCLUDED.hd_quality_storage,
    lossless_quality_storage = EXCLUDED.lossless_quality_storage,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's audio quality summary
CREATE OR REPLACE FUNCTION get_user_audio_quality_summary(user_uuid UUID)
RETURNS TABLE (
  total_tracks INTEGER,
  standard_quality_tracks INTEGER,
  hd_quality_tracks INTEGER,
  lossless_quality_tracks INTEGER,
  total_storage_used BIGINT,
  standard_quality_storage BIGINT,
  hd_quality_storage BIGINT,
  lossless_quality_storage BIGINT,
  average_bitrate DECIMAL(10,2),
  average_file_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(aqa.total_tracks, 0) as total_tracks,
    COALESCE(aqa.standard_quality_tracks, 0) as standard_quality_tracks,
    COALESCE(aqa.hd_quality_tracks, 0) as hd_quality_tracks,
    COALESCE(aqa.lossless_quality_tracks, 0) as lossless_quality_tracks,
    COALESCE(aqa.total_storage_used, 0) as total_storage_used,
    COALESCE(aqa.standard_quality_storage, 0) as standard_quality_storage,
    COALESCE(aqa.hd_quality_storage, 0) as hd_quality_storage,
    COALESCE(aqa.lossless_quality_storage, 0) as lossless_quality_storage,
    COALESCE((
      SELECT AVG(bitrate) 
      FROM audio_tracks 
      WHERE creator_id = user_uuid 
      AND processing_status = 'completed'
    ), 0) as average_bitrate,
    COALESCE((
      SELECT AVG(processed_file_size) 
      FROM audio_tracks 
      WHERE creator_id = user_uuid 
      AND processing_status = 'completed'
    ), 0) as average_file_size
  FROM audio_quality_analytics aqa
  WHERE aqa.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update analytics when audio tracks are inserted or updated
CREATE OR REPLACE FUNCTION trigger_update_audio_quality_analytics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_audio_quality_analytics(NEW.creator_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audio_tracks table
DROP TRIGGER IF EXISTS audio_tracks_update_analytics ON audio_tracks;
CREATE TRIGGER audio_tracks_update_analytics
  AFTER INSERT OR UPDATE ON audio_tracks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_audio_quality_analytics();

-- Insert default analytics records for existing users
INSERT INTO audio_quality_analytics (user_id)
SELECT DISTINCT creator_id FROM audio_tracks
WHERE creator_id NOT IN (SELECT user_id FROM audio_quality_analytics);

-- Update analytics for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT creator_id FROM audio_tracks LOOP
    PERFORM update_audio_quality_analytics(user_record.creator_id);
  END LOOP;
END $$;
