-- ============================================
-- PERSONALIZED DISCOVERY - SCHEMA FIXES
-- ============================================
-- Fixes all database schema issues reported by Mobile Team
-- Date: October 6, 2025
-- Priority: HIGH - Critical for personalized discovery
-- ============================================

-- ============================================
-- PART 1: FIX AUDIO_TRACKS TABLE
-- ============================================

-- Add updated_at column (required by existing trigger)
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add audio_url column (alias for file_url for mobile compatibility)
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add artwork_url column (alias for cover_art_url)
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS artwork_url TEXT;

-- Update audio_url to match file_url for existing records
UPDATE audio_tracks 
SET audio_url = file_url 
WHERE audio_url IS NULL AND file_url IS NOT NULL;

-- Update artwork_url to match cover_art_url for existing records
UPDATE audio_tracks 
SET artwork_url = cover_art_url 
WHERE artwork_url IS NULL AND cover_art_url IS NOT NULL;

-- Create a trigger to keep audio_url and file_url in sync
CREATE OR REPLACE FUNCTION sync_audio_urls()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_url IS NOT NULL AND NEW.audio_url IS NULL THEN
    NEW.audio_url = NEW.file_url;
  END IF;
  IF NEW.audio_url IS NOT NULL AND NEW.file_url IS NULL THEN
    NEW.file_url = NEW.audio_url;
  END IF;
  IF NEW.cover_art_url IS NOT NULL AND NEW.artwork_url IS NULL THEN
    NEW.artwork_url = NEW.cover_art_url;
  END IF;
  IF NEW.artwork_url IS NOT NULL AND NEW.cover_art_url IS NULL THEN
    NEW.cover_art_url = NEW.artwork_url;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_audio_urls_trigger ON audio_tracks;
CREATE TRIGGER sync_audio_urls_trigger
  BEFORE INSERT OR UPDATE ON audio_tracks
  FOR EACH ROW
  EXECUTE FUNCTION sync_audio_urls();

-- ============================================
-- PART 2: FIX EVENTS TABLE
-- ============================================

-- Add country column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Add ticket_price column (universal price column)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10,2);

-- Add tickets_available column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS tickets_available INTEGER DEFAULT 0;

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE INDEX IF NOT EXISTS idx_events_date_country ON events(event_date, country);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(location);

-- Populate country from location for existing events (best effort)
-- This updates events with common city patterns
UPDATE events 
SET country = 'Nigeria' 
WHERE country IS NULL 
  AND (location ILIKE '%lagos%' 
    OR location ILIKE '%abuja%' 
    OR location ILIKE '%nigeria%');

UPDATE events 
SET country = 'United Kingdom' 
WHERE country IS NULL 
  AND (location ILIKE '%london%' 
    OR location ILIKE '%manchester%' 
    OR location ILIKE '%birmingham%' 
    OR location ILIKE '%uk%'
    OR location ILIKE '%england%');

UPDATE events 
SET country = 'United States' 
WHERE country IS NULL 
  AND (location ILIKE '%new york%' 
    OR location ILIKE '%los angeles%' 
    OR location ILIKE '%chicago%' 
    OR location ILIKE '%usa%'
    OR location ILIKE '%california%'
    OR location ILIKE '%texas%');

UPDATE events 
SET country = 'Canada' 
WHERE country IS NULL 
  AND (location ILIKE '%toronto%' 
    OR location ILIKE '%vancouver%' 
    OR location ILIKE '%montreal%' 
    OR location ILIKE '%canada%');

UPDATE events 
SET country = 'Ghana' 
WHERE country IS NULL 
  AND (location ILIKE '%accra%' 
    OR location ILIKE '%kumasi%' 
    OR location ILIKE '%ghana%');

UPDATE events 
SET country = 'South Africa' 
WHERE country IS NULL 
  AND (location ILIKE '%johannesburg%' 
    OR location ILIKE '%cape town%' 
    OR location ILIKE '%durban%' 
    OR location ILIKE '%south africa%');

-- ============================================
-- PART 3: VERIFY GENRES SYSTEM EXISTS
-- ============================================

-- Note: These tables should already exist from CREATE_GENRES_SYSTEM.sql
-- This section just verifies and creates them if somehow missing

-- Genres table
CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('music', 'podcast')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User genres junction table
CREATE TABLE IF NOT EXISTS user_genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE NOT NULL,
    preference_strength INTEGER DEFAULT 1 CHECK (preference_strength BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, genre_id)
);

