-- Per-object max upload size for bucket `audio-tracks` (storage.buckets.file_size_limit).
-- This is NOT total bucket quota — it is the max size of a single uploaded object.
-- Legacy scripts used 50MB (52428800), which rejects e.g. 66MB uploads (incl. temp/ fingerprint paths).
--
-- Hosted projects: also open Supabase Dashboard → Project Settings → Storage and ensure
-- the global "Upload file size limit" is at least 200MB (bucket limit cannot exceed global).

UPDATE storage.buckets
SET file_size_limit = 209715200
WHERE id = 'audio-tracks'
  AND (file_size_limit IS NULL OR file_size_limit < 209715200);
