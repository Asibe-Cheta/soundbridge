-- =============================================================================
-- Logic Church partner registrations
-- =============================================================================
-- Lightweight email-only pre-registration for institutional partners whose
-- members should get benefits (1yr Premium + a personal 10% referral link)
-- automatically applied the moment they create a SoundBridge account with the
-- same email — no admin "Provision" click required (unlike
-- partner_agreement_signups, which is for individually-vetted referral
-- partners). Generalised on `partner_id` so future partners can reuse this
-- table instead of a new one per partner.
--
-- Same RLS pattern as partner_agreement_signups (20260720170100): RLS
-- enabled, zero policies — every read/write goes through the service-role
-- client from the public submit API route and the admin API routes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partner_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL,
  partner_id          TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'provisioned')),
  provisioned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provisioned_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_registrations_email_partner
  ON public.partner_registrations (lower(email), partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_registrations_status
  ON public.partner_registrations (status, partner_id);

ALTER TABLE public.partner_registrations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.partner_registrations IS
  'Email-only pre-registrations for institutional partners (e.g. logic_church). No client-side RLS policies — read/write only via service role from the public /api/partner-registrations submit route and admin routes. Matched by email against new signups in processPartnerAttribution() (src/lib/partner-referrals.ts) to auto-grant institutional Premium + a partners referral link.';

-- -----------------------------------------------------------------------------
-- Allow 'logic_church' as an institution_badge value alongside the existing
-- Sound Academy / Abbey Road Institute badges.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_institution_badge_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_institution_badge_check
  CHECK (institution_badge IN ('abbey_road_institute', 'sound_academy', 'logic_church'));