-- Content genres junction table
CREATE TABLE IF NOT EXISTS content_genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'podcast', 'event', 'audio_track')),
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, content_type, genre_id)
);

-- Add 'audio_track' as a valid content_type (for mobile compatibility)
-- Drop and recreate the check constraint to include 'audio_track'
ALTER TABLE content_genres DROP CONSTRAINT IF EXISTS content_genres_content_type_check;
ALTER TABLE content_genres ADD CONSTRAINT content_genres_content_type_check 
  CHECK (content_type IN ('track', 'audio_track', 'podcast', 'event'));

-- ============================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Genres indexes
CREATE INDEX IF NOT EXISTS idx_genres_category ON genres(category);
CREATE INDEX IF NOT EXISTS idx_genres_active ON genres(is_active);
CREATE INDEX IF NOT EXISTS idx_genres_sort_order ON genres(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_genres_name ON genres(name);

-- User genres indexes
CREATE INDEX IF NOT EXISTS idx_user_genres_user_id ON user_genres(user_id);
CREATE INDEX IF NOT EXISTS idx_user_genres_genre_id ON user_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_user_genres_user_genre ON user_genres(user_id, genre_id);

-- Content genres indexes
CREATE INDEX IF NOT EXISTS idx_content_genres_content ON content_genres(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_genres_genre_id ON content_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_content_genres_type_genre ON content_genres(content_type, genre_id);
CREATE INDEX IF NOT EXISTS idx_content_genres_lookup ON content_genres(content_type, genre_id, content_id);

-- Audio tracks indexes for personalization
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_public ON audio_tracks(creator_id, is_public);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_play_count ON audio_tracks(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_created_at ON audio_tracks(created_at DESC);

-- ============================================
-- PART 5: ENABLE ROW LEVEL SECURITY (if not already enabled)
-- ============================================

ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_genres ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 6: CREATE RLS POLICIES
-- ============================================

-- Genres policies (public read)
DROP POLICY IF EXISTS "Genres are viewable by everyone" ON genres;
CREATE POLICY "Genres are viewable by everyone"
    ON genres FOR SELECT
    USING (is_active = true);

-- User genres policies (users can manage their own)
DROP POLICY IF EXISTS "Users can view their own genre preferences" ON user_genres;
CREATE POLICY "Users can view their own genre preferences"
    ON user_genres FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own genre preferences" ON user_genres;
CREATE POLICY "Users can insert their own genre preferences"
    ON user_genres FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own genre preferences" ON user_genres;
CREATE POLICY "Users can update their own genre preferences"
    ON user_genres FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own genre preferences" ON user_genres;
CREATE POLICY "Users can delete their own genre preferences"
    ON user_genres FOR DELETE
    USING (auth.uid() = user_id);

-- Content genres policies (public read, creators can manage)
DROP POLICY IF EXISTS "Content genres are viewable by everyone" ON content_genres;
CREATE POLICY "Content genres are viewable by everyone"
    ON content_genres FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Creators can manage their content genres" ON content_genres;
CREATE POLICY "Creators can manage their content genres"
    ON content_genres FOR ALL
    USING (
        CASE content_type
            WHEN 'audio_track' THEN EXISTS (
                SELECT 1 FROM audio_tracks 
                WHERE id = content_id AND creator_id = auth.uid()
            )
            WHEN 'track' THEN EXISTS (
                SELECT 1 FROM audio_tracks 
                WHERE id = content_id AND creator_id = auth.uid()
            )
            WHEN 'event' THEN EXISTS (
                SELECT 1 FROM events 
                WHERE id = content_id AND creator_id = auth.uid()
            )
            ELSE false
        END
    );

-- ============================================
-- PART 7: CREATE HELPER FUNCTIONS FOR MOBILE APP
-- ============================================

-- Function to get personalized tracks for a user
CREATE OR REPLACE FUNCTION get_personalized_tracks(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    creator_id UUID,
    audio_url TEXT,
    file_url TEXT,
    artwork_url TEXT,
    cover_art_url TEXT,
    duration INTEGER,
    genre VARCHAR,
    play_count INTEGER,
    likes_count INTEGER,
    is_public BOOLEAN,
    created_at TIMESTAMPTZ,
    creator_name VARCHAR,
    creator_avatar TEXT,
    matched_genres INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        at.id,
        at.title,
        at.description,
        at.creator_id,
        at.audio_url,
        at.file_url,
        at.artwork_url,
        at.cover_art_url,
        at.duration,
        at.genre,
        at.play_count,
        at.likes_count,
        at.is_public,
        at.created_at,
        p.display_name::VARCHAR AS creator_name,
        p.avatar_url AS creator_avatar,
        COUNT(DISTINCT cg.genre_id)::INTEGER AS matched_genres
    FROM audio_tracks at
    JOIN profiles p ON at.creator_id = p.id
    LEFT JOIN content_genres cg ON cg.content_id = at.id 
        AND cg.content_type IN ('audio_track', 'track')
    LEFT JOIN user_genres ug ON ug.genre_id = cg.genre_id 
        AND ug.user_id = p_user_id
    WHERE at.is_public = true
        AND (at.deleted_at IS NULL OR at.deleted_at IS NULL)
        AND (ug.genre_id IS NOT NULL OR cg.genre_id IS NULL) -- Match user genres or untagged content
    GROUP BY at.id, at.title, at.description, at.creator_id, at.audio_url, 
             at.file_url, at.artwork_url, at.cover_art_url, at.duration, 
             at.genre, at.play_count, at.likes_count, at.is_public, 
             at.created_at, p.display_name, p.avatar_url
    ORDER BY matched_genres DESC, at.play_count DESC, at.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get personalized events for a user
CREATE OR REPLACE FUNCTION get_personalized_events(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    creator_id UUID,
    event_date TIMESTAMPTZ,
    location VARCHAR,
    country VARCHAR,
    venue VARCHAR,
    category VARCHAR,
    ticket_price DECIMAL,
    image_url TEXT,
    likes_count INTEGER,
    created_at TIMESTAMPTZ,
    organizer_name VARCHAR,
    organizer_avatar TEXT,
    matched_genres INTEGER,
    is_local BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        e.id,
        e.title,
        e.description,
        e.creator_id,
        e.event_date,
        e.location,
        e.country,
        e.venue,
        e.category::VARCHAR,
        e.ticket_price,
        e.image_url,
        e.likes_count,
        e.created_at,
        p.display_name::VARCHAR AS organizer_name,
        p.avatar_url AS organizer_avatar,
        COUNT(DISTINCT cg.genre_id)::INTEGER AS matched_genres,
        (e.country = (SELECT country FROM profiles WHERE id = p_user_id))::BOOLEAN AS is_local
    FROM events e
    JOIN profiles p ON e.creator_id = p.id
    LEFT JOIN content_genres cg ON cg.content_id = e.id 
        AND cg.content_type = 'event'
    LEFT JOIN user_genres ug ON ug.genre_id = cg.genre_id 
        AND ug.user_id = p_user_id
    WHERE e.event_date >= NOW()
        AND (ug.genre_id IS NOT NULL 
            OR e.country = (SELECT country FROM profiles WHERE id = p_user_id)
            OR cg.genre_id IS NULL) -- Match genres, location, or untagged content
    GROUP BY e.id, e.title, e.description, e.creator_id, e.event_date, 
             e.location, e.country, e.venue, e.category, e.ticket_price, 
             e.image_url, e.likes_count, e.created_at, p.display_name, p.avatar_url
    ORDER BY is_local DESC, matched_genres DESC, e.event_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 8: GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT ON genres TO authenticated;
GRANT ALL ON user_genres TO authenticated;
GRANT SELECT ON content_genres TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_personalized_tracks TO authenticated;
GRANT EXECUTE ON FUNCTION get_personalized_events TO authenticated;

-- ============================================
-- PART 9: SAMPLE DATA FOR TESTING
-- ============================================

-- This section adds sample genre relationships for existing content
-- Run this only if you want to populate test data

-- Get some genre IDs (assuming genres already exist from CREATE_GENRES_SYSTEM.sql)
DO $$
DECLARE
    afrobeat_id UUID;
    hiphop_id UUID;
    jazz_id UUID;
    gospel_id UUID;
    pop_id UUID;
BEGIN
    -- Get genre IDs
    SELECT id INTO afrobeat_id FROM genres WHERE name = 'Afrobeat' LIMIT 1;
    SELECT id INTO hiphop_id FROM genres WHERE name = 'Hip-Hop' LIMIT 1;
    SELECT id INTO jazz_id FROM genres WHERE name = 'Jazz' LIMIT 1;
    SELECT id INTO gospel_id FROM genres WHERE name = 'Gospel' LIMIT 1;
    SELECT id INTO pop_id FROM genres WHERE name = 'Pop' LIMIT 1;

    -- Link some audio tracks to genres (random sample)
    -- Only if genre IDs exist
    IF afrobeat_id IS NOT NULL THEN
        INSERT INTO content_genres (content_id, content_type, genre_id)
        SELECT id, 'audio_track', afrobeat_id
        FROM audio_tracks
        WHERE genre ILIKE '%afro%' OR genre ILIKE '%beat%'
        LIMIT 10
        ON CONFLICT (content_id, content_type, genre_id) DO NOTHING;
    END IF;

    IF hiphop_id IS NOT NULL THEN
        INSERT INTO content_genres (content_id, content_type, genre_id)
        SELECT id, 'audio_track', hiphop_id
        FROM audio_tracks
        WHERE genre ILIKE '%hip%' OR genre ILIKE '%rap%'
        LIMIT 10
        ON CONFLICT (content_id, content_type, genre_id) DO NOTHING;
    END IF;

    IF jazz_id IS NOT NULL THEN
        INSERT INTO content_genres (content_id, content_type, genre_id)
        SELECT id, 'audio_track', jazz_id
        FROM audio_tracks
        WHERE genre ILIKE '%jazz%'
        LIMIT 10
        ON CONFLICT (content_id, content_type, genre_id) DO NOTHING;
    END IF;

    IF gospel_id IS NOT NULL THEN
        INSERT INTO content_genres (content_id, content_type, genre_id)
        SELECT id, 'audio_track', gospel_id
        FROM audio_tracks
        WHERE genre ILIKE '%gospel%' OR genre ILIKE '%christian%'
        LIMIT 10
        ON CONFLICT (content_id, content_type, genre_id) DO NOTHING;
    END IF;

    IF pop_id IS NOT NULL THEN
        INSERT INTO content_genres (content_id, content_type, genre_id)
        SELECT id, 'audio_track', pop_id
        FROM audio_tracks
        WHERE genre ILIKE '%pop%'
        LIMIT 10
        ON CONFLICT (content_id, content_type, genre_id) DO NOTHING;
    END IF;

    RAISE NOTICE 'Sample genre relationships created successfully';
END $$;

-- ============================================
-- PART 10: VERIFICATION QUERIES
-- ============================================

-- Run these to verify the schema is correct

-- Check audio_tracks has required columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audio_tracks' AND column_name = 'audio_url'
    ) THEN
        RAISE EXCEPTION 'audio_tracks.audio_url column missing!';
    END IF;
    RAISE NOTICE '✅ audio_tracks.audio_url exists';
END $$;

-- Check events has country column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'country'
    ) THEN
        RAISE EXCEPTION 'events.country column missing!';
    END IF;
    RAISE NOTICE '✅ events.country exists';
END $$;

-- Check content_genres table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'content_genres'
    ) THEN
        RAISE EXCEPTION 'content_genres table missing!';
    END IF;
    RAISE NOTICE '✅ content_genres table exists';
END $$;

-- Check genres table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'genres'
    ) THEN
        RAISE EXCEPTION 'genres table missing!';
    END IF;
    RAISE NOTICE '✅ genres table exists';
END $$;

-- Check user_genres table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_genres'
    ) THEN
        RAISE EXCEPTION 'user_genres table missing!';
    END IF;
    RAISE NOTICE '✅ user_genres table exists';
END $$;

-- Show counts
SELECT 
    'Genres' as table_name, 
    COUNT(*) as record_count 
FROM genres
UNION ALL
SELECT 
    'User Genres' as table_name, 
    COUNT(*) as record_count 
FROM user_genres
UNION ALL
SELECT 
    'Content Genres' as table_name, 
    COUNT(*) as record_count 
FROM content_genres
UNION ALL
SELECT 
    'Audio Tracks' as table_name, 
    COUNT(*) as record_count 
FROM audio_tracks
UNION ALL
SELECT 
    'Events' as table_name, 
    COUNT(*) as record_count 
FROM events;

-- ============================================
-- COMPLETE!
-- ============================================

-- All schema fixes applied successfully
-- Mobile app should now be able to:
-- 1. Query personalized tracks based on user genres
-- 2. Query personalized events based on user location
-- 3. Use audio_url field for track playback
-- 4. Filter content by genre relationships
-- 5. Get location-based event recommendations

RAISE NOTICE '🎉 Personalized Discovery Schema - ALL FIXES APPLIED SUCCESSFULLY!';

