-- Align service_provider_profiles with verification admin + Persona flows.
-- Safe to run in prod when verification_status / related columns are missing.

ALTER TABLE public.service_provider_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_provider VARCHAR(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_provider_profiles_verification_status_check'
  ) THEN
    ALTER TABLE public.service_provider_profiles
      ADD CONSTRAINT service_provider_profiles_verification_status_check
      CHECK (verification_status IN ('not_requested', 'pending', 'approved', 'rejected'));
  END IF;
END $$;
