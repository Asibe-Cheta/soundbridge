/**
 * SoundBridge Notification System - SAFE VERSION WITH CHECKS
 * 
 * This version checks for prerequisites before creating tables
 * Run this if NOTIFICATION_SCHEMA_FIXED.sql fails
 */

-- =====================================================
-- STEP 1: VERIFY PREREQUISITES
-- =====================================================

DO $$
BEGIN
  -- Check if profiles table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'ERROR: profiles table does not exist! Please run the main database schema first.';
  END IF;
  
  -- Check if profiles.id exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'ERROR: profiles.id column does not exist!';
  END IF;
  
  RAISE NOTICE '✅ Prerequisites check passed!';
END $$;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 2: DROP EXISTING TABLES (if they exist with errors)
-- =====================================================

DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS user_push_tokens CASCADE;
DROP TABLE IF EXISTS creator_subscriptions CASCADE;
DROP TABLE IF EXISTS user_notification_preferences CASCADE;

-- Drop functions and triggers
DROP TRIGGER IF EXISTS create_user_notification_preferences ON profiles;
DROP TRIGGER IF EXISTS check_notification_count_reset ON user_notification_preferences;
DROP TRIGGER IF EXISTS update_user_push_tokens_updated_at ON user_push_tokens;
DROP TRIGGER IF EXISTS update_creator_subscriptions_updated_at ON creator_subscriptions;
DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;

DROP FUNCTION IF EXISTS create_default_notification_preferences() CASCADE;
DROP FUNCTION IF EXISTS reset_notification_count_if_new_day() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS can_send_notification(UUID, VARCHAR, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS increment_notification_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_creator_follower_count(UUID) CASCADE;

-- =====================================================
-- STEP 3: CREATE TABLES
-- =====================================================

-- TABLE 1: user_notification_preferences
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Master controls
  notifications_enabled BOOLEAN DEFAULT TRUE,
  notification_start_hour INTEGER DEFAULT 8 CHECK (notification_start_hour >= 0 AND notification_start_hour < 24),
  notification_end_hour INTEGER DEFAULT 22 CHECK (notification_end_hour >= 0 AND notification_end_hour <= 24),
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  
  -- Rate limiting
  max_notifications_per_day INTEGER DEFAULT 5 CHECK (max_notifications_per_day >= 0 AND max_notifications_per_day <= 100),
  notification_count_today INTEGER DEFAULT 0,
  last_notification_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Notification type toggles
  event_notifications_enabled BOOLEAN DEFAULT TRUE,
  message_notifications_enabled BOOLEAN DEFAULT TRUE,
  tip_notifications_enabled BOOLEAN DEFAULT TRUE,
  collaboration_notifications_enabled BOOLEAN DEFAULT TRUE,
  wallet_notifications_enabled BOOLEAN DEFAULT TRUE,
  
  -- User preferences for targeting
  preferred_event_genres TEXT[] DEFAULT '{}',
  location_state VARCHAR(100),
  location_country VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 2: creator_subscriptions
CREATE TABLE creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Per-creator notification toggles
  notify_on_music_upload BOOLEAN DEFAULT FALSE,
  notify_on_event_post BOOLEAN DEFAULT FALSE,
  notify_on_podcast_upload BOOLEAN DEFAULT FALSE,
  notify_on_collaboration_availability BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, creator_id),
  CHECK (user_id != creator_id)
);

-- TABLE 3: user_push_tokens
CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Push token details
  push_token TEXT NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 4: notification_logs
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification content
  notification_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  
  -- Related entities
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  -- Delivery status
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Push notification receipt (from Expo)
  expo_receipt_id TEXT,
  expo_status VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 5: notification_queue
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  
  -- Related entities
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 2),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 4: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_user_notif_prefs_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notif_prefs_enabled ON user_notification_preferences(notifications_enabled) WHERE notifications_enabled = TRUE;
CREATE INDEX idx_user_notif_prefs_location ON user_notification_preferences(location_state, location_country) WHERE notifications_enabled = TRUE;

CREATE INDEX idx_creator_subs_user_id ON creator_subscriptions(user_id);
CREATE INDEX idx_creator_subs_creator_id ON creator_subscriptions(creator_id);
CREATE INDEX idx_creator_subs_notify_music ON creator_subscriptions(creator_id) WHERE notify_on_music_upload = TRUE;
CREATE INDEX idx_creator_subs_notify_event ON creator_subscriptions(creator_id) WHERE notify_on_event_post = TRUE;
CREATE INDEX idx_creator_subs_notify_podcast ON creator_subscriptions(creator_id) WHERE notify_on_podcast_upload = TRUE;
CREATE INDEX idx_creator_subs_notify_collab ON creator_subscriptions(creator_id) WHERE notify_on_collaboration_availability = TRUE;

