-- SoundBridge Database Schema Fixes
-- Fix all the missing columns and tables causing errors

-- 1. Add missing deleted_at column to audio_tracks table
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add missing deleted_at column to profiles table  
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Fix profiles.genre vs profiles.genres issue
-- First check if genre column exists, if not add it
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS genre VARCHAR(100) DEFAULT NULL;

-- 4. Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'listener',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_plays INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_events INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Add missing columns to audio_tracks table
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS cover_art_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Create trending_tracks view (since table doesn't exist)
CREATE OR REPLACE VIEW trending_tracks AS
SELECT 
    at.*,
    p.username,
    p.display_name,
    p.avatar_url,
    p.location,
    p.country
FROM audio_tracks at
JOIN profiles p ON at.creator_id = p.id
WHERE at.is_public = true 
    AND at.deleted_at IS NULL
    AND p.deleted_at IS NULL
ORDER BY (at.play_count + at.likes_count * 2 + at.shares_count * 3) DESC;

-- 7. Add missing columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS venue VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_gbp DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_ngn DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_attendees INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_id ON audio_tracks(creator_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_created_at ON audio_tracks(created_at);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_genre ON audio_tracks(genre);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_is_public ON audio_tracks(is_public);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_deleted_at ON audio_tracks(deleted_at);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- 9. Update existing records to have proper values
UPDATE profiles 
SET 
    display_name = COALESCE(display_name, username, 'User'),
    role = COALESCE(role, 'listener'),
    is_public = COALESCE(is_public, true),
    followers_count = COALESCE(followers_count, 0),
    following_count = COALESCE(following_count, 0),
    total_plays = COALESCE(total_plays, 0),
    total_likes = COALESCE(total_likes, 0),
    total_events = COALESCE(total_events, 0)
WHERE id IS NOT NULL;

UPDATE audio_tracks 
SET 
    is_public = COALESCE(is_public, true),
    play_count = COALESCE(play_count, 0),
    likes_count = COALESCE(likes_count, 0),
    comments_count = COALESCE(comments_count, 0),
    shares_count = COALESCE(shares_count, 0)
WHERE id IS NOT NULL;

-- 10. Create RLS policies for security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (is_public = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Audio tracks policies
DROP POLICY IF EXISTS "Public audio tracks are viewable by everyone" ON audio_tracks;
CREATE POLICY "Public audio tracks are viewable by everyone" ON audio_tracks
    FOR SELECT USING (is_public = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their own audio tracks" ON audio_tracks;
CREATE POLICY "Users can view their own audio tracks" ON audio_tracks
    FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can insert their own audio tracks" ON audio_tracks;
CREATE POLICY "Users can insert their own audio tracks" ON audio_tracks
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update their own audio tracks" ON audio_tracks;
CREATE POLICY "Users can update their own audio tracks" ON audio_tracks
    FOR UPDATE USING (auth.uid() = creator_id);

-- Events policies
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
CREATE POLICY "Public events are viewable by everyone" ON events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own events" ON events;
CREATE POLICY "Users can view their own events" ON events
    FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can insert their own events" ON events;
CREATE POLICY "Users can insert their own events" ON events
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE USING (auth.uid() = creator_id);

-- 11. Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audio_tracks_updated_at ON audio_tracks;
CREATE TRIGGER update_audio_tracks_updated_at BEFORE UPDATE ON audio_tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON trending_tracks TO anon, authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON audio_tracks TO authenticated;
GRANT ALL ON events TO authenticated;
