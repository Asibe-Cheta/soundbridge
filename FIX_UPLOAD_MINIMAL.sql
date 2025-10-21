-- Minimal Upload Fix - Essential Only
-- Run this if the safe version still has permission issues

-- 1. Create audio_tracks table (most important)
CREATE TABLE IF NOT EXISTS audio_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    cover_art_url TEXT,
    duration INTEGER DEFAULT 0,
    genre VARCHAR(100),
    tags TEXT[],
    lyrics TEXT,
    lyrics_language VARCHAR(10) DEFAULT 'en',
    is_public BOOLEAN DEFAULT true,
    audio_quality VARCHAR(50) DEFAULT 'standard',
    bitrate INTEGER DEFAULT 128,
    sample_rate INTEGER DEFAULT 44100,
    channels INTEGER DEFAULT 2,
    codec VARCHAR(20) DEFAULT 'mp3',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;

-- 3. Basic RLS policies
DROP POLICY IF EXISTS "audio_tracks_select_policy" ON audio_tracks;
DROP POLICY IF EXISTS "audio_tracks_insert_policy" ON audio_tracks;
DROP POLICY IF EXISTS "audio_tracks_update_policy" ON audio_tracks;
DROP POLICY IF EXISTS "audio_tracks_delete_policy" ON audio_tracks;

CREATE POLICY "audio_tracks_select_policy" ON audio_tracks
    FOR SELECT USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "audio_tracks_insert_policy" ON audio_tracks
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "audio_tracks_update_policy" ON audio_tracks
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "audio_tracks_delete_policy" ON audio_tracks
    FOR DELETE USING (creator_id = auth.uid());

-- 4. Basic indexes
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_id ON audio_tracks(creator_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_is_public ON audio_tracks(is_public);

-- 5. Grant permissions
GRANT ALL ON audio_tracks TO authenticated;
GRANT ALL ON audio_tracks TO anon;

-- 6. Verify
SELECT 'Audio tracks table created successfully' as status;
