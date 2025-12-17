-- =====================================================
-- Content Moderation System - Database Schema Updates
-- =====================================================
-- Description: Adds AI-powered content moderation tracking to SoundBridge
-- Date: December 17, 2025
-- Status: Ready for deployment
-- Cost Impact: £0 (no additional costs)
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Add Moderation Fields to audio_tracks Table
-- =====================================================

-- Add moderation tracking fields
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending_check';
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS moderation_checked_at TIMESTAMPTZ;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS moderation_flagged BOOLEAN DEFAULT false;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS flag_reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS appeal_status VARCHAR(50);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS appeal_text TEXT;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS appeal_submitted_at TIMESTAMPTZ;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS audio_metadata JSONB;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS moderation_confidence FLOAT;

-- Add comments for documentation
COMMENT ON COLUMN audio_tracks.moderation_status IS 'Moderation workflow status: pending_check, checking, clean, flagged, approved, rejected, appealed';
COMMENT ON COLUMN audio_tracks.moderation_checked_at IS 'Timestamp when AI moderation check completed';
COMMENT ON COLUMN audio_tracks.moderation_flagged IS 'Quick flag for filtering flagged content';
COMMENT ON COLUMN audio_tracks.flag_reasons IS 'Array of strings describing why content was flagged. Examples: ["Hate speech detected", "Spam content", "Low quality audio"]';
COMMENT ON COLUMN audio_tracks.reviewed_by IS 'Admin user ID who reviewed flagged content';
COMMENT ON COLUMN audio_tracks.reviewed_at IS 'Timestamp when admin review completed';
COMMENT ON COLUMN audio_tracks.appeal_status IS 'Appeal workflow status: pending, reviewing, approved, rejected';
COMMENT ON COLUMN audio_tracks.appeal_text IS 'User explanation for why they are appealing the rejection';
COMMENT ON COLUMN audio_tracks.appeal_submitted_at IS 'Timestamp when user submitted appeal';
COMMENT ON COLUMN audio_tracks.file_hash IS 'SHA256 hash of audio file for duplicate detection';
COMMENT ON COLUMN audio_tracks.audio_metadata IS 'JSON with audio properties: {bitrate: number, duration: number, sampleRate: number, format: string, channels: number}';
COMMENT ON COLUMN audio_tracks.transcription IS 'AI-generated transcription from Whisper (first 2 minutes for podcasts, full for tracks)';
COMMENT ON COLUMN audio_tracks.moderation_confidence IS 'AI confidence score for moderation decision (0.0-1.0)';

-- =====================================================
-- STEP 2: Create Indexes for Performance
-- =====================================================

-- Index for filtering by moderation status
CREATE INDEX IF NOT EXISTS idx_audio_tracks_moderation_status
ON audio_tracks(moderation_status)
WHERE moderation_status IS NOT NULL;

-- Index for filtering flagged content
CREATE INDEX IF NOT EXISTS idx_audio_tracks_moderation_flagged
ON audio_tracks(moderation_flagged)
WHERE moderation_flagged = true;

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_audio_tracks_file_hash
ON audio_tracks(file_hash)
WHERE file_hash IS NOT NULL;

-- Index for pending moderation checks (cron job efficiency)
CREATE INDEX IF NOT EXISTS idx_audio_tracks_pending_moderation
ON audio_tracks(created_at)
WHERE moderation_status = 'pending_check';

-- Index for admin review queue
CREATE INDEX IF NOT EXISTS idx_audio_tracks_flagged_review
ON audio_tracks(created_at DESC)
WHERE moderation_flagged = true AND moderation_status = 'flagged';

-- Index for appeals
CREATE INDEX IF NOT EXISTS idx_audio_tracks_appeals
ON audio_tracks(appeal_submitted_at)
WHERE appeal_status = 'pending';

-- =====================================================
-- STEP 3: Update RLS Policies
-- =====================================================

-- Allow users to view their own moderation status
DROP POLICY IF EXISTS "Users can view own track moderation status" ON audio_tracks;
CREATE POLICY "Users can view own track moderation status"
ON audio_tracks FOR SELECT
USING (
  creator_id = auth.uid()
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'moderator')
  )
);

