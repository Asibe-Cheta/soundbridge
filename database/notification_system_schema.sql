/**
 * SoundBridge Notification System - Database Schema
 * 
 * This schema creates all tables, indexes, functions, triggers, and RLS policies
 * required for the comprehensive notification system.
 * 
 * Features:
 * - User notification preferences with time windows and rate limiting
 * - Creator subscriptions with granular notification controls
 * - Push token management for Expo notifications
 * - Notification audit logs
 * - Scheduled notification queue
 * 
 * Prerequisites:
 * - profiles table must exist
 * - uuid-ossp extension must be enabled
 */

-- =====================================================
-- CLEANUP: Drop existing tables if they exist
-- =====================================================

DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS user_push_tokens CASCADE;
DROP TABLE IF EXISTS creator_subscriptions CASCADE;
DROP TABLE IF EXISTS user_notification_preferences CASCADE;

-- =====================================================
-- TABLE 1: user_notification_preferences
-- Stores user notification settings and rate limiting state
-- =====================================================

CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Master controls
  notifications_enabled BOOLEAN DEFAULT TRUE,
  notification_start_hour INTEGER DEFAULT 8,
  notification_end_hour INTEGER DEFAULT 22,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  
  -- Rate limiting
  max_notifications_per_day INTEGER DEFAULT 5,
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

-- =====================================================
-- TABLE 2: creator_subscriptions
-- Tracks which creators users follow and notification preferences
-- =====================================================

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

-- =====================================================
-- TABLE 3: user_push_tokens
-- Stores Expo push tokens for sending notifications
-- =====================================================

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

-- =====================================================
-- TABLE 4: notification_logs
-- Tracks all sent notifications for history and analytics
-- =====================================================

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
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Expo push receipt
  expo_receipt_id TEXT,
  expo_status VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 5: notification_queue
-- Queue system for scheduling notifications
-- =====================================================

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
  priority INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES: For optimal query performance
-- =====================================================

-- user_notification_preferences indexes
CREATE INDEX idx_user_notif_prefs_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notif_prefs_enabled ON user_notification_preferences(notifications_enabled) WHERE notifications_enabled = TRUE;

-- creator_subscriptions indexes
CREATE INDEX idx_creator_subs_user_id ON creator_subscriptions(user_id);
CREATE INDEX idx_creator_subs_creator_id ON creator_subscriptions(creator_id);
CREATE INDEX idx_creator_subs_notify_music ON creator_subscriptions(creator_id) WHERE notify_on_music_upload = TRUE;
CREATE INDEX idx_creator_subs_notify_event ON creator_subscriptions(creator_id) WHERE notify_on_event_post = TRUE;

-- user_push_tokens indexes
CREATE INDEX idx_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON user_push_tokens(user_id, active) WHERE active = TRUE;

-- notification_logs indexes
CREATE INDEX idx_notif_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notif_logs_sent_at ON notification_logs(sent_at DESC);
CREATE INDEX idx_notif_logs_type ON notification_logs(notification_type);
CREATE INDEX idx_notif_logs_unread ON notification_logs(user_id, read_at) WHERE read_at IS NULL;

-- notification_queue indexes
CREATE INDEX idx_notif_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notif_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notif_queue_status ON notification_queue(status);

-- =====================================================
-- ROW LEVEL SECURITY: Enable and create policies
-- =====================================================

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- user_notification_preferences policies
CREATE POLICY "Users can view own preferences" 
  ON user_notification_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
  ON user_notification_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
  ON user_notification_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- creator_subscriptions policies
CREATE POLICY "Users can view own subscriptions" 
  ON creator_subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions" 
  ON creator_subscriptions FOR ALL 
  USING (auth.uid() = user_id);

-- user_push_tokens policies
CREATE POLICY "Users can view own tokens" 
  ON user_push_tokens FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tokens" 
  ON user_push_tokens FOR ALL 
  USING (auth.uid() = user_id);

-- notification_logs policies
CREATE POLICY "Users can view own notification history" 
  ON notification_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification logs" 
  ON notification_logs FOR UPDATE 
  USING (auth.uid() = user_id);

-- notification_queue policies (service role only)
CREATE POLICY "Service role can manage queue" 
  ON notification_queue FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- FUNCTIONS: Utility functions for notification system
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment daily notification count
CREATE OR REPLACE FUNCTION increment_notification_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_notification_preferences
  SET notification_count_today = notification_count_today + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily notification counts
CREATE OR REPLACE FUNCTION reset_notification_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE user_notification_preferences
  SET 
    notification_count_today = 0,
    last_notification_reset_date = CURRENT_DATE
  WHERE last_notification_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS: Automated actions
-- =====================================================

-- Trigger to update updated_at on user_notification_preferences
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on creator_subscriptions
CREATE TRIGGER update_creator_subscriptions_updated_at
  BEFORE UPDATE ON creator_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on user_push_tokens
CREATE TRIGGER update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PERMISSIONS: Grant access to authenticated users
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON user_notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_push_tokens TO authenticated;
GRANT SELECT, UPDATE ON notification_logs TO authenticated;
GRANT ALL ON notification_queue TO service_role;

-- =====================================================
-- VERIFICATION: Confirm all tables were created
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_name IN (
      'user_notification_preferences',
      'creator_subscriptions',
      'user_push_tokens',
      'notification_logs',
      'notification_queue'
    );
  
  IF table_count = 5 THEN
    RAISE NOTICE '✅ SUCCESS! All 5 notification tables created successfully!';
    RAISE NOTICE 'Tables: user_notification_preferences, creator_subscriptions, user_push_tokens, notification_logs, notification_queue';
  ELSE
    RAISE EXCEPTION 'ERROR: Only % of 5 tables were created. Please check the logs above.', table_count;
  END IF;
END $$;

