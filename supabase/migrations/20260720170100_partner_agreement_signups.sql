-- Signed applications from /agreement/partner (public "become a referral partner" page).
-- Service role from Next.js API only — admin reviews and provisions into public.partners manually.

CREATE TABLE IF NOT EXISTS public.partner_agreement_signups (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name              TEXT NOT NULL,
  email                  TEXT NOT NULL,
  phone                  TEXT,
  context                TEXT,
  agreed_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  status                 TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'provisioned', 'declined')),
  provisioned_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  reviewed_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at             TIMESTAMPTZ,
  decline_reason         TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_agreement_signups_status
  ON public.partner_agreement_signups (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_agreement_signups_email
  ON public.partner_agreement_signups (email);

ALTER TABLE public.partner_agreement_signups ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.partner_agreement_signups IS
  'Signed partner-programme applications from /agreement/partner. No client-side RLS policies — read/write only via service role from admin + public submit API routes.';
