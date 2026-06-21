-- Admin review gate before partner email + cover art workflow fields

ALTER TABLE public.distribution_requests
  ADD COLUMN IF NOT EXISTS partner_email_status TEXT NOT NULL DEFAULT 'pending_review';

ALTER TABLE public.distribution_requests
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.distribution_requests
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.distribution_requests
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.distribution_requests
  DROP CONSTRAINT IF EXISTS distribution_requests_partner_email_status_check;

ALTER TABLE public.distribution_requests
  ADD CONSTRAINT distribution_requests_partner_email_status_check
  CHECK (partner_email_status IN ('pending_review', 'sent', 'rejected'));

-- Rows that already had partner email sent
UPDATE public.distribution_requests
SET partner_email_status = 'sent'
WHERE email_sent_to_partner = true
  AND partner_email_status = 'pending_review';

COMMENT ON COLUMN public.distribution_requests.partner_email_status IS
  'pending_review: awaiting admin visual check | sent: emailed to MBG Sonics | rejected: cover failed review, refunded';
