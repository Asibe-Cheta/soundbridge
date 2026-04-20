-- Ensure active venues are readable to any authenticated user (mobile all-venues list).

DROP POLICY IF EXISTS "Public can view active venues" ON public.venues;
DROP POLICY IF EXISTS "Authenticated can view active venues" ON public.venues;

CREATE POLICY "Authenticated can view active venues"
  ON public.venues FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR status = 'active'
  );

DROP POLICY IF EXISTS "Service role can view venues" ON public.venues;
CREATE POLICY "Service role can view venues"
  ON public.venues FOR SELECT
  TO service_role
  USING (true);
