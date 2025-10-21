-- Complete Fix for Upload Issues
-- This addresses authentication, storage buckets, and upload functionality

-- 1. Create storage buckets if they don't exist
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

-- 2. Drop all existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Audio tracks are accessible by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Audio tracks are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Cover art is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload cover art" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own cover art" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own cover art" ON storage.objects;
DROP POLICY IF EXISTS "audio_tracks_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_tracks_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_tracks_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "audio_tracks_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "cover_art_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "cover_art_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "cover_art_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "cover_art_delete_policy" ON storage.objects;

-- 3. Create comprehensive storage policies

-- Audio tracks - Public read, authenticated write
CREATE POLICY "audio_tracks_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-tracks');

CREATE POLICY "audio_tracks_authenticated_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "audio_tracks_owner_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "audio_tracks_owner_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Cover art - Public read, authenticated write
CREATE POLICY "cover_art_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'cover-art');

CREATE POLICY "cover_art_authenticated_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "cover_art_owner_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "cover_art_owner_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Create audio_tracks table if it doesn't exist
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

-- 6. Enable RLS on audio_tracks table
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for audio_tracks table
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

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_id ON audio_tracks(creator_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_is_public ON audio_tracks(is_public);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_genre ON audio_tracks(genre);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_created_at ON audio_tracks(created_at);

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_audio_tracks_updated_at ON audio_tracks;
CREATE TRIGGER update_audio_tracks_updated_at
    BEFORE UPDATE ON audio_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Grant necessary permissions
GRANT ALL ON audio_tracks TO authenticated;
GRANT ALL ON audio_tracks TO anon;

-- 12. Verify setup
SELECT 
    'Storage buckets created' as status,
    COUNT(*) as bucket_count
FROM storage.buckets 
WHERE id IN ('audio-tracks', 'cover-art');

SELECT 
    'Storage policies created' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

SELECT 
    'Audio tracks table ready' as status,
    COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_name = 'audio_tracks' 
AND table_schema = 'public';
