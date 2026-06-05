-- Platform legal protection: creator agreement + per-event disclaimer acceptance

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creator_agreement_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_agreement_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_agreement_version text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS creator_event_disclaimer_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_event_disclaimer_accepted_at timestamptz;

COMMENT ON COLUMN public.profiles.creator_agreement_accepted IS
  'Creator ticked all five Creator Agreement checkboxes at onboarding (v1.0).';
COMMENT ON COLUMN public.profiles.creator_agreement_version IS
  'Version of Creator Agreement accepted, e.g. v1.0.';
COMMENT ON COLUMN public.events.creator_event_disclaimer_accepted IS
  'Creator accepted sole responsibility disclaimer when publishing this event.';
