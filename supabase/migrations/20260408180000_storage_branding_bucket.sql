-- Premium/Unlimited creator branding logos (WEB_TEAM_BRANDING_BUCKET_REQUIRED.md)
-- Path: {userId}/branding/logo_* — first folder segment must equal auth.uid()

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload their own branding assets" ON storage.objects;
CREATE POLICY "Users can upload their own branding assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own branding assets" ON storage.objects;
CREATE POLICY "Users can update their own branding assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Branding assets are publicly readable" ON storage.objects;
CREATE POLICY "Branding assets are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Users can delete their own branding assets" ON storage.objects;
CREATE POLICY "Users can delete their own branding assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
