-- Singleton agreement pages (e.g. /agreement/mbg-sonics) store one row per slug.

ALTER TABLE public.agreement_drafts
  ADD COLUMN IF NOT EXISTS agreement_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_drafts_slug_unique
  ON public.agreement_drafts (agreement_slug)
  WHERE agreement_slug IS NOT NULL;

COMMENT ON COLUMN public.agreement_drafts.agreement_slug IS
  'When set, identifies the canonical singleton agreement (one row per slug).';
