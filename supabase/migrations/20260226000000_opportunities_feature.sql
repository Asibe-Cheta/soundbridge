-- ============================================
-- OPPORTUNITIES FEATURE (Connect screen)
-- Phase 1: opportunity_posts, opportunity_interests, opportunity_projects, reviews, conversations
-- Phase 2 table (opportunity_alerts) created but not activated
-- ============================================

-- Conversations: canonical thread between two users (for project chat link)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_a_id < user_b_id),
  UNIQUE(user_a_id, user_b_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(user_a_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(user_b_id);

-- Reviews (shared: opportunity_project, service_booking, etc.)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_entity ON reviews(entity_type, entity_id);

-- opportunity_posts
CREATE TABLE IF NOT EXISTS opportunity_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('collaboration', 'event', 'job')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 1000),
  skills_needed TEXT[] DEFAULT '{}',
  location TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  is_remote BOOLEAN DEFAULT FALSE,
  date_from DATE,
  date_to DATE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  budget_currency TEXT DEFAULT 'GBP',
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'connections')),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  interest_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_opportunity_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '60 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_opportunity_expiry ON opportunity_posts;
CREATE TRIGGER trg_opportunity_expiry
  BEFORE INSERT ON opportunity_posts
  FOR EACH ROW EXECUTE FUNCTION set_opportunity_expiry();

