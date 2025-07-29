-- SoundBridge Storage Buckets Configuration
-- Comprehensive SQL script for Supabase storage setup

-- Enable storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage";

-- 1. AUDIO-TRACKS BUCKET (for music/podcast files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-tracks',
    'audio-tracks',
    false, -- Private bucket, requires authentication
    52428800, -- 50MB limit
    ARRAY[
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/m4a',
        'audio/x-m4a',
        'audio/aac',
        'audio/ogg',
        'audio/webm'
    ]
);

-- 2. COVER-ART BUCKET (for track cover images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cover-art',
    'cover-art',
    true, -- Public bucket for easy access
    5242880, -- 5MB limit
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
);

-- 3. PROFILE-IMAGES BUCKET (for user avatars and banners)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true, -- Public bucket for easy access
    5242880, -- 5MB limit
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
);

-- 4. EVENT-IMAGES BUCKET (for event photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-images',
    'event-images',
    true, -- Public bucket for easy access
    5242880, -- 5MB limit
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
);

-- STORAGE POLICIES

-- Audio Tracks Bucket Policies (Authenticated Access Only)
CREATE POLICY "Audio tracks are accessible by authenticated users" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can upload their own audio tracks" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own audio tracks" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own audio tracks" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Cover Art Bucket Policies (Public Read, Authenticated Write)
CREATE POLICY "Cover art is publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'cover-art');

CREATE POLICY "Authenticated users can upload cover art" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own cover art" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own cover art" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Profile Images Bucket Policies (Public Read, Authenticated Write)
CREATE POLICY "Profile images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload profile images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own profile images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own profile images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Event Images Bucket Policies (Public Read, Authenticated Write)
CREATE POLICY "Event images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own event images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'event-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own event images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- HELPER FUNCTIONS FOR FILE MANAGEMENT

-- Function to generate unique file names
CREATE OR REPLACE FUNCTION generate_unique_filename(
    bucket_name TEXT,
    original_filename TEXT,
    user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT AS $$
DECLARE
    file_extension TEXT;
    unique_filename TEXT;
    counter INTEGER := 0;
BEGIN
    -- Extract file extension
    file_extension := substring(original_filename from '\.([^.]*)$');
    
    -- Generate base filename with timestamp
    unique_filename := user_id::text || '/' || 
                     extract(epoch from now())::text || '_' ||
                     substring(original_filename from '^([^.]+)') ||
                     '.' || file_extension;
    
    -- Check if file exists and generate unique name if needed
    WHILE EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = bucket_name 
        AND name = unique_filename
    ) LOOP
        counter := counter + 1;
        unique_filename := user_id::text || '/' || 
                         extract(epoch from now())::text || '_' ||
                         substring(original_filename from '^([^.]+)') ||
                         '_' || counter::text ||
                         '.' || file_extension;
    END LOOP;
    
    RETURN unique_filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get file URL
CREATE OR REPLACE FUNCTION get_file_url(
    bucket_name TEXT,
    file_path TEXT
)
RETURNS TEXT AS $$
BEGIN
    IF bucket_name IN ('cover-art', 'profile-images', 'event-images') THEN
        -- Public buckets
        RETURN 'https://' || current_setting('request.headers')::json->>'host' || 
               '/storage/v1/object/public/' || bucket_name || '/' || file_path;
    ELSE
        -- Private buckets require signed URLs
        RETURN 'https://' || current_setting('request.headers')::json->>'host' || 
               '/storage/v1/object/sign/' || bucket_name || '/' || file_path;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate file upload
