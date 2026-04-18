-- Public venue photo uploads (mobile)

INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-photos', 'venue-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read venue photos" ON storage.objects;
CREATE POLICY "Anyone can read venue photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'venue-photos');

DROP POLICY IF EXISTS "Authenticated users can upload venue photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload venue photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'venue-photos');
