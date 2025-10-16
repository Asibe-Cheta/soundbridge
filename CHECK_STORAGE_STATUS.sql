-- Check Current Storage Bucket Status
-- Run this first to see what's already configured

-- 1. Check bucket configuration
SELECT 
    id as bucket_name,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id IN ('audio-tracks', 'cover-art')
ORDER BY id;

-- 2. Check existing policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND (policyname LIKE '%audio%' OR policyname LIKE '%cover%')
ORDER BY policyname;

-- 3. Check if buckets have any files
SELECT 
    b.id as bucket_name,
    b.public,
    COUNT(o.id) as file_count,
    COALESCE(SUM((o.metadata->>'size')::bigint), 0) as total_size_bytes
FROM storage.buckets b
LEFT JOIN storage.objects o ON b.id = o.bucket_id
WHERE b.id IN ('audio-tracks', 'cover-art')
GROUP BY b.id, b.public
ORDER BY b.id;

-- 4. Check recent uploads (if any)
SELECT 
    at.id,
    at.title,
    at.artist_name,
    at.file_url,
    at.cover_art_url,
    at.lyrics IS NOT NULL as has_lyrics,
    at.created_at
FROM audio_tracks at
ORDER BY at.created_at DESC
LIMIT 5;
