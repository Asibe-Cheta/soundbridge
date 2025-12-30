-- Performance indexes for API endpoints
-- These indexes dramatically improve query performance for subscription/status and revenue/summary endpoints

-- ============================================
-- Indexes for /api/subscription/status
-- ============================================

-- Profiles table (subscription data)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- User subscriptions table
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status_created ON user_subscriptions(user_id, status, created_at DESC);

-- Audio tracks table (usage statistics)
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_id ON audio_tracks(creator_id);
-- Only create deleted_at index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audio_tracks' AND column_name = 'deleted_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_deleted ON audio_tracks(creator_id, deleted_at);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_created ON audio_tracks(creator_id, created_at DESC);

-- Events table
CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events(creator_id);
-- Only create deleted_at index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'deleted_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_creator_deleted ON events(creator_id, deleted_at);
  END IF;
END $$;

-- Follows table (followers count)
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Creator revenue table
CREATE INDEX IF NOT EXISTS idx_creator_revenue_user_id ON creator_revenue(user_id);

-- ============================================
-- Indexes for /api/revenue/summary
-- ============================================

-- User wallets table
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

-- Tip analytics table (revenue calculations)
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_id ON tip_analytics(creator_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_created_at ON tip_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_status ON tip_analytics(status);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_status ON tip_analytics(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_date ON tip_analytics(creator_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_status_date ON tip_analytics(creator_id, status, created_at);

-- Wallet transactions table
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_type ON wallet_transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_status ON wallet_transactions(user_id, status);

-- ============================================
-- Indexes for /api/user/usage-statistics
-- ============================================

-- User usage table
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);

-- ============================================
-- Comments
-- ============================================

-- Comment only if index exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_audio_tracks_creator_deleted'
  ) THEN
    COMMENT ON INDEX idx_audio_tracks_creator_deleted IS 
      'Composite index for filtering tracks by creator and deleted status. Critical for /api/subscription/status performance.';
  END IF;
END $$;

COMMENT ON INDEX idx_tip_analytics_creator_status_date IS 
  'Composite index for revenue summary calculations. Enables fast filtering by creator, status, and date range.';

