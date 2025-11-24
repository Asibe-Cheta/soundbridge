/**
 * Professional Networking - Performance Optimization Indexes
 * 
 * Additional indexes for optimal query performance
 * Run this after the main schema migration
 * 
 * NOTE: Some indexes require the pg_trgm extension for fuzzy text search.
 * If you don't have superuser privileges to enable it, the script will
 * skip those indexes and create regular B-tree indexes instead.
 */

-- ============================================================================
-- ENABLE EXTENSIONS (must be done first)
-- ============================================================================

-- Enable pg_trgm extension for fuzzy text search
-- Note: This requires superuser privileges. If you don't have permissions,
-- ask your database administrator to enable it, or skip the trigram indexes.
DO $$
BEGIN
  -- Try to create the extension
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  RAISE NOTICE '✅ pg_trgm extension enabled';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '⚠️  Cannot enable pg_trgm extension (requires superuser). Skipping trigram indexes.';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error enabling pg_trgm extension: %. Skipping trigram indexes.', SQLERRM;
END $$;

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Posts feed queries (user_id + visibility + created_at)
CREATE INDEX IF NOT EXISTS idx_posts_user_visibility_created 
ON posts(user_id, visibility, created_at DESC) 
WHERE deleted_at IS NULL;

-- Posts by type and visibility (for opportunity feeds)
CREATE INDEX IF NOT EXISTS idx_posts_type_visibility_created 
ON posts(post_type, visibility, created_at DESC) 
WHERE deleted_at IS NULL;

-- Post reactions lookup (post_id + user_id for quick user reaction check)
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_user 
ON post_reactions(post_id, user_id);

-- Post reactions count queries (post_id + reaction_type)
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_type 
ON post_reactions(post_id, reaction_type);

-- Comments with replies (post_id + parent_comment_id)
CREATE INDEX IF NOT EXISTS idx_post_comments_post_parent 
ON post_comments(post_id, parent_comment_id) 
WHERE deleted_at IS NULL;

-- Comments count queries
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created 
ON post_comments(post_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Connection requests by recipient and status
CREATE INDEX IF NOT EXISTS idx_connection_requests_recipient_status 
ON connection_requests(recipient_id, status, created_at DESC);

-- Connection requests by requester and status
CREATE INDEX IF NOT EXISTS idx_connection_requests_requester_status 
ON connection_requests(requester_id, status, created_at DESC);

-- Connections lookup (both directions)
CREATE INDEX IF NOT EXISTS idx_connections_user_connected 
ON connections(user_id, connected_user_id);

CREATE INDEX IF NOT EXISTS idx_connections_connected_user 
ON connections(connected_user_id, user_id);

-- Profile search (display_name, username, professional_headline)
-- Only create trigram indexes if pg_trgm extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm 
    ON profiles USING gin(display_name gin_trgm_ops);
    RAISE NOTICE '✅ Created trigram index on profiles.display_name';
    
    CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm 
    ON profiles USING gin(username gin_trgm_ops);
    RAISE NOTICE '✅ Created trigram index on profiles.username';
    
    CREATE INDEX IF NOT EXISTS idx_profiles_headline_trgm 
    ON profiles USING gin(professional_headline gin_trgm_ops);
    RAISE NOTICE '✅ Created trigram index on profiles.professional_headline';
  ELSE
    RAISE NOTICE '⚠️  pg_trgm extension not available. Skipping trigram indexes for profiles.';
    -- Create regular B-tree indexes as fallback
    CREATE INDEX IF NOT EXISTS idx_profiles_display_name_btree 
    ON profiles(display_name) WHERE display_name IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_profiles_username_btree 
    ON profiles(username) WHERE username IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_profiles_headline_btree 
    ON profiles(professional_headline) WHERE professional_headline IS NOT NULL;
    RAISE NOTICE '✅ Created B-tree indexes for profiles (fallback)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error creating profile search indexes: %.', SQLERRM;
END $$;

-- Profile location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_country_location 
ON profiles(country, location) 
WHERE country IS NOT NULL;

-- Experience queries (user_id + dates for sorting)
CREATE INDEX IF NOT EXISTS idx_profile_experience_user_dates 
ON profile_experience(user_id, start_date DESC, end_date DESC NULLS LAST);

-- Skills and instruments lookup
CREATE INDEX IF NOT EXISTS idx_profile_skills_user_skill 
ON profile_skills(user_id, skill);

CREATE INDEX IF NOT EXISTS idx_profile_instruments_user_instrument 
ON profile_instruments(user_id, instrument);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES (if pg_trgm extension is available)
-- ============================================================================

-- Post content search (only if pg_trgm is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_content_trgm 
    ON posts USING gin(content gin_trgm_ops) 
    WHERE deleted_at IS NULL;
    RAISE NOTICE '✅ Created trigram index on posts.content';
  ELSE
    RAISE NOTICE '⚠️  pg_trgm extension not available. Skipping trigram index on posts.content.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error creating trigram index on posts.content: %. Skipping.', SQLERRM;
END $$;

-- ============================================================================
-- COVERING INDEXES FOR COMMON SELECT QUERIES
-- ============================================================================

-- Posts with author info (covering index for feed queries)
-- Note: Supabase/PostgREST doesn't support covering indexes directly,
-- but we can optimize with partial indexes

-- Posts by visibility and type (for public/opportunity feeds)
-- Note: INCLUDE clause requires PostgreSQL 11+. If you get an error,
-- remove the INCLUDE clause and use a regular index.
DO $$
BEGIN
  -- Try with INCLUDE (PostgreSQL 11+)
  CREATE INDEX IF NOT EXISTS idx_posts_visibility_type_created_covering 
  ON posts(visibility, post_type, created_at DESC) 
  INCLUDE (id, user_id, content) 
  WHERE deleted_at IS NULL;
  RAISE NOTICE '✅ Created covering index on posts';
EXCEPTION
  WHEN syntax_error OR feature_not_supported THEN
    -- Fallback for older PostgreSQL versions
    CREATE INDEX IF NOT EXISTS idx_posts_visibility_type_created 
    ON posts(visibility, post_type, created_at DESC) 
    WHERE deleted_at IS NULL;
    RAISE NOTICE '✅ Created index on posts (without INCLUDE clause)';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error creating index on posts: %.', SQLERRM;
END $$;

-- ============================================================================
-- STATISTICS UPDATES
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE posts;
ANALYZE post_reactions;
ANALYZE post_comments;
ANALYZE connections;
ANALYZE connection_requests;
ANALYZE profiles;
ANALYZE profile_experience;
ANALYZE profile_skills;
ANALYZE profile_instruments;

-- ============================================================================
-- NOTES
-- ============================================================================

-- These indexes are designed to optimize:
-- 1. Feed queries (posts by user, visibility, type, date)
-- 2. Reaction/comment lookups and counts
-- 3. Connection queries (requests, mutual connections)
-- 4. Profile search (name, headline, location)
-- 5. Experience/skills/instruments queries

-- Monitor index usage with:
-- SELECT schemaname, tablename, indexname, idx_scan 
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY idx_scan DESC;

-- If an index has low usage (idx_scan < 100), consider removing it
-- to reduce write overhead.

