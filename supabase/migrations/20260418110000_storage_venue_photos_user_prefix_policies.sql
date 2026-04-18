-- Path: {user_id}/{venue_id}/... — first segment must equal auth.uid() (mobile)

DROP POLICY IF EXISTS "Authenticated users can upload venue photos" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can upload venue photos" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can update their venue photos" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can delete their venue photos" ON storage.objects;

DROP POLICY IF EXISTS "users upload to own venue photos" ON storage.objects;
CREATE POLICY "users upload to own venue photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-photos'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "users update own venue photos" ON storage.objects;
CREATE POLICY "users update own venue photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'venue-photos'
    AND auth.uid()::text = split_part(name, '/', 1)
  )
  WITH CHECK (
    bucket_id = 'venue-photos'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "users delete own venue photos" ON storage.objects;
CREATE POLICY "users delete own venue photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'venue-photos'
    AND auth.uid()::text = split_part(name, '/', 1)
  );
