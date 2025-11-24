-- Professional Networking Schema - Phase 1
-- SoundBridge Professional Networking Features (LinkedIn-style)
-- Date: November 24, 2025
-- 
-- This migration creates all tables, indexes, and RLS policies for:
-- - Posts system (posts, attachments, reactions, comments)
-- - Connections system (connections, connection requests)
-- - Profile enhancements (experience, skills, instruments)
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- This script is idempotent (safe to run multiple times)

-- ============================================================================
-- 1. POSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  visibility VARCHAR(20) NOT NULL DEFAULT 'connections' CHECK (visibility IN ('connections', 'public')),
  post_type VARCHAR(20) DEFAULT 'update' CHECK (post_type IN ('update', 'opportunity', 'achievement', 'collaboration', 'event')),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_event_id ON posts(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON posts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility_created_at ON posts(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_post_type_created_at ON posts(post_type, created_at DESC);

-- ============================================================================
-- 2. POST ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  attachment_type VARCHAR(20) NOT NULL CHECK (attachment_type IN ('image', 'audio')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),
  duration INTEGER, -- for audio, in seconds (max 60)
  thumbnail_url TEXT, -- for audio previews
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for post_attachments
CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id ON post_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_attachments_type ON post_attachments(attachment_type);

-- ============================================================================
-- 3. POST REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('support', 'love', 'fire', 'congrats')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One reaction per user per post (can change reaction type)
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for post_reactions
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_type ON post_reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id_type ON post_reactions(post_id, reaction_type);

-- ============================================================================
-- 4. POST COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- NULL for top-level, UUID for replies
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
);

-- Indexes for post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_deleted_at ON post_comments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created_at ON post_comments(post_id, created_at DESC);

-- ============================================================================
-- 5. COMMENT LIKES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- ============================================================================
-- 6. CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'blocked')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure user_id < connected_user_id to prevent duplicates
  CHECK (user_id < connected_user_id),
  UNIQUE(user_id, connected_user_id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (connected_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for connections
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_connected_user_id ON connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_user_id_status ON connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_connected_user_id_status ON connections(connected_user_id, status);

-- ============================================================================
-- 7. CONNECTION REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT, -- Optional message with request
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CHECK (requester_id != recipient_id)
);

-- Create partial unique index for pending requests (one pending request per pair)
CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_requests_unique_pending 
ON connection_requests(requester_id, recipient_id) 
WHERE status = 'pending';

-- Indexes for connection_requests
CREATE INDEX IF NOT EXISTS idx_connection_requests_requester ON connection_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_recipient ON connection_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_pending ON connection_requests(recipient_id, status) WHERE status = 'pending';

-- ============================================================================
-- 8. PROFILE EXPERIENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date DATE,
  end_date DATE, -- NULL for current
  description TEXT,
  collaborators UUID[], -- Array of user IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for profile_experience
CREATE INDEX IF NOT EXISTS idx_profile_experience_user_id ON profile_experience(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_experience_dates ON profile_experience(start_date DESC, end_date DESC);

-- ============================================================================
-- 9. PROFILE SKILLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, skill),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for profile_skills
CREATE INDEX IF NOT EXISTS idx_profile_skills_user_id ON profile_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill ON profile_skills(skill);

-- ============================================================================
-- 10. PROFILE INSTRUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, instrument),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for profile_instruments
CREATE INDEX IF NOT EXISTS idx_profile_instruments_user_id ON profile_instruments(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_instruments_instrument ON profile_instruments(instrument);

-- ============================================================================
-- 11. UPDATE PROFILES TABLE
-- ============================================================================

-- Add new columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_headline TEXT CHECK (char_length(professional_headline) <= 120);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_active_start INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_active_end INTEGER; -- NULL for current
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genres TEXT[]; -- Array of genre strings

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_instruments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POSTS RLS POLICIES
-- ============================================================================

-- Users can view posts from connections or public posts
DROP POLICY IF EXISTS "Users can view connection posts" ON posts;
CREATE POLICY "Users can view connection posts"
ON posts FOR SELECT
USING (
  deleted_at IS NULL AND (
    visibility = 'public' OR
    user_id IN (
      SELECT connected_user_id FROM connections WHERE user_id = auth.uid() AND status = 'connected'
      UNION
      SELECT user_id FROM connections WHERE connected_user_id = auth.uid() AND status = 'connected'
    ) OR
    user_id = auth.uid() -- Users can always see their own posts
  )
);

-- Users can only insert their own posts
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
CREATE POLICY "Users can insert own posts"
ON posts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only update their own posts
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (user_id = auth.uid());

-- Users can only delete their own posts
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- POST ATTACHMENTS RLS POLICIES
-- ============================================================================

-- Users can view attachments on visible posts
DROP POLICY IF EXISTS "Users can view attachments" ON post_attachments;
CREATE POLICY "Users can view attachments"
ON post_attachments FOR SELECT
USING (
  post_id IN (
    SELECT id FROM posts WHERE deleted_at IS NULL AND (
      visibility = 'public' OR
      user_id IN (
        SELECT connected_user_id FROM connections WHERE user_id = auth.uid() AND status = 'connected'
        UNION
        SELECT user_id FROM connections WHERE connected_user_id = auth.uid() AND status = 'connected'
      ) OR
      user_id = auth.uid()
    )
  )
);

-- Users can insert attachments for their own posts
DROP POLICY IF EXISTS "Users can insert own attachments" ON post_attachments;
CREATE POLICY "Users can insert own attachments"
ON post_attachments FOR INSERT
WITH CHECK (
  post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
);

-- Users can delete attachments for their own posts
DROP POLICY IF EXISTS "Users can delete own attachments" ON post_attachments;
CREATE POLICY "Users can delete own attachments"
ON post_attachments FOR DELETE
USING (
  post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
);

-- ============================================================================
-- POST REACTIONS RLS POLICIES
-- ============================================================================

-- Users can view all reactions
DROP POLICY IF EXISTS "Users can view reactions" ON post_reactions;
CREATE POLICY "Users can view reactions"
ON post_reactions FOR SELECT
USING (true);

-- Users can insert their own reactions
DROP POLICY IF EXISTS "Users can insert own reactions" ON post_reactions;
CREATE POLICY "Users can insert own reactions"
ON post_reactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own reactions
DROP POLICY IF EXISTS "Users can update own reactions" ON post_reactions;
CREATE POLICY "Users can update own reactions"
ON post_reactions FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own reactions
DROP POLICY IF EXISTS "Users can delete own reactions" ON post_reactions;
CREATE POLICY "Users can delete own reactions"
ON post_reactions FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- POST COMMENTS RLS POLICIES
-- ============================================================================

-- Users can view comments on visible posts
DROP POLICY IF EXISTS "Users can view comments" ON post_comments;
CREATE POLICY "Users can view comments"
ON post_comments FOR SELECT
USING (
  deleted_at IS NULL AND
  post_id IN (
    SELECT id FROM posts WHERE deleted_at IS NULL AND (
      visibility = 'public' OR
      user_id IN (
        SELECT connected_user_id FROM connections WHERE user_id = auth.uid() AND status = 'connected'
        UNION
        SELECT user_id FROM connections WHERE connected_user_id = auth.uid() AND status = 'connected'
      ) OR
      user_id = auth.uid()
    )
  )
);

-- Users can insert their own comments
DROP POLICY IF EXISTS "Users can insert own comments" ON post_comments;
CREATE POLICY "Users can insert own comments"
ON post_comments FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own comments
DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
CREATE POLICY "Users can update own comments"
ON post_comments FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;
CREATE POLICY "Users can delete own comments"
ON post_comments FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- COMMENT LIKES RLS POLICIES
-- ============================================================================

-- Users can view all comment likes
DROP POLICY IF EXISTS "Users can view comment likes" ON comment_likes;
CREATE POLICY "Users can view comment likes"
ON comment_likes FOR SELECT
USING (true);

-- Users can insert their own comment likes
DROP POLICY IF EXISTS "Users can insert own comment likes" ON comment_likes;
CREATE POLICY "Users can insert own comment likes"
ON comment_likes FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comment likes
DROP POLICY IF EXISTS "Users can delete own comment likes" ON comment_likes;
CREATE POLICY "Users can delete own comment likes"
ON comment_likes FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- CONNECTIONS RLS POLICIES
-- ============================================================================

-- Users can view their own connections
DROP POLICY IF EXISTS "Users can view own connections" ON connections;
CREATE POLICY "Users can view own connections"
ON connections FOR SELECT
USING (user_id = auth.uid() OR connected_user_id = auth.uid());

-- Note: Connections should only be created via API endpoint (not direct inserts)
-- API will use service role to bypass RLS

-- ============================================================================
-- CONNECTION REQUESTS RLS POLICIES
-- ============================================================================

-- Users can view requests they sent or received
DROP POLICY IF EXISTS "Users can view own requests" ON connection_requests;
CREATE POLICY "Users can view own requests"
ON connection_requests FOR SELECT
USING (requester_id = auth.uid() OR recipient_id = auth.uid());

-- Users can insert requests they send
DROP POLICY IF EXISTS "Users can insert own requests" ON connection_requests;
CREATE POLICY "Users can insert own requests"
ON connection_requests FOR INSERT
WITH CHECK (requester_id = auth.uid());

-- Recipients can update requests (accept/reject)
DROP POLICY IF EXISTS "Recipients can update requests" ON connection_requests;
CREATE POLICY "Recipients can update requests"
ON connection_requests FOR UPDATE
USING (recipient_id = auth.uid());

-- Requesters can cancel their own requests
DROP POLICY IF EXISTS "Requesters can cancel requests" ON connection_requests;
CREATE POLICY "Requesters can cancel requests"
ON connection_requests FOR UPDATE
USING (requester_id = auth.uid() AND status = 'cancelled');

-- ============================================================================
-- PROFILE EXPERIENCE RLS POLICIES
-- ============================================================================

-- Users can view all experience (public profiles)
DROP POLICY IF EXISTS "Users can view experience" ON profile_experience;
CREATE POLICY "Users can view experience"
ON profile_experience FOR SELECT
USING (true);

-- Users can only insert their own experience
DROP POLICY IF EXISTS "Users can insert own experience" ON profile_experience;
CREATE POLICY "Users can insert own experience"
ON profile_experience FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only update their own experience
DROP POLICY IF EXISTS "Users can update own experience" ON profile_experience;
CREATE POLICY "Users can update own experience"
ON profile_experience FOR UPDATE
USING (user_id = auth.uid());

-- Users can only delete their own experience
DROP POLICY IF EXISTS "Users can delete own experience" ON profile_experience;
CREATE POLICY "Users can delete own experience"
ON profile_experience FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- PROFILE SKILLS RLS POLICIES
-- ============================================================================

-- Users can view all skills (public profiles)
DROP POLICY IF EXISTS "Users can view skills" ON profile_skills;
CREATE POLICY "Users can view skills"
ON profile_skills FOR SELECT
USING (true);

-- Users can only insert their own skills
DROP POLICY IF EXISTS "Users can insert own skills" ON profile_skills;
CREATE POLICY "Users can insert own skills"
ON profile_skills FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only delete their own skills
DROP POLICY IF EXISTS "Users can delete own skills" ON profile_skills;
CREATE POLICY "Users can delete own skills"
ON profile_skills FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- PROFILE INSTRUMENTS RLS POLICIES
-- ============================================================================

-- Users can view all instruments (public profiles)
DROP POLICY IF EXISTS "Users can view instruments" ON profile_instruments;
CREATE POLICY "Users can view instruments"
ON profile_instruments FOR SELECT
USING (true);

-- Users can only insert their own instruments
DROP POLICY IF EXISTS "Users can insert own instruments" ON profile_instruments;
CREATE POLICY "Users can insert own instruments"
ON profile_instruments FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only delete their own instruments
DROP POLICY IF EXISTS "Users can delete own instruments" ON profile_instruments;
CREATE POLICY "Users can delete own instruments"
ON profile_instruments FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this query to verify all tables were created successfully
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'posts',
      'post_attachments',
      'post_reactions',
      'post_comments',
      'comment_likes',
      'connections',
      'connection_requests',
      'profile_experience',
      'profile_skills',
      'profile_instruments'
    );
  
  IF table_count = 10 THEN
    RAISE NOTICE '✅ SUCCESS! All 10 tables created successfully!';
    RAISE NOTICE 'Tables: posts, post_attachments, post_reactions, post_comments, comment_likes, connections, connection_requests, profile_experience, profile_skills, profile_instruments';
  ELSE
    RAISE WARNING '⚠️ WARNING: Expected 10 tables, found %', table_count;
  END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

