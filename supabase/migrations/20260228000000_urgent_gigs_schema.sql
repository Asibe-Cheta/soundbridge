-- Urgent Gigs: schema for real-time location-matched gigs (WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md)
-- Creates prerequisite tables (opportunity_posts, opportunity_interests, opportunity_projects, etc.) if they
-- do not exist, so this migration can be run standalone. Also creates profile_skills and profiles.genres for matching.
--
-- =============================================================================
-- CONTEXT: Events matching (for alignment with existing event notification flow)
-- =============================================================================
-- Event notifications use a similar location + preference matching pattern:
--   - RPC: find_nearby_users_for_event(p_event_id, p_max_distance_km)
--     (see migrations 20260108000000, 20260118000000, 20260208100001, 20260211100001)
--   - Location: events (city, latitude, longitude), profiles (city, latitude, longitude)
--   - Preferences: notification_preferences (enabled, event_notifications_enabled,
--     preferred_event_genres, start_hour, end_hour), user_notification_preferences (legacy)
--   - Push: user_push_tokens (push_token, user_id, active, last_used_at)
--   - Quota/audit: notification_history (user_id, event_id, type, sent_at) or
--     check_notification_quota(p_user_id, p_daily_limit)
--   - Haversine in SQL: 6371 * acos(cos(radians(lat1))*cos(radians(lat2))*...)
--
-- Urgent gigs parallel:
--   - Matching in app: urgent-gig-matching.ts (Haversine in lib/haversine.ts)
--   - Location: opportunity_posts (location_lat, location_lng), user_availability (current_lat/lng, general_area)
--   - Preferences: user_availability (available_for_urgent_gigs, availability_schedule, dnd_start/end, max_notifications_per_day)
--   - Push: same user_push_tokens
--   - Quota: notification_rate_limits (this migration)
-- =============================================================================

-- =============================================================================
-- 0. Prerequisites: create tables that this migration depends on (IF NOT EXISTS)
--    Requires: profiles table (from Supabase Auth / earlier migration)
-- =============================================================================

-- Conversations (referenced by opportunity_projects.chat_thread_id)
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

-- Reviews (referenced by opportunity_projects)
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

