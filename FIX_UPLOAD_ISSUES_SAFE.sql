-- Safe Fix for Upload Issues - Supabase Compatible
-- This version works within Supabase's permission constraints

-- 1. Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('audio-tracks', 'audio-tracks', true, 52428800, ARRAY[
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 
        'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'
    ]),
    ('cover-art', 'cover-art', true, 5242880, ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'
    ])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Create audio_tracks table if it doesn't exist
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

-- 3. Enable RLS on audio_tracks table
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for audio_tracks table (drop existing first)
DROP POLICY IF EXISTS "audio_tracks_select_policy" ON audio_tracks;
DROP POLICY IF EXISTS "audio_tracks_insert_policy" ON audio_tracks;
DROP POLICY IF EXISTS "audio_tracks_update_policy" ON audio_tracks;
DROP POLICY IF EXISTS "audio_tracks_delete_policy" ON audio_tracks;

CREATE POLICY "audio_tracks_select_policy" ON audio_tracks
    FOR SELECT USING (
        is_public = true OR creator_id = auth.uid()
    );

CREATE POLICY "audio_tracks_insert_policy" ON audio_tracks
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "audio_tracks_update_policy" ON audio_tracks
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "audio_tracks_delete_policy" ON audio_tracks
    FOR DELETE USING (creator_id = auth.uid());

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_id ON audio_tracks(creator_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_is_public ON audio_tracks(is_public);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_genre ON audio_tracks(genre);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_created_at ON audio_tracks(created_at);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_audio_tracks_updated_at ON audio_tracks;
CREATE TRIGGER update_audio_tracks_updated_at
    BEFORE UPDATE ON audio_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant necessary permissions
GRANT ALL ON audio_tracks TO authenticated;
GRANT ALL ON audio_tracks TO anon;

-- 9. Verify setup
SELECT 
    'Storage buckets status' as status,
    COUNT(*) as bucket_count
FROM storage.buckets 
WHERE id IN ('audio-tracks', 'cover-art');

SELECT 
    'Audio tracks table status' as status,
    COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_name = 'audio_tracks' 
AND table_schema = 'public';
