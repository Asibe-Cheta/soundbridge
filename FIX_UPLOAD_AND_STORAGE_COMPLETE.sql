-- Complete Fix for Upload and Audio Storage Issues
-- This addresses both upload failures and audio playback issues

-- 1. Make audio-tracks bucket public for playback
UPDATE storage.buckets 
SET public = true 
WHERE id = 'audio-tracks';

-- 2. Make cover-art bucket public for easy access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'cover-art';

-- 3. Create public read policies for both buckets
CREATE POLICY "Audio tracks are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-tracks');

CREATE POLICY "Cover art is publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'cover-art');

-- 4. Drop old authenticated-only policies if they exist
DROP POLICY IF EXISTS "Audio tracks are accessible by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Cover art is publicly accessible" ON storage.objects;

-- 5. Ensure upload policies exist for authenticated users
CREATE POLICY "Authenticated users can upload audio tracks" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can upload cover art" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
    );

-- 6. Allow users to update/delete their own files
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

-- 7. Update the get_file_url function to use public URLs
CREATE OR REPLACE FUNCTION get_file_url(
    bucket_name TEXT,
    file_path TEXT
)
RETURNS TEXT AS $$
BEGIN
    -- All buckets are now public for easy access
    RETURN 'https://' || current_setting('request.headers')::json->>'host' || 
           '/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Verify the changes
SELECT 
    id, 
    name, 
    public, 
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id IN ('audio-tracks', 'cover-art');

-- 9. Show current policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%audio%' OR policyname LIKE '%cover%'
ORDER BY policyname;

-- 10. Test bucket access (optional - can be run separately)
-- This will show if the buckets are properly configured
SELECT 
    'audio-tracks' as bucket_name,
    COUNT(*) as file_count,
    public as is_public
FROM storage.buckets b
LEFT JOIN storage.objects o ON b.id = o.bucket_id
WHERE b.id = 'audio-tracks'
GROUP BY b.id, b.public

UNION ALL

SELECT 
    'cover-art' as bucket_name,
    COUNT(*) as file_count,
    public as is_public
FROM storage.buckets b
LEFT JOIN storage.objects o ON b.id = o.bucket_id
WHERE b.id = 'cover-art'
GROUP BY b.id, b.public;