-- opportunity_posts (required for urgent gigs)
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
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_active ON opportunity_posts(is_active, expires_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_user ON opportunity_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_type ON opportunity_posts(type);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_skills ON opportunity_posts USING gin(skills_needed);

-- opportunity_interests (required for opportunity_projects FK; urgent gigs use interest_id NULL)
CREATE TABLE IF NOT EXISTS opportunity_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunity_posts(id) ON DELETE RESTRICT,
  interested_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poster_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_opp ON opportunity_interests(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_user ON opportunity_interests(interested_user_id);

-- opportunity_projects (required for gig_ratings, disputes)
CREATE TABLE IF NOT EXISTS opportunity_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunity_posts(id) ON DELETE RESTRICT,
  interest_id UUID REFERENCES opportunity_interests(id) ON DELETE RESTRICT,
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
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_opportunity_projects_poster ON opportunity_projects(poster_user_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunity_projects_creator ON opportunity_projects(creator_user_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunity_projects_opp ON opportunity_projects(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_projects_status ON opportunity_projects(status);

-- profile_skills (for urgent gig matching; references profiles)
CREATE TABLE IF NOT EXISTS profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill)
);
CREATE INDEX IF NOT EXISTS idx_profile_skills_user_id ON profile_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill ON profile_skills(skill);

-- profiles.genres (for matching; add if missing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genres TEXT[];

-- user_push_tokens (shared with events matching; used by urgent-gig matching for Expo push)
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform VARCHAR(20) CHECK (platform IS NULL OR platform IN ('ios', 'android', 'web')),
  device_id TEXT,
  active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON user_push_tokens(user_id, active) WHERE active = true;

-- notification_history (shared with events matching; quota/audit for sent notifications)
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_type_date ON notification_history(user_id, type, sent_at DESC);

-- =============================================================================
-- 1. Extend opportunity_posts for urgent gigs (ADD COLUMN only; table may already have more columns)
-- =============================================================================
ALTER TABLE opportunity_posts
  ADD COLUMN IF NOT EXISTS gig_type TEXT NOT NULL DEFAULT 'planned'
    CHECK (gig_type IN ('urgent', 'planned')),
  ADD COLUMN IF NOT EXISTS skill_required TEXT,
  ADD COLUMN IF NOT EXISTS genre TEXT[],
  ADD COLUMN IF NOT EXISTS location_radius_km INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS duration_hours DECIMAL(4, 1),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'escrowed', 'released', 'refunded')),
  ADD COLUMN IF NOT EXISTS selected_provider_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS urgent_status TEXT
    CHECK (urgent_status IS NULL OR urgent_status IN ('searching', 'confirmed', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS date_needed TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_address TEXT;

-- location_lat, location_lng, expires_at already exist on opportunity_posts

CREATE INDEX IF NOT EXISTS idx_opportunity_posts_gig_type ON opportunity_posts (gig_type);
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_urgent_status ON opportunity_posts (urgent_status)
  WHERE urgent_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_location ON opportunity_posts (location_lat, location_lng)
  WHERE location_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunity_posts_expires_at ON opportunity_posts (expires_at)
  WHERE expires_at IS NOT NULL;

-- Allow urgent gig projects without an opportunity_interest (no interest_id)
ALTER TABLE opportunity_projects ALTER COLUMN interest_id DROP NOT NULL;
ALTER TABLE opportunity_projects DROP CONSTRAINT IF EXISTS opportunity_projects_interest_id_key;

-- =============================================================================
-- 2. user_availability
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_availability (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  available_for_urgent_gigs BOOLEAN NOT NULL DEFAULT false,
  current_lat               DECIMAL(10, 7),
  current_lng               DECIMAL(10, 7),
  general_area              TEXT,
  general_area_lat          DECIMAL(10, 7),
  general_area_lng          DECIMAL(10, 7),
  max_radius_km             INTEGER NOT NULL DEFAULT 20,
  hourly_rate               DECIMAL(10, 2),
  per_gig_rate              DECIMAL(10, 2),
  rate_negotiable           BOOLEAN NOT NULL DEFAULT false,
  availability_schedule      JSONB,
  dnd_start                 TIME,
  dnd_end                   TIME,
  max_notifications_per_day INTEGER NOT NULL DEFAULT 5,
  last_location_update      TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_availability_active
  ON user_availability (available_for_urgent_gigs, current_lat, current_lng)
  WHERE available_for_urgent_gigs = true;

ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own availability" ON user_availability;
CREATE POLICY "Users can view their own availability"
  ON user_availability FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own availability" ON user_availability;
CREATE POLICY "Users can insert their own availability"
  ON user_availability FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own availability" ON user_availability;
CREATE POLICY "Users can update their own availability"
  ON user_availability FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 3. gig_responses (urgent gig responses; separate from opportunity_interests)
-- =============================================================================
CREATE TABLE IF NOT EXISTS gig_responses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id                 UUID NOT NULL REFERENCES opportunity_posts(id) ON DELETE CASCADE,
  provider_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  response_time_seconds  INTEGER,
  message                TEXT,
  notified_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gig_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_gig_responses_gig_id ON gig_responses (gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_responses_provider ON gig_responses (provider_id, status);

ALTER TABLE gig_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requester can view responses to their gigs" ON gig_responses;
CREATE POLICY "Requester can view responses to their gigs"
  ON gig_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM opportunity_posts op
      WHERE op.id = gig_responses.gig_id AND op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Provider can view their own responses" ON gig_responses;
CREATE POLICY "Provider can view their own responses"
  ON gig_responses FOR SELECT
  USING (provider_id = auth.uid());

-- =============================================================================
-- 4. gig_ratings
-- =============================================================================
CREATE TABLE IF NOT EXISTS gig_ratings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  UUID NOT NULL REFERENCES opportunity_projects(id) ON DELETE CASCADE,
  rater_id                    UUID NOT NULL REFERENCES profiles(id),
  ratee_id                    UUID NOT NULL REFERENCES profiles(id),
  overall_rating              SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  professionalism_rating      SMALLINT NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 5),
  punctuality_rating          SMALLINT NOT NULL CHECK (punctuality_rating BETWEEN 1 AND 5),
  quality_rating              SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  payment_promptness_rating   SMALLINT CHECK (payment_promptness_rating BETWEEN 1 AND 5),
  review_text                 TEXT CHECK (char_length(review_text) <= 1000),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, rater_id),
  CHECK (rater_id != ratee_id)
);

CREATE INDEX IF NOT EXISTS idx_gig_ratings_ratee ON gig_ratings (ratee_id);
CREATE INDEX IF NOT EXISTS idx_gig_ratings_project ON gig_ratings (project_id);

ALTER TABLE gig_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings visible after both parties submit" ON gig_ratings;
CREATE POLICY "Ratings visible after both parties submit"
  ON gig_ratings FOR SELECT
  USING (
    (SELECT COUNT(*) FROM gig_ratings gr2 WHERE gr2.project_id = gig_ratings.project_id) = 2
    OR rater_id = auth.uid()
  );

DROP POLICY IF EXISTS "Only rater can insert" ON gig_ratings;
CREATE POLICY "Only rater can insert"
  ON gig_ratings FOR INSERT
  WITH CHECK (rater_id = auth.uid());

-- =============================================================================
-- 5. notification_rate_limits
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  gig_id           UUID REFERENCES opportunity_posts(id),
  action           TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_rate_limits_user_day
  ON notification_rate_limits (user_id, notification_type, sent_at);

-- =============================================================================
-- 6. disputes
-- =============================================================================
CREATE TABLE IF NOT EXISTS disputes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES opportunity_projects(id),
  raised_by             UUID NOT NULL REFERENCES profiles(id),
  against               UUID NOT NULL REFERENCES profiles(id),
  reason                TEXT NOT NULL,
  description           TEXT NOT NULL,
  evidence_urls         TEXT[],
  status                TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved_refund', 'resolved_release', 'resolved_split')),
  counter_response      TEXT,
  counter_evidence_urls TEXT[],
  resolution_notes      TEXT,
  split_percent         SMALLINT,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view their disputes" ON disputes;
CREATE POLICY "Parties can view their disputes"
  ON disputes FOR SELECT
  USING (raised_by = auth.uid() OR against = auth.uid());

DROP POLICY IF EXISTS "Raiser can create dispute" ON disputes;
CREATE POLICY "Raiser can create dispute"
  ON disputes FOR INSERT
  WITH CHECK (raised_by = auth.uid());

DROP POLICY IF EXISTS "Against party can update counter response" ON disputes;
CREATE POLICY "Against party can update counter response"
  ON disputes FOR UPDATE
  USING (against = auth.uid());
