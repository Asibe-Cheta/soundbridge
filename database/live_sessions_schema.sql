-- ============================================
-- LIVE AUDIO SESSIONS SCHEMA
-- ============================================
-- Purpose: Enable live audio streaming (Clubhouse/Twitter Spaces style)
-- Features: Broadcast & Interactive rooms, live comments, live tipping
-- Status: Production Ready
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: live_sessions
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '📋 Creating live_sessions table...';
END $$;

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Creator info
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Session details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('broadcast', 'interactive')),
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  
  -- Scheduling
  scheduled_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  -- Settings
  max_speakers INTEGER DEFAULT 10,
  allow_recording BOOLEAN DEFAULT TRUE,
  recording_url TEXT,
  
  -- Engagement metrics
  peak_listener_count INTEGER DEFAULT 0,
  total_tips_amount DECIMAL(10, 2) DEFAULT 0,
  total_comments_count INTEGER DEFAULT 0,
  
  -- Technical (Agora.io or other streaming service)
  agora_channel_name VARCHAR(255),
  agora_token TEXT,
  agora_token_expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for live_sessions
CREATE INDEX IF NOT EXISTS idx_live_sessions_creator ON live_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled_start ON live_sessions(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_live_sessions_live ON live_sessions(status) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS idx_live_sessions_created_at ON live_sessions(created_at DESC);

DO $$ 
BEGIN 
  RAISE NOTICE '✅ live_sessions table created';
END $$;

-- ============================================
-- TABLE 2: live_session_participants
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '📋 Creating live_session_participants table...';
END $$;

CREATE TABLE IF NOT EXISTS live_session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Participant role
  role VARCHAR(50) DEFAULT 'listener' CHECK (role IN ('host', 'speaker', 'listener')),
  
  -- Status
  is_speaking BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  hand_raised BOOLEAN DEFAULT FALSE,
  hand_raised_at TIMESTAMPTZ,
  
  -- Engagement
  total_tips_sent DECIMAL(10, 2) DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  
  -- Ensure unique active participation
  UNIQUE(session_id, user_id)
);

-- Indexes for live_session_participants
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON live_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON live_session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_role ON live_session_participants(session_id, role);
CREATE INDEX IF NOT EXISTS idx_session_participants_hand_raised ON live_session_participants(session_id) WHERE hand_raised = TRUE;
CREATE INDEX IF NOT EXISTS idx_session_participants_active ON live_session_participants(session_id) WHERE left_at IS NULL;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ live_session_participants table created';
END $$;

-- ============================================
-- TABLE 3: live_session_comments
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '📋 Creating live_session_comments table...';
END $$;

