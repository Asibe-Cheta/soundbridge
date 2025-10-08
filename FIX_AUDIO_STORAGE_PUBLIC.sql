-- Fix Audio Storage - Make Audio Files Publicly Accessible
-- This fixes the HTTP 400 error when trying to play audio files

-- 1. Update the audio-tracks bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'audio-tracks';

-- 2. Create a public read policy for audio files
CREATE POLICY "Audio tracks are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-tracks');

-- 3. Drop the old authenticated-only policy
DROP POLICY IF EXISTS "Audio tracks are accessible by authenticated users" ON storage.objects;

-- 4. Keep the upload/update/delete policies for authenticated users
-- (These should already exist from the original setup)

-- 5. Update the get_file_url function to use public URLs for audio files
CREATE OR REPLACE FUNCTION get_file_url(
    bucket_name TEXT,
    file_path TEXT
)
RETURNS TEXT AS $$
BEGIN
    IF bucket_name IN ('audio-tracks', 'cover-art', 'profile-images', 'event-images') THEN
        -- All buckets are now public
        RETURN 'https://' || current_setting('request.headers')::json->>'host' || 
               '/storage/v1/object/public/' || bucket_name || '/' || file_path;
    ELSE
        -- Fallback for any other buckets
        RETURN 'https://' || current_setting('request.headers')::json->>'host' || 
               '/storage/v1/object/public/' || bucket_name || '/' || file_path;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Verify the changes
SELECT 
    id, 
    name, 
    public, 
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'audio-tracks';

-- 7. Show current policies for audio-tracks
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%audio%';
