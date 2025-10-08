-- Fix Upload Policies Only - Focused Solution
-- This specifically addresses the HTTP 400 upload errors

-- 1. Make sure buckets are public (for read access)
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('audio-tracks', 'cover-art');

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Audio tracks are accessible by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Audio tracks are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Cover art is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload cover art" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own cover art" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own cover art" ON storage.objects;

-- 3. Create comprehensive policies for audio-tracks bucket
CREATE POLICY "Audio tracks public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-tracks');

CREATE POLICY "Audio tracks authenticated upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Audio tracks owner update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Audio tracks owner delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audio-tracks' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. Create comprehensive policies for cover-art bucket
CREATE POLICY "Cover art public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'cover-art');

CREATE POLICY "Cover art authenticated upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Cover art owner update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Cover art owner delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'cover-art' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 5. Verify the setup
SELECT 
    id as bucket_name,
    public,
    created_at
FROM storage.buckets 
WHERE id IN ('audio-tracks', 'cover-art')
ORDER BY id;

-- 6. Show the new policies
SELECT 
    policyname, 
    cmd, 
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND (policyname LIKE '%audio%' OR policyname LIKE '%cover%')
ORDER BY policyname;
