-- MBG Sonics distribution_requests (mobile parity — £15.79, no partner split fields)
-- Safe to run if mobile already applied a similar script.

CREATE TABLE IF NOT EXISTS public.distribution_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id                 UUID NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  artist_name              TEXT NOT NULL,
  track_title              TEXT NOT NULL,
  genre                    TEXT,
  isrc_code                TEXT,
  featured_artists         TEXT,
  explicit_content         BOOLEAN NOT NULL DEFAULT false,
  rights_confirmed         BOOLEAN NOT NULL DEFAULT false,
  requested_release_date   DATE NOT NULL,
  creator_email            TEXT NOT NULL,
  distribution_cover_art_url TEXT,
  stripe_payment_id        TEXT NOT NULL,
  amount_paid              DECIMAL(10,2) NOT NULL DEFAULT 15.79,
  payment_status           TEXT NOT NULL DEFAULT 'paid',
  email_sent_to_partner    BOOLEAN NOT NULL DEFAULT false,
  email_sent_at            TIMESTAMPTZ,
  track_status             TEXT NOT NULL DEFAULT 'submitted',
  track_went_live_at       TIMESTAMPTZ,
  creator_live_email_sent  BOOLEAN NOT NULL DEFAULT false,
  creator_live_email_sent_at TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate legacy columns from 20260617120000 if present
ALTER TABLE public.distribution_requests DROP COLUMN IF EXISTS amount_owed_to_partner;
ALTER TABLE public.distribution_requests DROP COLUMN IF EXISTS soundbridge_margin;
ALTER TABLE public.distribution_requests DROP COLUMN IF EXISTS payment_to_partner_status;
ALTER TABLE public.distribution_requests DROP COLUMN IF EXISTS payment_to_partner_date;

ALTER TABLE public.distribution_requests ADD COLUMN IF NOT EXISTS rights_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.distribution_requests ADD COLUMN IF NOT EXISTS distribution_cover_art_url TEXT;
ALTER TABLE public.distribution_requests ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE public.distribution_requests ADD COLUMN IF NOT EXISTS creator_live_email_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.distribution_requests ADD COLUMN IF NOT EXISTS creator_live_email_sent_at TIMESTAMPTZ;

ALTER TABLE public.distribution_requests ALTER COLUMN amount_paid SET DEFAULT 15.79;

CREATE INDEX IF NOT EXISTS distribution_requests_creator_id_idx
  ON public.distribution_requests (creator_id);
CREATE INDEX IF NOT EXISTS distribution_requests_track_id_idx
  ON public.distribution_requests (track_id);
CREATE INDEX IF NOT EXISTS distribution_requests_stripe_payment_id_idx
  ON public.distribution_requests (stripe_payment_id);

ALTER TABLE public.distribution_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS distribution_requests_creator_select ON public.distribution_requests;
DROP POLICY IF EXISTS "dist_req_creator_select" ON public.distribution_requests;
CREATE POLICY "dist_req_creator_select" ON public.distribution_requests
  FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "dist_req_creator_insert" ON public.distribution_requests;
CREATE POLICY "dist_req_creator_insert" ON public.distribution_requests
  FOR INSERT WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "dist_req_admin_select" ON public.distribution_requests;
CREATE POLICY "dist_req_admin_select" ON public.distribution_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "dist_req_admin_update" ON public.distribution_requests;
CREATE POLICY "dist_req_admin_update" ON public.distribution_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Creator go-live email via edge function (when admin marks track_status = live)
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_distribution_creator_live_email()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  IF NEW.track_status = 'live'
     AND (OLD.track_status IS DISTINCT FROM 'live')
     AND COALESCE(NEW.creator_live_email_sent, false) = false THEN
    SELECT value INTO function_url FROM public.app_settings WHERE key = 'distribution_creator_live_email_url';
    SELECT value INTO service_role_key FROM public.app_settings WHERE key = 'service_role_key';

    IF function_url IS NOT NULL AND service_role_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object('requestId', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_distribution_track_live ON public.distribution_requests;
CREATE TRIGGER on_distribution_track_live
  AFTER UPDATE OF track_status ON public.distribution_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_distribution_creator_live_email();