CREATE TABLE IF NOT EXISTS live_session_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  comment_type VARCHAR(50) DEFAULT 'text' CHECK (comment_type IN ('text', 'emoji', 'system')),
  
  -- Moderation
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for live_session_comments
CREATE INDEX IF NOT EXISTS idx_session_comments_session ON live_session_comments(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_comments_user ON live_session_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_session_comments_pinned ON live_session_comments(session_id) WHERE is_pinned = TRUE;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ live_session_comments table created';
END $$;

-- ============================================
-- TABLE 4: live_session_tips
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '📋 Creating live_session_tips table...';
END $$;

CREATE TABLE IF NOT EXISTS live_session_tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  tipper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Tip details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Platform fee (10-20%)
  platform_fee_percentage DECIMAL(5, 2) DEFAULT 15.00,
  platform_fee_amount DECIMAL(10, 2),
  creator_amount DECIMAL(10, 2),
  
  -- Message
  message TEXT,
  
  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for live_session_tips
CREATE INDEX IF NOT EXISTS idx_session_tips_session ON live_session_tips(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tips_tipper ON live_session_tips(tipper_id);
CREATE INDEX IF NOT EXISTS idx_session_tips_creator ON live_session_tips(creator_id);
CREATE INDEX IF NOT EXISTS idx_session_tips_status ON live_session_tips(status);
CREATE INDEX IF NOT EXISTS idx_session_tips_created_at ON live_session_tips(created_at DESC);

DO $$ 
BEGIN 
  RAISE NOTICE '✅ live_session_tips table created';
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔒 Setting up RLS policies...';
END $$;

-- Enable RLS on all tables
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_session_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_session_tips ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: live_sessions
-- ============================================

-- Anyone can view live sessions
DROP POLICY IF EXISTS "Anyone can view live sessions" ON live_sessions;
CREATE POLICY "Anyone can view live sessions"
  ON live_sessions FOR SELECT
  USING (true);

-- Creators can insert their own sessions
DROP POLICY IF EXISTS "Creators can create sessions" ON live_sessions;
CREATE POLICY "Creators can create sessions"
  ON live_sessions FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own sessions
DROP POLICY IF EXISTS "Creators can update own sessions" ON live_sessions;
CREATE POLICY "Creators can update own sessions"
  ON live_sessions FOR UPDATE
  USING (auth.uid() = creator_id);

-- Creators can delete their own sessions
DROP POLICY IF EXISTS "Creators can delete own sessions" ON live_sessions;
CREATE POLICY "Creators can delete own sessions"
  ON live_sessions FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================
-- RLS POLICIES: live_session_participants
-- ============================================

-- Anyone can view participants
DROP POLICY IF EXISTS "Anyone can view participants" ON live_session_participants;
CREATE POLICY "Anyone can view participants"
  ON live_session_participants FOR SELECT
  USING (true);

-- Users can join sessions (insert themselves)
DROP POLICY IF EXISTS "Users can join sessions" ON live_session_participants;
CREATE POLICY "Users can join sessions"
  ON live_session_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own participation
DROP POLICY IF EXISTS "Users can update own participation" ON live_session_participants;
CREATE POLICY "Users can update own participation"
  ON live_session_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Session creators can update any participant (for moderation)
DROP POLICY IF EXISTS "Creators can moderate participants" ON live_session_participants;
CREATE POLICY "Creators can moderate participants"
  ON live_session_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_participants.session_id
      AND live_sessions.creator_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES: live_session_comments
-- ============================================

-- Anyone can view comments
DROP POLICY IF EXISTS "Anyone can view comments" ON live_session_comments;
CREATE POLICY "Anyone can view comments"
  ON live_session_comments FOR SELECT
  USING (true);

-- Authenticated users can post comments
DROP POLICY IF EXISTS "Users can post comments" ON live_session_comments;
CREATE POLICY "Users can post comments"
  ON live_session_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
DROP POLICY IF EXISTS "Users can update own comments" ON live_session_comments;
CREATE POLICY "Users can update own comments"
  ON live_session_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Session creators can moderate comments
DROP POLICY IF EXISTS "Creators can moderate comments" ON live_session_comments;
CREATE POLICY "Creators can moderate comments"
  ON live_session_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_comments.session_id
      AND live_sessions.creator_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES: live_session_tips
-- ============================================

-- Users can view tips for sessions they're in
DROP POLICY IF EXISTS "Users can view session tips" ON live_session_tips;
CREATE POLICY "Users can view session tips"
  ON live_session_tips FOR SELECT
  USING (
    auth.uid() = tipper_id OR
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM live_session_participants
      WHERE live_session_participants.session_id = live_session_tips.session_id
      AND live_session_participants.user_id = auth.uid()
    )
  );

-- Users can send tips
DROP POLICY IF EXISTS "Users can send tips" ON live_session_tips;
CREATE POLICY "Users can send tips"
  ON live_session_tips FOR INSERT
  WITH CHECK (auth.uid() = tipper_id);

DO $$ 
BEGIN 
  RAISE NOTICE '✅ RLS policies configured';
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '⚙️ Creating helper functions...';
END $$;

-- Function to increment session tips
CREATE OR REPLACE FUNCTION increment_session_tips(
  session_id UUID,
  tip_amount DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE live_sessions
  SET total_tips_amount = total_tips_amount + tip_amount
  WHERE id = session_id;
END;
$$;

-- Function to increment session comments count
CREATE OR REPLACE FUNCTION increment_session_comments(
  session_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE live_sessions
  SET total_comments_count = total_comments_count + 1
  WHERE id = session_id;
END;
$$;

-- Function to get active listener count
CREATE OR REPLACE FUNCTION get_active_listener_count(
  session_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  listener_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO listener_count
  FROM live_session_participants
  WHERE live_session_participants.session_id = get_active_listener_count.session_id
  AND left_at IS NULL;
  
  RETURN listener_count;
END;
$$;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Helper functions created';
END $$;

-- ============================================
-- TRIGGERS
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '⚡ Setting up triggers...';
END $$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_live_sessions_updated_at ON live_sessions;
CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to increment comments count when comment is added
CREATE OR REPLACE FUNCTION increment_comments_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM increment_session_comments(NEW.session_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_comments_count ON live_session_comments;
CREATE TRIGGER increment_comments_count
  AFTER INSERT ON live_session_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_comments_on_insert();

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Triggers configured';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '🔍 Verifying schema...';
END $$;

-- Verify all tables exist
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name IN (
    'live_sessions',
    'live_session_participants',
    'live_session_comments',
    'live_session_tips'
  );
  
  IF table_count = 4 THEN
    RAISE NOTICE '✅ All 4 tables created successfully';
  ELSE
    RAISE NOTICE '⚠️ Only % tables found (expected 4)', table_count;
  END IF;
END $$;

-- ============================================
-- COMPLETION
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LIVE SESSIONS SCHEMA DEPLOYED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables Created:';
  RAISE NOTICE '   1. live_sessions';
  RAISE NOTICE '   2. live_session_participants';
  RAISE NOTICE '   3. live_session_comments';
  RAISE NOTICE '   4. live_session_tips';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS Policies: Configured';
  RAISE NOTICE '⚡ Triggers: Active';
  RAISE NOTICE '⚙️ Functions: Ready';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready for live audio sessions!';
  RAISE NOTICE '';
END $$;

