-- Store the drawn signature image so an application can be confirmed as hand-signed.

ALTER TABLE public.partner_agreement_signups
  ADD COLUMN IF NOT EXISTS signature_png TEXT;

COMMENT ON COLUMN public.partner_agreement_signups.signature_png IS
  'Base64 PNG of the applicant''s drawn signature, captured at /agreement/partner.';
