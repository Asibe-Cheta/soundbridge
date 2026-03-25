-- R2 Public Development URL is bucket-scoped: path must be object key only.
-- Legacy rows may have ...r2.dev/<bucket_name>/migrated/... which 404s.
-- Replace only when the bucket segment matches (edit if R2_BUCKET_NAME differs).

UPDATE public.audio_tracks
SET file_url = REPLACE(file_url, '.r2.dev/soundbridge-audio/', '.r2.dev/')
WHERE file_url LIKE '%.r2.dev/soundbridge-audio/%';

UPDATE public.audio_tracks
SET audio_url = REPLACE(audio_url, '.r2.dev/soundbridge-audio/', '.r2.dev/')
WHERE audio_url IS NOT NULL
  AND audio_url LIKE '%.r2.dev/soundbridge-audio/%';