CREATE INDEX idx_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON user_push_tokens(user_id, active) WHERE active = TRUE;

CREATE INDEX idx_notif_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notif_logs_sent_at ON notification_logs(sent_at DESC);
CREATE INDEX idx_notif_logs_type ON notification_logs(notification_type);
CREATE INDEX idx_notif_logs_unread ON notification_logs(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notif_logs_related_entity ON notification_logs(related_entity_type, related_entity_id);

CREATE INDEX idx_notif_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notif_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notif_queue_status ON notification_queue(status);
CREATE INDEX idx_notif_queue_priority ON notification_queue(priority DESC, scheduled_for) WHERE status = 'pending';

CREATE INDEX idx_notif_prefs_state_genres ON user_notification_preferences(location_state, preferred_event_genres) WHERE notifications_enabled = TRUE AND event_notifications_enabled = TRUE;
CREATE INDEX idx_notif_logs_user_unread ON notification_logs(user_id, sent_at DESC) WHERE read_at IS NULL;

-- =====================================================
-- STEP 5: ENABLE RLS
-- =====================================================

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: CREATE RLS POLICIES
-- =====================================================

-- user_notification_preferences policies
CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- creator_subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
  ON creator_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions"
  ON creator_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- user_push_tokens policies
CREATE POLICY "Users can view their own push tokens"
  ON user_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own push tokens"
  ON user_push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- notification_logs policies
CREATE POLICY "Users can view their own notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification logs"
  ON notification_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- notification_queue policies
CREATE POLICY "Service role can manage notification queue"
  ON notification_queue FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- STEP 7: CREATE FUNCTIONS
-- =====================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily notification count
CREATE OR REPLACE FUNCTION reset_notification_count_if_new_day()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_notification_reset_date < CURRENT_DATE THEN
    NEW.notification_count_today = 0;
    NEW.last_notification_reset_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create default notification preferences
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (
    user_id,
    timezone,
    location_country
  ) VALUES (
    NEW.id,
    'UTC',
    NEW.country
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if user can receive a notification
CREATE OR REPLACE FUNCTION can_send_notification(
  p_user_id UUID,
  p_notification_type VARCHAR(50),
  p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
  v_unlimited_types TEXT[] := ARRAY['tip', 'collaboration', 'wallet', 'event_reminder', 'track_approved', 'creator_post'];
BEGIN
  SELECT * INTO v_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id;
  
  IF v_prefs IS NULL THEN
    RETURN TRUE;
  END IF;
  
  IF NOT v_prefs.notifications_enabled THEN
    RETURN FALSE;
  END IF;
  
  IF p_notification_type = 'event' AND NOT v_prefs.event_notifications_enabled THEN
    RETURN FALSE;
  ELSIF p_notification_type = 'message' AND NOT v_prefs.message_notifications_enabled THEN
    RETURN FALSE;
  ELSIF p_notification_type = 'tip' AND NOT v_prefs.tip_notifications_enabled THEN
    RETURN FALSE;
  ELSIF p_notification_type = 'collaboration' AND NOT v_prefs.collaboration_notifications_enabled THEN
    RETURN FALSE;
  ELSIF p_notification_type = 'wallet' AND NOT v_prefs.wallet_notifications_enabled THEN
    RETURN FALSE;
  END IF;
  
  IF p_notification_type = ANY(v_unlimited_types) THEN
    RETURN TRUE;
  END IF;
  
  IF v_prefs.notification_count_today >= v_prefs.max_notifications_per_day THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Increment notification count
CREATE OR REPLACE FUNCTION increment_notification_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_notification_preferences
  SET notification_count_today = notification_count_today + 1,
      last_notification_reset_date = CURRENT_DATE
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get follower count for a creator
CREATE OR REPLACE FUNCTION get_creator_follower_count(p_creator_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM creator_subscriptions
  WHERE creator_id = p_creator_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 8: CREATE TRIGGERS
-- =====================================================

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_subscriptions_updated_at
  BEFORE UPDATE ON creator_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER check_notification_count_reset
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION reset_notification_count_if_new_day();

CREATE TRIGGER create_user_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- =====================================================
-- STEP 9: GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON user_notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_push_tokens TO authenticated;
GRANT SELECT, UPDATE ON notification_logs TO authenticated;
GRANT ALL ON notification_queue TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- STEP 10: VERIFICATION
-- =====================================================

SELECT 
  '✅ SUCCESS! All 5 notification tables created' as status,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_notification_preferences',
    'creator_subscriptions',
    'user_push_tokens',
    'notification_logs',
    'notification_queue'
  );

