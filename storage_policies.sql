-- SoundBridge Storage Policies
-- RLS policies for storage.objects table

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ========================================
-- AUDIO-TRACKS BUCKET POLICIES (Private)
-- ========================================

-- SELECT: Only authenticated users can access audio files
CREATE POLICY "audio_tracks_select_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
    );

-- INSERT: Users can upload audio files to their own folder
CREATE POLICY "audio_tracks_insert_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- UPDATE: Users can update their own audio files
CREATE POLICY "audio_tracks_update_policy" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE: Users can delete their own audio files
CREATE POLICY "audio_tracks_delete_policy" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ========================================
-- COVER-ART BUCKET POLICIES (Public Read)
-- ========================================

-- SELECT: Public read access for cover art
CREATE POLICY "cover_art_select_policy" ON storage.objects
    FOR SELECT USING (bucket_id = 'cover-art');

-- INSERT: Authenticated users can upload cover art
CREATE POLICY "cover_art_insert_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
    );

-- UPDATE: Users can update their own cover art
CREATE POLICY "cover_art_update_policy" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE: Users can delete their own cover art
CREATE POLICY "cover_art_delete_policy" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ========================================
-- PROFILE-IMAGES BUCKET POLICIES (Public Read)
-- ========================================

-- SELECT: Public read access for profile images
CREATE POLICY "profile_images_select_policy" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-images');

-- INSERT: Authenticated users can upload profile images
CREATE POLICY "profile_images_insert_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-images' 
        AND auth.role() = 'authenticated'
    );

-- UPDATE: Users can update their own profile images
CREATE POLICY "profile_images_update_policy" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE: Users can delete their own profile images
CREATE POLICY "profile_images_delete_policy" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ========================================
-- EVENT-IMAGES BUCKET POLICIES (Public Read)
-- ========================================

-- SELECT: Public read access for event images
CREATE POLICY "event_images_select_policy" ON storage.objects
    FOR SELECT USING (bucket_id = 'event-images');

-- INSERT: Authenticated users can upload event images
CREATE POLICY "event_images_insert_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-images' 
        AND auth.role() = 'authenticated'
    );

-- UPDATE: Users can update their own event images
CREATE POLICY "event_images_update_policy" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'event-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE: Users can delete their own event images
CREATE POLICY "event_images_delete_policy" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ========================================
-- HELPER FUNCTIONS FOR FILE MANAGEMENT
-- ========================================