-- Only admins can update moderation fields directly
DROP POLICY IF EXISTS "Only admins can update moderation status" ON audio_tracks;
CREATE POLICY "Only admins can update moderation status"
ON audio_tracks FOR UPDATE
USING (
  creator_id = auth.uid() -- Users can update their own tracks
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'moderator')
  )
)
WITH CHECK (
  -- Regular users cannot modify moderation fields
  (creator_id = auth.uid() AND (
    moderation_status IS NOT DISTINCT FROM (SELECT moderation_status FROM audio_tracks WHERE id = audio_tracks.id)
    AND moderation_flagged IS NOT DISTINCT FROM (SELECT moderation_flagged FROM audio_tracks WHERE id = audio_tracks.id)
    AND reviewed_by IS NOT DISTINCT FROM (SELECT reviewed_by FROM audio_tracks WHERE id = audio_tracks.id)
  ))
  OR
  -- Admins can modify anything
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'moderator')
  )
);

-- Users can submit appeals on their own rejected content
DROP POLICY IF EXISTS "Users can appeal rejected content" ON audio_tracks;
CREATE POLICY "Users can appeal rejected content"
ON audio_tracks FOR UPDATE
USING (
  creator_id = auth.uid()
  AND moderation_status = 'rejected'
)
WITH CHECK (
  creator_id = auth.uid()
  AND moderation_status = 'appealed'
  AND appeal_text IS NOT NULL
  AND LENGTH(appeal_text) >= 20
);

-- =====================================================
-- STEP 4: Update admin_settings Table
-- =====================================================

-- Add moderation configuration to admin_settings
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS auto_moderation_enabled BOOLEAN DEFAULT true;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS moderation_strictness VARCHAR(20) DEFAULT 'medium';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS auto_flag_threshold FLOAT DEFAULT 0.7;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS whisper_model VARCHAR(20) DEFAULT 'base';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS transcription_enabled BOOLEAN DEFAULT true;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS harmful_content_check_enabled BOOLEAN DEFAULT true;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS spam_detection_enabled BOOLEAN DEFAULT true;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS duplicate_detection_enabled BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN admin_settings.auto_moderation_enabled IS 'Global toggle for automated content moderation';
COMMENT ON COLUMN admin_settings.moderation_strictness IS 'Moderation sensitivity: low (fewer flags), medium (balanced), high (strict checking)';
COMMENT ON COLUMN admin_settings.auto_flag_threshold IS 'Confidence threshold for auto-flagging content (0.0-1.0). Higher = stricter';
COMMENT ON COLUMN admin_settings.whisper_model IS 'Whisper AI model to use: tiny (fastest), base (recommended), small, medium, large (most accurate)';
COMMENT ON COLUMN admin_settings.transcription_enabled IS 'Enable Whisper audio transcription';
COMMENT ON COLUMN admin_settings.harmful_content_check_enabled IS 'Enable OpenAI Moderation API checks for harmful content';
COMMENT ON COLUMN admin_settings.spam_detection_enabled IS 'Enable automated spam pattern detection';
COMMENT ON COLUMN admin_settings.duplicate_detection_enabled IS 'Enable file hash duplicate detection';

-- Insert default moderation settings if not exists
INSERT INTO admin_settings (
  id,
  auto_moderation_enabled,
  moderation_strictness,
  auto_flag_threshold,
  whisper_model,
  transcription_enabled,
  harmful_content_check_enabled,
  spam_detection_enabled,
  duplicate_detection_enabled
)
VALUES (
  1, -- Assuming single row for global settings
  true,
  'medium',
  0.7,
  'base',
  true,
  true,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  auto_moderation_enabled = EXCLUDED.auto_moderation_enabled,
  moderation_strictness = EXCLUDED.moderation_strictness,
  auto_flag_threshold = EXCLUDED.auto_flag_threshold,
  whisper_model = EXCLUDED.whisper_model,
  transcription_enabled = EXCLUDED.transcription_enabled,
  harmful_content_check_enabled = EXCLUDED.harmful_content_check_enabled,
  spam_detection_enabled = EXCLUDED.spam_detection_enabled,
  duplicate_detection_enabled = EXCLUDED.duplicate_detection_enabled;

-- =====================================================
-- STEP 5: Update admin_review_queue Table
-- =====================================================

-- Add content_moderation to queue types if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_review_queue_queue_type_check'
  ) THEN
    ALTER TABLE admin_review_queue
    ADD CONSTRAINT admin_review_queue_queue_type_check
    CHECK (queue_type IN ('dmca', 'content_report', 'content_flag', 'user_report', 'content_moderation'));
  END IF;
