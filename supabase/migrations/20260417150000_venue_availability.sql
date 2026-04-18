-- Venue availability announcements (mobile): flexible free-text windows + optional rates

CREATE TABLE public.venue_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  available_from TEXT NOT NULL,
  available_to TEXT,
  hourly_rate DECIMAL(10, 2),
  daily_rate DECIMAL(10, 2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_availability_venue_id
  ON public.venue_availability(venue_id);

COMMENT ON TABLE public.venue_availability IS 'Venue owner availability windows; available_from/to are free text (e.g. dates or "Weekends")';

ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Venue owners can insert availability" ON public.venue_availability;
CREATE POLICY "Venue owners can insert availability"
  ON public.venue_availability FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.venues WHERE id = venue_id)
  );

DROP POLICY IF EXISTS "Anyone can read availability" ON public.venue_availability;
CREATE POLICY "Anyone can read availability"
  ON public.venue_availability FOR SELECT
  USING (true);
