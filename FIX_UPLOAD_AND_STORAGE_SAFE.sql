-- Safe Fix for Upload and Audio Storage Issues
-- This version checks for existing policies before creating new ones

-- 1. Make audio-tracks bucket public for playback
UPDATE storage.buckets 
SET public = true 
WHERE id = 'audio-tracks';

-- 2. Make cover-art bucket public for easy access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'cover-art';

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Audio tracks are accessible by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Audio tracks are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Cover art is publicly accessible" ON storage.objects;

-- 4. Create public read policies for both buckets
CREATE POLICY "Audio tracks are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-tracks');

CREATE POLICY "Cover art is publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'cover-art');

-- 5. Ensure upload policies exist for authenticated users (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload cover art" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own cover art" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own cover art" ON storage.objects;

-- 6. Create upload policies for authenticated users
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

-- 7. Allow users to update/delete their own files
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

-- 8. Update the get_file_url function to use public URLs
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

-- 9. Verify the changes
SELECT 
    id, 
    name, 
    public, 
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id IN ('audio-tracks', 'cover-art');

-- 10. Show current policies (should show the new policies)
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND (policyname LIKE '%audio%' OR policyname LIKE '%cover%')
ORDER BY policyname;