END $$;

-- Create helper function to add moderation items to review queue
CREATE OR REPLACE FUNCTION add_to_moderation_queue(
  p_track_id UUID,
  p_flag_reasons JSONB,
  p_confidence FLOAT
) RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
  v_priority VARCHAR(20);
BEGIN
  -- Determine priority based on confidence and reasons
  IF p_confidence >= 0.9 OR p_flag_reasons @> '["Sexual content involving minors detected"]'::jsonb THEN
    v_priority := 'urgent';
  ELSIF p_confidence >= 0.8 THEN
    v_priority := 'high';
  ELSIF p_confidence >= 0.6 THEN
    v_priority := 'normal';
  ELSE
    v_priority := 'low';
  END IF;

  -- Insert into review queue
  INSERT INTO admin_review_queue (
    queue_type,
    priority,
    status,
    reference_data
  ) VALUES (
    'content_moderation',
    v_priority,
    'pending',
    jsonb_build_object(
      'track_id', p_track_id,
      'flag_reasons', p_flag_reasons,
      'confidence', p_confidence,
      'timestamp', NOW()
    )
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION add_to_moderation_queue IS 'Helper function to add flagged tracks to admin review queue with automatic priority assignment';

-- =====================================================
-- STEP 6: Update admin_dashboard_stats View
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS admin_dashboard_stats;

-- Recreate view with moderation stats
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  -- Existing user stats
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE last_login_at > NOW() - INTERVAL '30 days') as active_users,
  (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days') as new_users_this_week,

  -- Existing content stats
  (SELECT COUNT(*) FROM audio_tracks) as total_tracks,
  (SELECT COUNT(*) FROM events) as total_events,
  (SELECT COUNT(*) FROM messages) as total_messages,

  -- Existing review queue stats
  (SELECT COUNT(*) FROM admin_review_queue WHERE status IN ('pending', 'assigned', 'in_review')) as pending_reviews,
  (SELECT COUNT(*) FROM admin_review_queue WHERE priority = 'urgent') as urgent_items,
  (SELECT COUNT(*) FROM admin_review_queue WHERE queue_type = 'content_report' AND status = 'pending') as content_reports,

  -- NEW: Moderation stats
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_status = 'pending_check') as pending_moderation,
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_status = 'checking') as moderation_in_progress,
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_flagged = true AND moderation_status = 'flagged') as flagged_content,
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_status = 'clean') as clean_content,
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_status = 'approved') as approved_content,
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_status = 'rejected') as rejected_content,
  (SELECT COUNT(*) FROM audio_tracks WHERE appeal_status = 'pending') as pending_appeals,
  (SELECT COUNT(*) FROM admin_review_queue WHERE queue_type = 'content_moderation' AND status = 'pending') as moderation_queue_size

FROM generate_series(1,1);

-- Add comment
COMMENT ON VIEW admin_dashboard_stats IS 'Comprehensive admin dashboard statistics including moderation metrics';

-- Grant access to admins
GRANT SELECT ON admin_dashboard_stats TO authenticated;

-- =====================================================
-- STEP 7: Create Moderation Statistics Function
-- =====================================================

-- Function to get detailed moderation statistics
CREATE OR REPLACE FUNCTION get_moderation_stats(
  p_days_back INTEGER DEFAULT 30
) RETURNS TABLE (
  period DATE,
  total_uploads INTEGER,
  pending_checks INTEGER,
  clean_count INTEGER,
  flagged_count INTEGER,
  approved_count INTEGER,
  rejected_count INTEGER,
  avg_processing_time_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as period,
    COUNT(*)::INTEGER as total_uploads,
    COUNT(*) FILTER (WHERE moderation_status = 'pending_check')::INTEGER as pending_checks,
    COUNT(*) FILTER (WHERE moderation_status = 'clean')::INTEGER as clean_count,
    COUNT(*) FILTER (WHERE moderation_status = 'flagged')::INTEGER as flagged_count,
    COUNT(*) FILTER (WHERE moderation_status = 'approved')::INTEGER as approved_count,
    COUNT(*) FILTER (WHERE moderation_status = 'rejected')::INTEGER as rejected_count,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (moderation_checked_at - created_at)))::INTEGER,
      0
    ) as avg_processing_time_seconds
  FROM audio_tracks
  WHERE created_at > NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY DATE(created_at)
  ORDER BY period DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_moderation_stats IS 'Get daily moderation statistics for the past N days';