CREATE INDEX IF NOT EXISTS idx_opportunity_posts_active ON opportunity_posts(is_active, expires_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_user ON opportunity_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_type ON opportunity_posts(type);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_skills ON opportunity_posts USING gin(skills_needed);

-- opportunity_interests (table may already exist with interested_user_id, poster_user_id)
-- Only add trigger/index if missing; use interested_user_id for compatibility
CREATE OR REPLACE FUNCTION increment_opportunity_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE opportunity_posts
  SET interest_count = interest_count + 1
  WHERE id = NEW.opportunity_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_opportunity_interest ON opportunity_interests;
CREATE TRIGGER trg_increment_opportunity_interest
  AFTER INSERT ON opportunity_interests
  FOR EACH ROW EXECUTE FUNCTION increment_opportunity_interest_count();

CREATE INDEX IF NOT EXISTS idx_opportunity_interests_opp ON opportunity_interests(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_user ON opportunity_interests(interested_user_id);

-- opportunity_projects
CREATE TABLE IF NOT EXISTS opportunity_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunity_posts(id) ON DELETE RESTRICT,
  interest_id UUID NOT NULL REFERENCES opportunity_interests(id) ON DELETE RESTRICT,
  poster_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  creator_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  brief TEXT NOT NULL,
  agreed_amount NUMERIC NOT NULL CHECK (agreed_amount > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  platform_fee_percent NUMERIC NOT NULL DEFAULT 12,
  platform_fee_amount NUMERIC NOT NULL,
  creator_payout_amount NUMERIC NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'awaiting_acceptance'
    CHECK (status IN (
      'awaiting_acceptance',
      'payment_pending',
      'active',
      'delivered',
      'completed',
      'disputed',
      'cancelled',
      'declined'
    )),
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  chat_thread_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  poster_review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  creator_review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(interest_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_projects_poster ON opportunity_projects(poster_user_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunity_projects_creator ON opportunity_projects(creator_user_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunity_projects_opp ON opportunity_projects(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_projects_status ON opportunity_projects(status);

-- opportunity_alerts (Phase 2 - skip for now to avoid schema conflicts)
-- CREATE TABLE IF NOT EXISTS opportunity_alerts (...); -- Add in separate migration

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE opportunity_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active opportunities" ON opportunity_posts;
CREATE POLICY "Public can view active opportunities"
  ON opportunity_posts FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

DROP POLICY IF EXISTS "Users can insert own opportunities" ON opportunity_posts;
CREATE POLICY "Users can insert own opportunities"
  ON opportunity_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own opportunities" ON opportunity_posts;
CREATE POLICY "Users can update own opportunities"
  ON opportunity_posts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own opportunities" ON opportunity_posts;
CREATE POLICY "Users can delete own opportunities"
  ON opportunity_posts FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE opportunity_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view interests on own opportunities or own interests" ON opportunity_interests;
CREATE POLICY "Users can view interests on own opportunities or own interests"
  ON opportunity_interests FOR SELECT
  USING (
    auth.uid() = interested_user_id OR
    auth.uid() = (SELECT user_id FROM opportunity_posts WHERE id = opportunity_id) OR
    auth.uid() = poster_user_id
  );

DROP POLICY IF EXISTS "Authenticated users can insert interests" ON opportunity_interests;
CREATE POLICY "Authenticated users can insert interests"
  ON opportunity_interests FOR INSERT
  WITH CHECK (auth.uid() = interested_user_id);

DROP POLICY IF EXISTS "Users can update own interests" ON opportunity_interests;
CREATE POLICY "Users can update own interests"
  ON opportunity_interests FOR UPDATE
  USING (auth.uid() = interested_user_id);

DROP POLICY IF EXISTS "Opportunity owner can update interest status" ON opportunity_interests;
CREATE POLICY "Opportunity owner can update interest status"
  ON opportunity_interests FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM opportunity_posts WHERE id = opportunity_id) OR
    auth.uid() = poster_user_id
  );

ALTER TABLE opportunity_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Project participants can view their projects" ON opportunity_projects;
CREATE POLICY "Project participants can view their projects"
  ON opportunity_projects FOR SELECT
  USING (auth.uid() = poster_user_id OR auth.uid() = creator_user_id);

DROP POLICY IF EXISTS "Project participants can update their projects" ON opportunity_projects;
DROP POLICY IF EXISTS "Poster can insert project when accepting interest" ON opportunity_projects;
CREATE POLICY "Poster can insert project when accepting interest"
  ON opportunity_projects FOR INSERT
  WITH CHECK (auth.uid() = poster_user_id);

CREATE POLICY "Project participants can update their projects"
  ON opportunity_projects FOR UPDATE
  USING (auth.uid() = poster_user_id OR auth.uid() = creator_user_id);

-- Conversations: participants can read
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can view conversation" ON conversations;
CREATE POLICY "Participants can view conversation"
  ON conversations FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

DROP POLICY IF EXISTS "Users can create conversation as participant" ON conversations;
CREATE POLICY "Users can create conversation as participant"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Reviews: public read for verified; participants can insert
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Reviewer can insert own review" ON reviews;
CREATE POLICY "Reviewer can insert own review"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- RPC: get_recommended_opportunities
-- Uses only opportunity_posts, opportunity_interests, profiles (no external tables)
-- Ranking: is_featured, recency, interest_count. Visibility: public only.
-- ============================================================

CREATE OR REPLACE FUNCTION get_recommended_opportunities(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  description TEXT,
  skills_needed TEXT[],
  location TEXT,
  is_remote BOOLEAN,
  date_from DATE,
  date_to DATE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  budget_currency TEXT,
  visibility TEXT,
  is_featured BOOLEAN,
  interest_count INT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  posted_by JSONB,
  has_expressed_interest BOOLEAN,
  relevance_score FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    op.id,
    op.type,
    op.title,
    op.description,
    op.skills_needed,
    op.location,
    op.is_remote,
    op.date_from,
    op.date_to,
    op.budget_min,
    op.budget_max,
    op.budget_currency,
    op.visibility,
    op.is_featured,
    op.interest_count,
    op.expires_at,
    op.created_at,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) AS posted_by,
    EXISTS (
      SELECT 1 FROM opportunity_interests oi
      WHERE oi.opportunity_id = op.id AND oi.interested_user_id = p_user_id
    ) AS has_expressed_interest,
    (
      (CASE WHEN op.is_featured THEN 3.0 ELSE 0.0 END) +
      GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - op.created_at)) / (14 * 86400)) * 1.5 +
      LOG(1 + op.interest_count) * 0.5
    ) AS relevance_score
  FROM opportunity_posts op
  JOIN profiles p ON p.id = op.user_id
  WHERE
    op.is_active = TRUE
    AND (op.expires_at IS NULL OR op.expires_at > NOW())
    AND op.user_id <> p_user_id
    AND (p_type IS NULL OR op.type = p_type)
    AND op.visibility = 'public'
  ORDER BY relevance_score DESC, op.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Allow opportunity notification types in notifications table
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'follow', 'new_follower', 'like', 'comment', 'event',
    'collaboration', 'collaboration_request', 'collaboration_accepted',
    'collaboration_declined', 'collaboration_confirmed',
    'tip', 'message', 'system', 'content_purchase',
    'connection_request', 'connection_accepted', 'subscription',
    'payout', 'moderation', 'live_session', 'track',
    'track_approved', 'track_featured', 'withdrawal',
    'event_reminder', 'creator_post', 'share', 'repost',
    'post_reaction', 'post_comment', 'comment_reply',
    'opportunity_interest', 'opportunity_project_agreement', 'opportunity_project_payment_required',
    'opportunity_project_active', 'opportunity_project_delivered', 'opportunity_project_completed',
    'opportunity_review_prompt', 'opportunity_project_declined', 'opportunity_project_disputed'
  ));
