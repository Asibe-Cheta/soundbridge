-- ============================================
-- PLAYLISTS FEATURE - DATABASE SETUP
-- ============================================
-- Run this script in Supabase SQL Editor to create playlists tables
-- Date: October 5, 2025
-- Status: Ready to execute
-- ============================================

-- Step 1: Create playlists table
-- ============================================
CREATE TABLE IF NOT EXISTS playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    cover_image_url TEXT,
    tracks_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- in seconds
    followers_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create playlist_tracks junction table
-- ============================================
CREATE TABLE IF NOT EXISTS playlist_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, track_id)
);

-- Step 3: Create indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_playlists_creator_id ON playlists(creator_id);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON playlists(is_public);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);

-- Step 4: Create trigger for updated_at timestamp
-- ============================================
-- Note: This assumes update_updated_at_column() function already exists
-- If not, uncomment the function creation below

-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlists_updated_at 
    BEFORE UPDATE ON playlists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies for playlists
-- ============================================
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON playlists;
DROP POLICY IF EXISTS "Users can insert their own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update their own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can delete their own playlists" ON playlists;

-- Create new policies
CREATE POLICY "Public playlists are viewable by everyone" 
    ON playlists 
    FOR SELECT 
    USING (is_public = true OR auth.uid() = creator_id);

CREATE POLICY "Users can insert their own playlists" 
    ON playlists 
    FOR INSERT 
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own playlists" 
    ON playlists 
    FOR UPDATE 
    USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own playlists" 
    ON playlists 
    FOR DELETE 
    USING (auth.uid() = creator_id);

-- Step 7: Create RLS Policies for playlist_tracks
-- ============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Playlist tracks are viewable by playlist owner" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can manage tracks in their own playlists" ON playlist_tracks;

-- Create new policies
CREATE POLICY "Playlist tracks are viewable by playlist owner" 
    ON playlist_tracks 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM playlists 
            WHERE id = playlist_id 
            AND (is_public = true OR creator_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage tracks in their own playlists" 
    ON playlist_tracks 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM playlists 
            WHERE id = playlist_id 
            AND creator_id = auth.uid()
        )
    );

-- Step 8: Create helper functions for automatic counts
-- ============================================

-- Function to update tracks_count and total_duration when tracks are added/removed
CREATE OR REPLACE FUNCTION update_playlist_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update playlist counts when track is added
        UPDATE playlists
        SET 
            tracks_count = tracks_count + 1,
            total_duration = total_duration + COALESCE((
                SELECT duration FROM audio_tracks WHERE id = NEW.track_id
            ), 0)
        WHERE id = NEW.playlist_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update playlist counts when track is removed
        UPDATE playlists
        SET 
            tracks_count = GREATEST(tracks_count - 1, 0),
            total_duration = GREATEST(total_duration - COALESCE((
                SELECT duration FROM audio_tracks WHERE id = OLD.track_id
            ), 0), 0)
        WHERE id = OLD.playlist_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic count updates
DROP TRIGGER IF EXISTS update_playlist_counts_on_insert ON playlist_tracks;
DROP TRIGGER IF EXISTS update_playlist_counts_on_delete ON playlist_tracks;

CREATE TRIGGER update_playlist_counts_on_insert
    AFTER INSERT ON playlist_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_counts();

CREATE TRIGGER update_playlist_counts_on_delete
    AFTER DELETE ON playlist_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_counts();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify tables were created successfully:

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('playlists', 'playlist_tracks')
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('playlists', 'playlist_tracks');

-- Check policies exist
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('playlists', 'playlist_tracks')
ORDER BY tablename, policyname;

-- ============================================
-- OPTIONAL: CREATE TEST DATA
-- ============================================
-- Uncomment and run this section to create sample playlists

/*
-- Create a test playlist (requires at least one creator profile)
INSERT INTO playlists (creator_id, name, description, is_public, cover_image_url) 
VALUES (
    (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1),
    'Afrobeat Vibes',
    'The best Afrobeat tracks for any mood',
    true,
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400'
);

-- Create another test playlist
INSERT INTO playlists (creator_id, name, description, is_public, cover_image_url) 
VALUES (
    (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1),
    'Gospel Classics',
    'Timeless gospel music to uplift your spirit',
    true,
    'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400'
);

-- Add tracks to playlists (if audio_tracks exist)
INSERT INTO playlist_tracks (playlist_id, track_id, position)
SELECT 
    (SELECT id FROM playlists WHERE name = 'Afrobeat Vibes'),
    id,
    ROW_NUMBER() OVER (ORDER BY created_at)
FROM audio_tracks 
WHERE is_public = true 
AND genre ILIKE '%afro%'
LIMIT 10;

-- Verify test data
SELECT 
    p.name as playlist_name,
    p.tracks_count,
    p.total_duration,
    pr.display_name as creator_name
FROM playlists p
JOIN profiles pr ON p.creator_id = pr.id
ORDER BY p.created_at DESC;
*/

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Playlists tables created successfully!';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '✅ Triggers and functions set up';
    RAISE NOTICE '✅ Mobile app can now use playlists feature';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Next steps:';
    RAISE NOTICE '1. Verify tables using the verification queries above';
    RAISE NOTICE '2. (Optional) Create test data by uncommenting the test data section';
    RAISE NOTICE '3. Notify mobile team that playlists are ready';
    RAISE NOTICE '';
    RAISE NOTICE '🎵 Playlists feature is now live!';
END $$;