-- =====================================================
-- STEP 8: Create Utility Functions
-- =====================================================

-- Function to get top flag reasons
CREATE OR REPLACE FUNCTION get_top_flag_reasons(
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  reason TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    reason_text as reason,
    COUNT(*) as count
  FROM (
    SELECT jsonb_array_elements_text(flag_reasons) as reason_text
    FROM audio_tracks
    WHERE moderation_flagged = true
    AND flag_reasons IS NOT NULL
    AND jsonb_array_length(flag_reasons) > 0
  ) reasons
  GROUP BY reason_text
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_top_flag_reasons IS 'Get most common content flag reasons for analytics';

-- =====================================================
-- STEP 9: Create Cleanup Function
-- =====================================================

-- Function to clean up old moderation data (optional - run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_moderation_data(
  p_days_to_keep INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Remove transcriptions from old clean content to save space
  UPDATE audio_tracks
  SET transcription = NULL
  WHERE moderation_status = 'clean'
  AND moderation_checked_at < NOW() - INTERVAL '1 day' * p_days_to_keep
  AND transcription IS NOT NULL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION cleanup_old_moderation_data IS 'Removes old transcription data from clean content to save storage (keeps flagged content transcriptions)';

-- =====================================================
-- STEP 10: Verification Queries
-- =====================================================

-- Verify all columns were added
DO $$
DECLARE
  v_missing_columns TEXT[];
BEGIN
  SELECT array_agg(column_name)
  INTO v_missing_columns
  FROM (VALUES
    ('moderation_status'),
    ('moderation_checked_at'),
    ('moderation_flagged'),
    ('flag_reasons'),
    ('reviewed_by'),
    ('reviewed_at'),
    ('appeal_status'),
    ('appeal_text'),
    ('file_hash'),
    ('audio_metadata'),
    ('transcription')
  ) AS required_columns(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'audio_tracks'
    AND column_name = required_columns.column_name
  );

  IF v_missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Missing columns in audio_tracks: %', array_to_string(v_missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All moderation columns successfully added to audio_tracks';
  END IF;
END $$;

-- Verify indexes were created
DO $$
DECLARE
  v_missing_indexes TEXT[];
BEGIN
  SELECT array_agg(index_name)
  INTO v_missing_indexes
  FROM (VALUES
    ('idx_audio_tracks_moderation_status'),
    ('idx_audio_tracks_moderation_flagged'),
    ('idx_audio_tracks_file_hash'),
    ('idx_audio_tracks_pending_moderation'),
    ('idx_audio_tracks_flagged_review'),
    ('idx_audio_tracks_appeals')
  ) AS required_indexes(index_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'audio_tracks'
    AND indexname = required_indexes.index_name
  );

  IF v_missing_indexes IS NOT NULL THEN
    RAISE EXCEPTION 'Missing indexes on audio_tracks: %', array_to_string(v_missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✅ All moderation indexes successfully created';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Final verification message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ CONTENT MODERATION SCHEMA MIGRATION COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary of changes:';
  RAISE NOTICE '- Added 13 moderation columns to audio_tracks table';
  RAISE NOTICE '- Created 6 performance indexes';
  RAISE NOTICE '- Updated 3 RLS policies for security';
  RAISE NOTICE '- Added 8 moderation settings to admin_settings';
  RAISE NOTICE '- Created helper functions for moderation workflow';
  RAISE NOTICE '- Updated admin_dashboard_stats view with moderation metrics';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify changes: SELECT * FROM admin_dashboard_stats;';
  RAISE NOTICE '2. Check moderation settings: SELECT * FROM admin_settings;';
  RAISE NOTICE '3. Test upload: Upload a track and verify moderation_status';
  RAISE NOTICE '4. Proceed to Phase 2: Audio validation utilities';
  RAISE NOTICE '';
  RAISE NOTICE 'Cost: £0/month ✅';
  RAISE NOTICE '==============================================';
END $$;
