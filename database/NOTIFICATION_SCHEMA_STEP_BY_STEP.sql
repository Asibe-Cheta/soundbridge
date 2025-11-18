/**
 * SoundBridge Notification System - STEP BY STEP VERSION
 * 
 * Run this to see exactly where the error occurs
 * Each step will show success/failure
 */

-- =====================================================
-- STEP 1: Check Prerequisites
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 1: Checking Prerequisites ===';
  
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'FAILED: profiles table does not exist!';
  END IF;
  
  RAISE NOTICE '✅ profiles table exists';
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'FAILED: profiles.id column does not exist!';
  END IF;
  
  RAISE NOTICE '✅ profiles.id column exists';
  RAISE NOTICE '✅ STEP 1 COMPLETE';
END $$;

-- =====================================================
-- STEP 2: Clean Up Existing Tables
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 2: Cleaning Up Existing Tables ===';
  
  DROP TABLE IF EXISTS notification_queue CASCADE;
  RAISE NOTICE '✅ Dropped notification_queue (if existed)';
  
  DROP TABLE IF EXISTS notification_logs CASCADE;
  RAISE NOTICE '✅ Dropped notification_logs (if existed)';
  
  DROP TABLE IF EXISTS user_push_tokens CASCADE;
  RAISE NOTICE '✅ Dropped user_push_tokens (if existed)';
  
  DROP TABLE IF EXISTS creator_subscriptions CASCADE;
  RAISE NOTICE '✅ Dropped creator_subscriptions (if existed)';
  
  DROP TABLE IF EXISTS user_notification_preferences CASCADE;
  RAISE NOTICE '✅ Dropped user_notification_preferences (if existed)';
  
  RAISE NOTICE '✅ STEP 2 COMPLETE';
END $$;

-- =====================================================
-- STEP 3: Create user_notification_preferences
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 3: Creating user_notification_preferences ===';
END $$;

CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  notifications_enabled BOOLEAN DEFAULT TRUE,
  notification_start_hour INTEGER DEFAULT 8,
  notification_end_hour INTEGER DEFAULT 22,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  
  max_notifications_per_day INTEGER DEFAULT 5,
  notification_count_today INTEGER DEFAULT 0,
  last_notification_reset_date DATE DEFAULT CURRENT_DATE,
  
  event_notifications_enabled BOOLEAN DEFAULT TRUE,
  message_notifications_enabled BOOLEAN DEFAULT TRUE,
  tip_notifications_enabled BOOLEAN DEFAULT TRUE,
  collaboration_notifications_enabled BOOLEAN DEFAULT TRUE,
  wallet_notifications_enabled BOOLEAN DEFAULT TRUE,
  
  preferred_event_genres TEXT[] DEFAULT '{}',
  location_state VARCHAR(100),
  location_country VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 3 COMPLETE - user_notification_preferences created';
END $$;

-- =====================================================
-- STEP 4: Create creator_subscriptions
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 4: Creating creator_subscriptions ===';
END $$;

CREATE TABLE creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  notify_on_music_upload BOOLEAN DEFAULT FALSE,
  notify_on_event_post BOOLEAN DEFAULT FALSE,
  notify_on_podcast_upload BOOLEAN DEFAULT FALSE,
  notify_on_collaboration_availability BOOLEAN DEFAULT FALSE,
  
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, creator_id),
  CHECK (user_id != creator_id)
);

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 4 COMPLETE - creator_subscriptions created';
END $$;

-- =====================================================
-- STEP 5: Create user_push_tokens
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 5: Creating user_push_tokens ===';
END $$;

CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  push_token TEXT NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  
  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 5 COMPLETE - user_push_tokens created';
END $$;

-- =====================================================
-- STEP 6: Create notification_logs
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 6: Creating notification_logs ===';
END $$;

CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  notification_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  expo_receipt_id TEXT,
  expo_status VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 6 COMPLETE - notification_logs created';
END $$;

-- =====================================================
-- STEP 7: Create notification_queue
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 7: Creating notification_queue ===';
END $$;

CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  notification_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  scheduled_for TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 7 COMPLETE - notification_queue created';
END $$;

-- =====================================================
-- STEP 8: Create Indexes
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 8: Creating Indexes ===';
END $$;

CREATE INDEX idx_user_notif_prefs_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notif_prefs_enabled ON user_notification_preferences(notifications_enabled) WHERE notifications_enabled = TRUE;
CREATE INDEX idx_creator_subs_user_id ON creator_subscriptions(user_id);
CREATE INDEX idx_creator_subs_creator_id ON creator_subscriptions(creator_id);
CREATE INDEX idx_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_notif_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notif_queue_user_id ON notification_queue(user_id);

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 8 COMPLETE - Indexes created';
END $$;

-- =====================================================
-- STEP 9: Enable RLS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 9: Enabling Row Level Security ===';
END $$;

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 9 COMPLETE - RLS enabled';
END $$;

-- =====================================================
-- STEP 10: Create RLS Policies
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 10: Creating RLS Policies ===';
END $$;

CREATE POLICY "Users can view own prefs" ON user_notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own prefs" ON user_notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prefs" ON user_notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subs" ON creator_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own subs" ON creator_subscriptions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens" ON user_push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tokens" ON user_push_tokens FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON notification_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON notification_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role queue" ON notification_queue FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 10 COMPLETE - RLS policies created';
END $$;

-- =====================================================
-- STEP 11: Create Functions
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 11: Creating Functions ===';
END $$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_notification_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_notification_preferences
  SET notification_count_today = notification_count_today + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 11 COMPLETE - Functions created';
END $$;

-- =====================================================
-- STEP 12: Create Triggers
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 12: Creating Triggers ===';
END $$;

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_subscriptions_updated_at
  BEFORE UPDATE ON creator_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 12 COMPLETE - Triggers created';
END $$;

-- =====================================================
-- STEP 13: Grant Permissions
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 13: Granting Permissions ===';
END $$;

GRANT SELECT, INSERT, UPDATE ON user_notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_push_tokens TO authenticated;
GRANT SELECT, UPDATE ON notification_logs TO authenticated;
GRANT ALL ON notification_queue TO service_role;

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 13 COMPLETE - Permissions granted';
END $$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  RAISE NOTICE '=== FINAL VERIFICATION ===';
  
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
    RAISE NOTICE '✅✅✅ SUCCESS! All 5 notification tables created! ✅✅✅';
  ELSE
    RAISE EXCEPTION 'FAILED: Only % of 5 tables were created', table_count;
  END IF;
END $$;