-- Function to get user's files from a specific bucket
CREATE OR REPLACE FUNCTION get_user_files(
    bucket_name TEXT,
    user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    bucket_id TEXT,
    owner UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.bucket_id,
        o.owner,
        o.created_at,
        o.updated_at,
        o.last_accessed_at,
        o.metadata
    FROM storage.objects o
    WHERE o.bucket_id = bucket_name
    AND (storage.foldername(o.name))[1] = user_id::text
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a file
CREATE OR REPLACE FUNCTION user_owns_file(
    file_name TEXT,
    bucket_name TEXT,
    user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM storage.objects
        WHERE name = file_name
        AND bucket_id = bucket_name
        AND (storage.foldername(name))[1] = user_id::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get file size in human readable format
CREATE OR REPLACE FUNCTION get_file_size_pretty(file_size BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF file_size < 1024 THEN
        RETURN file_size || ' B';
    ELSIF file_size < 1048576 THEN
        RETURN ROUND(file_size::NUMERIC / 1024, 2) || ' KB';
    ELSIF file_size < 1073741824 THEN
        RETURN ROUND(file_size::NUMERIC / 1048576, 2) || ' MB';
    ELSE
        RETURN ROUND(file_size::NUMERIC / 1073741824, 2) || ' GB';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get storage usage for a user
CREATE OR REPLACE FUNCTION get_user_storage_usage(
    user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    bucket_name TEXT,
    file_count BIGINT,
    total_size BIGINT,
    total_size_pretty TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.bucket_id as bucket_name,
        COUNT(*) as file_count,
        COALESCE(SUM((o.metadata->>'size')::bigint), 0) as total_size,
        get_file_size_pretty(COALESCE(SUM((o.metadata->>'size')::bigint), 0)) as total_size_pretty
    FROM storage.objects o
    WHERE (storage.foldername(o.name))[1] = user_id::text
    GROUP BY o.bucket_id
    ORDER BY o.bucket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned files for a user
CREATE OR REPLACE FUNCTION cleanup_user_orphaned_files(
    user_id UUID DEFAULT auth.uid(),
    older_than_hours INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    orphaned_file RECORD;
BEGIN
    -- Clean up orphaned audio files
    FOR orphaned_file IN
        SELECT o.name, o.bucket_id
        FROM storage.objects o
        WHERE o.bucket_id = 'audio-tracks'
        AND (storage.foldername(o.name))[1] = user_id::text
        AND NOT EXISTS (
            SELECT 1 FROM audio_tracks 
            WHERE file_url LIKE '%' || o.name
        )
        AND o.created_at < NOW() - (older_than_hours || ' hours')::INTERVAL
    LOOP
        DELETE FROM storage.objects 
        WHERE name = orphaned_file.name 
        AND bucket_id = orphaned_file.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Clean up orphaned cover art
    FOR orphaned_file IN
        SELECT o.name, o.bucket_id
        FROM storage.objects o
        WHERE o.bucket_id = 'cover-art'
        AND (storage.foldername(o.name))[1] = user_id::text
        AND NOT EXISTS (
            SELECT 1 FROM audio_tracks 
            WHERE cover_art_url LIKE '%' || o.name
        )
        AND o.created_at < NOW() - (older_than_hours || ' hours')::INTERVAL
    LOOP
        DELETE FROM storage.objects 
        WHERE name = orphaned_file.name 
        AND bucket_id = orphaned_file.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Clean up orphaned profile images
    FOR orphaned_file IN
        SELECT o.name, o.bucket_id
        FROM storage.objects o
        WHERE o.bucket_id = 'profile-images'
        AND (storage.foldername(o.name))[1] = user_id::text
        AND NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE avatar_url LIKE '%' || o.name 
            OR banner_url LIKE '%' || o.name
        )
        AND o.created_at < NOW() - (older_than_hours || ' hours')::INTERVAL
    LOOP
        DELETE FROM storage.objects 
        WHERE name = orphaned_file.name 
        AND bucket_id = orphaned_file.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Clean up orphaned event images
    FOR orphaned_file IN
        SELECT o.name, o.bucket_id
        FROM storage.objects o
        WHERE o.bucket_id = 'event-images'
        AND (storage.foldername(o.name))[1] = user_id::text
        AND NOT EXISTS (
            SELECT 1 FROM events 
            WHERE image_url LIKE '%' || o.name
        )
        AND o.created_at < NOW() - (older_than_hours || ' hours')::INTERVAL
    LOOP
        DELETE FROM storage.objects 
        WHERE name = orphaned_file.name 
        AND bucket_id = orphaned_file.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VIEWS FOR STORAGE ANALYTICS
-- ========================================

-- View for storage statistics by bucket
CREATE VIEW storage_bucket_stats AS
SELECT 
    bucket_id,
    COUNT(*) as total_files,
    COALESCE(SUM((metadata->>'size')::bigint), 0) as total_size_bytes,
    get_file_size_pretty(COALESCE(SUM((metadata->>'size')::bigint), 0)) as total_size_pretty,
    COALESCE(AVG((metadata->>'size')::bigint), 0) as avg_file_size_bytes,
    get_file_size_pretty(COALESCE(AVG((metadata->>'size')::bigint), 0)) as avg_file_size_pretty,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
FROM storage.objects
WHERE bucket_id IN ('audio-tracks', 'cover-art', 'profile-images', 'event-images')
GROUP BY bucket_id
ORDER BY bucket_id;

-- View for user storage usage
CREATE VIEW user_storage_usage AS
SELECT 
    (storage.foldername(name))[1] as user_id,
    bucket_id,
    COUNT(*) as file_count,
    COALESCE(SUM((metadata->>'size')::bigint), 0) as total_size_bytes,
    get_file_size_pretty(COALESCE(SUM((metadata->>'size')::bigint), 0)) as total_size_pretty
FROM storage.objects
WHERE bucket_id IN ('audio-tracks', 'cover-art', 'profile-images', 'event-images')
GROUP BY (storage.foldername(name))[1], bucket_id
ORDER BY (storage.foldername(name))[1], bucket_id;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant access to storage objects
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Grant access to views
GRANT SELECT ON storage_bucket_stats TO authenticated, anon;
GRANT SELECT ON user_storage_usage TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_files(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_owns_file(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_file_size_pretty(BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_storage_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_user_orphaned_files(UUID, INTEGER) TO authenticated;

-- ========================================
-- TRIGGERS FOR AUTOMATIC CLEANUP
-- ========================================

-- Function to handle automatic file cleanup when records are deleted
CREATE OR REPLACE FUNCTION handle_storage_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up audio files when audio_track is deleted
    IF TG_TABLE_NAME = 'audio_tracks' AND TG_OP = 'DELETE' THEN
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
    
    -- Clean up event images when event is deleted
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
CREATE TRIGGER storage_cleanup_audio_files_trigger
    AFTER DELETE ON audio_tracks
    FOR EACH ROW EXECUTE FUNCTION handle_storage_cleanup();

CREATE TRIGGER storage_cleanup_profile_files_trigger
    AFTER DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION handle_storage_cleanup();

CREATE TRIGGER storage_cleanup_event_files_trigger
    AFTER DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION handle_storage_cleanup(); 