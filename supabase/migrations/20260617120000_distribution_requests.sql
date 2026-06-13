-- MBG Sonics distribution requests (paid track distribution to streaming platforms).

CREATE TABLE IF NOT EXISTS public.distribution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  track_title TEXT NOT NULL,
  genre TEXT,
  isrc_code TEXT,
  featured_artists TEXT,
  explicit_content BOOLEAN NOT NULL DEFAULT false,
  requested_release_date DATE NOT NULL,
  creator_email TEXT NOT NULL,
  stripe_payment_id TEXT,
  amount_paid NUMERIC(10, 2) NOT NULL,
  amount_owed_to_partner NUMERIC(10, 2) NOT NULL,
  soundbridge_margin NUMERIC(10, 2) NOT NULL,
  payment_to_partner_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_to_partner_status IN ('pending', 'paid')),
  payment_to_partner_date TIMESTAMPTZ,
  email_sent_to_partner BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  track_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (track_status IN ('pending', 'submitted', 'processing', 'live', 'failed')),
  track_went_live_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS distribution_requests_creator_id_idx
  ON public.distribution_requests (creator_id);

CREATE INDEX IF NOT EXISTS distribution_requests_track_id_idx
  ON public.distribution_requests (track_id);

CREATE INDEX IF NOT EXISTS distribution_requests_track_status_idx
  ON public.distribution_requests (track_status);

CREATE INDEX IF NOT EXISTS distribution_requests_created_at_idx
  ON public.distribution_requests (created_at DESC);

COMMENT ON TABLE public.distribution_requests IS
  'Paid MBG Sonics distribution submissions. Placeholder fee split until confirmed with partner.';

ALTER TABLE public.distribution_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS distribution_requests_creator_select ON public.distribution_requests;
CREATE POLICY distribution_requests_creator_select ON public.distribution_requests
  FOR SELECT USING (auth.uid() = creator_id);

-- Inserts/updates via service role only (API routes).
