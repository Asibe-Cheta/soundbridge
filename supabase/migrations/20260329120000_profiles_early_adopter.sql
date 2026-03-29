-- Early Adopter cohort flag (launch email promise: badge + benefits tracking)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS early_adopter BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.early_adopter IS
  'User is in the permanent early adopter cohort (e.g. launch waitlist / campaign).';
