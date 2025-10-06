-- ============================================
-- GENRES SYSTEM - COMPLETE IMPLEMENTATION
-- ============================================
-- Comprehensive genre management system for SoundBridge
-- Supports music + podcasts, user preferences, and smart recommendations
-- Date: October 5, 2025
-- ============================================

-- Step 1: Create genres table
-- ============================================
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

-- Step 2: Create user_genres junction table
-- ============================================
CREATE TABLE IF NOT EXISTS user_genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE NOT NULL,
    preference_strength INTEGER DEFAULT 1 CHECK (preference_strength BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, genre_id)
);

-- Step 3: Create content_genres junction table
-- ============================================
CREATE TABLE IF NOT EXISTS content_genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'podcast', 'event')),
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, content_type, genre_id)
);

-- Step 4: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_genres_category ON genres(category);
CREATE INDEX IF NOT EXISTS idx_genres_active ON genres(is_active);
CREATE INDEX IF NOT EXISTS idx_genres_sort_order ON genres(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_genres_name ON genres(name);

CREATE INDEX IF NOT EXISTS idx_user_genres_user_id ON user_genres(user_id);
CREATE INDEX IF NOT EXISTS idx_user_genres_genre_id ON user_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_user_genres_user_genre ON user_genres(user_id, genre_id);

CREATE INDEX IF NOT EXISTS idx_content_genres_content ON content_genres(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_genres_genre_id ON content_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_content_genres_type_genre ON content_genres(content_type, genre_id);

-- Step 5: Enable Row Level Security
-- ============================================
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_genres ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
-- ============================================

-- Genres policies (public read, admin write)
DROP POLICY IF EXISTS "Genres are viewable by everyone" ON genres;
DROP POLICY IF EXISTS "Only admins can modify genres" ON genres;

CREATE POLICY "Genres are viewable by everyone"
    ON genres FOR SELECT
    USING (is_active = true);

CREATE POLICY "Only admins can modify genres"
    ON genres FOR ALL
    USING (false); -- Only service role can modify

-- User genres policies
DROP POLICY IF EXISTS "Users can view their own genre preferences" ON user_genres;
DROP POLICY IF EXISTS "Users can manage their own genre preferences" ON user_genres;

CREATE POLICY "Users can view their own genre preferences"
    ON user_genres FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own genre preferences"
    ON user_genres FOR ALL
    USING (auth.uid() = user_id);

-- Content genres policies
DROP POLICY IF EXISTS "Content genres are viewable by everyone" ON content_genres;
DROP POLICY IF EXISTS "Content owners can manage their content genres" ON content_genres;

CREATE POLICY "Content genres are viewable by everyone"
    ON content_genres FOR SELECT
    USING (true);

CREATE POLICY "Content owners can manage their content genres"
    ON content_genres FOR ALL
    USING (
        CASE content_type
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

-- Step 7: Create helper functions
-- ============================================

-- Function to validate max 5 genres per user
CREATE OR REPLACE FUNCTION check_user_genre_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM user_genres WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Users can select a maximum of 5 genres';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for genre limit
DROP TRIGGER IF EXISTS enforce_user_genre_limit ON user_genres;
CREATE TRIGGER enforce_user_genre_limit
    BEFORE INSERT ON user_genres
    FOR EACH ROW
    EXECUTE FUNCTION check_user_genre_limit();

-- Function to get popular genres by location
CREATE OR REPLACE FUNCTION get_popular_genres_by_location(
    p_country VARCHAR DEFAULT NULL,
    p_location VARCHAR DEFAULT NULL,
    p_category VARCHAR DEFAULT 'music',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    genre_id UUID,
    genre_name VARCHAR,
    user_count BIGINT,
    content_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as genre_id,
        g.name as genre_name,
        COUNT(DISTINCT ug.user_id) as user_count,
        COUNT(DISTINCT cg.content_id) as content_count
    FROM genres g
    LEFT JOIN user_genres ug ON g.id = ug.genre_id
    LEFT JOIN profiles p ON ug.user_id = p.id
    LEFT JOIN content_genres cg ON g.id = cg.genre_id
    WHERE g.category = p_category
        AND g.is_active = true
        AND (p_country IS NULL OR p.country = p_country)
        AND (p_location IS NULL OR p.location = p_location)
    GROUP BY g.id, g.name
    ORDER BY user_count DESC, content_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Populate MUSIC genres
-- ============================================

-- African Music
INSERT INTO genres (name, category, description, sort_order) VALUES
('Afrobeat', 'music', 'Nigerian-originated genre blending jazz, funk, and traditional African music', 1),
('Afrobeats', 'music', 'Contemporary African pop music with global appeal', 2),
('Amapiano', 'music', 'South African house music subgenre with jazz and lounge influences', 3),
('Highlife', 'music', 'Ghanaian music genre that originated in the early 20th century', 4),
('Bongo Flava', 'music', 'Tanzanian hip hop and R&B music', 5),
('Kwaito', 'music', 'South African music genre with house beats and African sounds', 6),
('Soukous', 'music', 'Congolese dance music with guitar-driven melodies', 7),
('Makossa', 'music', 'Cameroonian urban music genre', 8),
('Juju', 'music', 'Nigerian popular music style derived from traditional Yoruba music', 9),
('Fuji', 'music', 'Nigerian musical genre based on traditional Yoruba music', 10)
ON CONFLICT (name) DO NOTHING;

-- Gospel & Christian
INSERT INTO genres (name, category, description, sort_order) VALUES
('Contemporary Gospel', 'music', 'Modern Christian music with contemporary sounds', 11),
('Traditional Gospel', 'music', 'Classic Christian music with traditional arrangements', 12),
('Praise & Worship', 'music', 'Christian music focused on worship and praise', 13),
('Christian Hip-Hop', 'music', 'Hip-hop music with Christian themes and messages', 14),
('Gospel Afrobeat', 'music', 'Gospel music with Afrobeat influences', 15)
ON CONFLICT (name) DO NOTHING;

-- Hip-Hop & Rap
INSERT INTO genres (name, category, description, sort_order) VALUES
('Hip-Hop', 'music', 'Urban music genre with rhythmic speech and beats', 16),
('Trap', 'music', 'Hip-hop subgenre with heavy bass and hi-hats', 17),
('Drill', 'music', 'Hip-hop subgenre with dark, violent themes', 18),
('Old School Hip-Hop', 'music', 'Classic hip-hop from the 1970s-1980s', 19),
('Conscious Rap', 'music', 'Hip-hop focused on social and political issues', 20),
('Afro-Trap', 'music', 'Trap music with African influences', 21)
ON CONFLICT (name) DO NOTHING;

-- R&B & Soul
INSERT INTO genres (name, category, description, sort_order) VALUES
('R&B', 'music', 'Rhythm and blues music with soulful vocals', 22),
('Contemporary R&B', 'music', 'Modern R&B with contemporary production', 23),
('Neo-Soul', 'music', 'Modern soul music with alternative influences', 24),
('Classic Soul', 'music', 'Traditional soul music from the 1960s-1970s', 25),
('Afro-R&B', 'music', 'R&B music with African influences', 26)
ON CONFLICT (name) DO NOTHING;

-- Pop & Electronic
INSERT INTO genres (name, category, description, sort_order) VALUES
('Pop', 'music', 'Popular music with mainstream appeal', 27),
('Afro-Pop', 'music', 'Pop music with African influences', 28),
('Dance Pop', 'music', 'Pop music designed for dancing', 29),
('Electronic', 'music', 'Music produced using electronic instruments', 30),
('House', 'music', 'Electronic dance music with four-on-the-floor beats', 31),
('Afro-House', 'music', 'House music with African influences', 32),
('Deep House', 'music', 'House music subgenre with complex melodies', 33),
('Techno', 'music', 'Electronic dance music with repetitive beats', 34),
('EDM', 'music', 'Electronic dance music for festivals and clubs', 35)
ON CONFLICT (name) DO NOTHING;

-- Other Music Genres
INSERT INTO genres (name, category, description, sort_order) VALUES
('Rock', 'music', 'Rock music with guitar-driven sound', 36),
('Alternative Rock', 'music', 'Rock music outside mainstream conventions', 37),
('Indie Rock', 'music', 'Independent rock music', 38),
('Jazz', 'music', 'American musical style with improvisation', 39),
('Afro-Jazz', 'music', 'Jazz music with African influences', 40),
('Reggae', 'music', 'Jamaican music genre with offbeat rhythms', 41),
('Dancehall', 'music', 'Jamaican popular music genre', 42),
('Country', 'music', 'American folk music with rural themes', 43),
('Blues', 'music', 'American music genre with blue notes', 44),
('Classical', 'music', 'Traditional Western art music', 45),
('Folk', 'music', 'Traditional music passed down through generations', 46),
('World Music', 'music', 'Traditional and contemporary music from around the world', 47),
('Instrumental', 'music', 'Music without vocals', 48),
('Spoken Word', 'music', 'Performance art combining writing and live performance', 49)
ON CONFLICT (name) DO NOTHING;

-- Step 9: Populate PODCAST genres
-- ============================================

INSERT INTO genres (name, category, description, sort_order) VALUES
('News & Politics', 'podcast', 'Current events and political discussions', 50),
('Business', 'podcast', 'Entrepreneurship, finance, and business topics', 51),
('Technology', 'podcast', 'Tech news, reviews, and discussions', 52),
('Health & Wellness', 'podcast', 'Physical and mental health topics', 53),
('Comedy', 'podcast', 'Humorous content and entertainment', 54),
('True Crime', 'podcast', 'Real criminal cases and investigations', 55),
('Education', 'podcast', 'Learning and educational content', 56),
('Sports', 'podcast', 'Sports news, analysis, and discussions', 57),
('Music', 'podcast', 'Music industry news and artist interviews', 58),
('Arts & Culture', 'podcast', 'Creative arts and cultural topics', 59),
('Religion & Spirituality', 'podcast', 'Faith-based and spiritual content', 60),
('History', 'podcast', 'Historical events and stories', 61),
('Science', 'podcast', 'Scientific discoveries and discussions', 62),
('Personal Development', 'podcast', 'Self-improvement and growth', 63),
('Entertainment', 'podcast', 'Pop culture and entertainment news', 64),
('Lifestyle', 'podcast', 'Daily life, relationships, and personal topics', 65)
ON CONFLICT (name) DO NOTHING;

-- Step 10: Create analytics view for genre popularity
-- ============================================

CREATE OR REPLACE VIEW genre_analytics AS
SELECT 
    g.id as genre_id,
    g.name as genre_name,
    g.category,
    COUNT(DISTINCT ug.user_id) as user_count,
    COUNT(DISTINCT cg.content_id) as content_count,
    COUNT(DISTINCT CASE WHEN cg.content_type = 'track' THEN cg.content_id END) as track_count,
    COUNT(DISTINCT CASE WHEN cg.content_type = 'podcast' THEN cg.content_id END) as podcast_count,
    g.created_at
FROM genres g
LEFT JOIN user_genres ug ON g.id = ug.genre_id
LEFT JOIN content_genres cg ON g.id = cg.genre_id
WHERE g.is_active = true
GROUP BY g.id, g.name, g.category, g.created_at;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('genres', 'user_genres', 'content_genres')
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('genres', 'user_genres', 'content_genres');

-- Check how many genres were inserted
SELECT 
    category,
    COUNT(*) as genre_count
FROM genres
GROUP BY category
ORDER BY category;

-- Check all policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('genres', 'user_genres', 'content_genres')
ORDER BY tablename, policyname;

-- ============================================
-- EXAMPLE QUERIES FOR MOBILE TEAM
-- ============================================

-- Get all music genres
-- SELECT * FROM genres WHERE category = 'music' AND is_active = true ORDER BY sort_order;

-- Get all podcast genres
-- SELECT * FROM genres WHERE category = 'podcast' AND is_active = true ORDER BY sort_order;

-- Get user's genre preferences
-- SELECT g.* FROM genres g
-- JOIN user_genres ug ON g.id = ug.genre_id
-- WHERE ug.user_id = 'USER_ID_HERE';

-- Get popular genres in Nigeria
-- SELECT * FROM get_popular_genres_by_location('Nigeria', NULL, 'music', 10);

-- Get content by genre and location
-- SELECT DISTINCT at.*, p.display_name as creator_name
-- FROM audio_tracks at
-- JOIN profiles p ON at.creator_id = p.id
-- JOIN content_genres cg ON at.id = cg.content_id
-- WHERE cg.genre_id IN ('GENRE_ID_1', 'GENRE_ID_2')
--   AND p.country = 'Nigeria'
--   AND at.is_public = true
-- ORDER BY at.play_count DESC
-- LIMIT 20;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Genres system created successfully!';
    RAISE NOTICE '✅ Tables: genres, user_genres, content_genres';
    RAISE NOTICE '✅ Populated: 49 music genres + 16 podcast genres';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Next steps for mobile team:';
    RAISE NOTICE '1. Integrate genre selection in onboarding';
    RAISE NOTICE '2. Use API endpoints for genre preferences';
    RAISE NOTICE '3. Implement personalized content discovery';
    RAISE NOTICE '';
    RAISE NOTICE '🎵 Genres system is now ready for use!';
END $$;
