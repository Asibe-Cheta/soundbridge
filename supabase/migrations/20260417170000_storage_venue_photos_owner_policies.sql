-- Venue photos: first path segment must be the venue UUID; only that venue's owner can write.
-- Matches pattern used for branding: (storage.foldername(name))[1] = entity id

DROP POLICY IF EXISTS "Authenticated users can upload venue photos" ON storage.objects;
CREATE POLICY "Venue owners can upload venue photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-photos'
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
        AND v.id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Venue owners can update their venue photos" ON storage.objects;
CREATE POLICY "Venue owners can update their venue photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'venue-photos'
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
        AND v.id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'venue-photos'
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
        AND v.id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Venue owners can delete their venue photos" ON storage.objects;
CREATE POLICY "Venue owners can delete their venue photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'venue-photos'
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
        AND v.id::text = (storage.foldername(name))[1]
    )
  );