CREATE OR REPLACE FUNCTION validate_file_upload(
    bucket_name TEXT,
    file_size BIGINT,
    mime_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    bucket_record RECORD;
BEGIN
    -- Get bucket configuration
    SELECT * INTO bucket_record 
    FROM storage.buckets 
    WHERE id = bucket_name;
    
    -- Check if bucket exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bucket % does not exist', bucket_name;
    END IF;
    
    -- Check file size limit
    IF file_size > bucket_record.file_size_limit THEN
        RAISE EXCEPTION 'File size % exceeds limit of %', 
            pg_size_pretty(file_size), 
            pg_size_pretty(bucket_record.file_size_limit);
    END IF;
    
    -- Check mime type
    IF NOT (mime_type = ANY(bucket_record.allowed_mime_types)) THEN
        RAISE EXCEPTION 'Mime type % is not allowed in bucket %', mime_type, bucket_name;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    orphaned_file RECORD;
BEGIN
    -- Find and delete orphaned audio files (not referenced in audio_tracks table)
    FOR orphaned_file IN
        SELECT o.name, o.bucket_id
        FROM storage.objects o
        WHERE o.bucket_id = 'audio-tracks'
        AND NOT EXISTS (
            SELECT 1 FROM audio_tracks 
            WHERE file_url LIKE '%' || o.name
        )
        AND o.created_at < NOW() - INTERVAL '24 hours'
    LOOP
        DELETE FROM storage.objects 
        WHERE name = orphaned_file.name 
        AND bucket_id = orphaned_file.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Find and delete orphaned cover art (not referenced in audio_tracks table)
    FOR orphaned_file IN
        SELECT o.name, o.bucket_id
        FROM storage.objects o
        WHERE o.bucket_id = 'cover-art'
        AND NOT EXISTS (
            SELECT 1 FROM audio_tracks 
            WHERE cover_art_url LIKE '%' || o.name
        )
        AND o.created_at < NOW() - INTERVAL '24 hours'
    LOOP
        DELETE FROM storage.objects 
        WHERE name = orphaned_file.name 
        AND bucket_id = orphaned_file.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Find and delete orphaned profile images (not referenced in profiles table)
    FOR orphaned_file IN
        SELECT o.name, o.bucket_id
        FROM storage.objects o
        WHERE o.bucket_id = 'profile-images'
        AND NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE avatar_url LIKE '%' || o.name 
            OR banner_url LIKE '%' || o.name
        )
        AND o.created_at < NOW() - INTERVAL '24 hours'
    LOOP
        DELETE FROM storage.objects 
        WHERE name = orphaned_file.name 
        AND bucket_id = orphaned_file.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Find and delete orphaned event images (not referenced in events table)
    FOR orphaned_file IN
        SELECT o.name, o.bucket_id
        FROM storage.objects o
        WHERE o.bucket_id = 'event-images'
        AND NOT EXISTS (
            SELECT 1 FROM events 
            WHERE image_url LIKE '%' || o.name
        )
        AND o.created_at < NOW() - INTERVAL '24 hours'
    LOOP
        DELETE FROM storage.objects 
        WHERE name = orphaned_file.name 
        AND bucket_id = orphaned_file.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up orphaned files (optional)
-- This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-orphaned-files', '0 2 * * *', 'SELECT cleanup_orphaned_files();');

-- TRIGGERS FOR AUTOMATIC FILE CLEANUP

-- Function to handle file cleanup when records are deleted
CREATE OR REPLACE FUNCTION handle_file_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up audio file when audio_track is deleted
    IF TG_TABLE_NAME = 'audio_tracks' AND TG_OP = 'DELETE' THEN
        -- Extract filename from URL and delete from storage
        -- This is a simplified version - you might want to implement more sophisticated URL parsing
        IF OLD.file_url IS NOT NULL THEN
            DELETE FROM storage.objects 
            WHERE bucket_id = 'audio-tracks' 
            AND name = substring(OLD.file_url from '[^/]+$');
        END IF;
        
        IF OLD.cover_art_url IS NOT NULL THEN
            DELETE FROM storage.objects 
            WHERE bucket_id = 'cover-art' 
            AND name = substring(OLD.cover_art_url from '[^/]+$');
        END IF;
    END IF;
    
    -- Clean up profile images when profile is deleted
    IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'DELETE' THEN
        IF OLD.avatar_url IS NOT NULL THEN
            DELETE FROM storage.objects 
            WHERE bucket_id = 'profile-images' 
            AND name = substring(OLD.avatar_url from '[^/]+$');
        END IF;
        
        IF OLD.banner_url IS NOT NULL THEN
            DELETE FROM storage.objects 
            WHERE bucket_id = 'profile-images' 
            AND name = substring(OLD.banner_url from '[^/]+$');
        END IF;
    END IF;
    
    -- Clean up event image when event is deleted
    IF TG_TABLE_NAME = 'events' AND TG_OP = 'DELETE' THEN
        IF OLD.image_url IS NOT NULL THEN
            DELETE FROM storage.objects 
            WHERE bucket_id = 'event-images' 
            AND name = substring(OLD.image_url from '[^/]+$');
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic file cleanup
CREATE TRIGGER cleanup_audio_files_trigger
    AFTER DELETE ON audio_tracks
    FOR EACH ROW EXECUTE FUNCTION handle_file_cleanup();

CREATE TRIGGER cleanup_profile_files_trigger
    AFTER DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION handle_file_cleanup();

CREATE TRIGGER cleanup_event_files_trigger
    AFTER DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION handle_file_cleanup();

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create a view for easy access to storage statistics
CREATE VIEW storage_stats AS
SELECT 
    b.id as bucket_name,
    b.public,
    b.file_size_limit,
    COUNT(o.id) as file_count,
    COALESCE(SUM(o.metadata->>'size')::bigint, 0) as total_size,
    COALESCE(AVG((o.metadata->>'size')::bigint), 0) as avg_file_size
FROM storage.buckets b
LEFT JOIN storage.objects o ON b.id = o.bucket_id
WHERE b.id IN ('audio-tracks', 'cover-art', 'profile-images', 'event-images')
GROUP BY b.id, b.public, b.file_size_limit
ORDER BY b.id;

-- Grant access to the view
GRANT SELECT ON storage_stats TO anon, authenticated; 