-- Digital card cryptographic auth + account recovery (mobile DIGITAL_CARD_API_CONTRACT)
-- Date: 2026-05-18

-- ---------------------------------------------------------------------------
-- profiles: generation counters + processed card photo URL
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS card_generations_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_generations_lifetime integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_generation_month date DEFAULT null,
  ADD COLUMN IF NOT EXISTS card_photo_url text DEFAULT null;

COMMENT ON COLUMN public.profiles.card_generations_this_month IS 'Digital branded card generations in current UTC month.';
COMMENT ON COLUMN public.profiles.card_generations_lifetime IS 'Lifetime digital card generation count.';
COMMENT ON COLUMN public.profiles.card_generation_month IS 'UTC month start date for card_generations_this_month reset.';
COMMENT ON COLUMN public.profiles.card_photo_url IS 'Public URL of background-removed card photo (avatars/card-photos/{id}.png).';

-- ---------------------------------------------------------------------------
-- card_auth_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.card_auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_auth_token text NOT NULL,
  token_salt text NOT NULL,
  file_fingerprint text,
  is_active boolean NOT NULL DEFAULT true,
  invalidated_at timestamptz,
  used_for_recovery_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_auth_tokens_creator_active
  ON public.card_auth_tokens(creator_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_card_auth_tokens_creator_generated
  ON public.card_auth_tokens(creator_id, generated_at DESC);

-- ---------------------------------------------------------------------------
-- recovery_sessions (opaque server-side session between verify-card and complete)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recovery_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token_hash text NOT NULL UNIQUE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  persona_verified boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_sessions_creator
  ON public.recovery_sessions(creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recovery_sessions_expires
  ON public.recovery_sessions(expires_at)
  WHERE used_at IS NULL;

-- ---------------------------------------------------------------------------
-- recovery_attempts (audit + rate limiting)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recovery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address text,
  outcome text NOT NULL CHECK (
    outcome IN ('success', 'failed', 'rate_limited', 'pending_manual')
  ),
  recovery_session_id uuid REFERENCES public.recovery_sessions(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_attempts_ip_created
  ON public.recovery_attempts(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recovery_attempts_creator_created
  ON public.recovery_attempts(creator_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- recovery_requests (manual admin review queue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recovery_session_id uuid REFERENCES public.recovery_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  card_file_storage_path text NOT NULL,
  selfie_video_storage_path text NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_requests_status_created
  ON public.recovery_requests(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: no direct mobile access to tokens/sessions/attempts; limited recovery_requests read
-- ---------------------------------------------------------------------------
ALTER TABLE public.card_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'recovery_requests'
      AND policyname = 'Creators read own recovery requests'
  ) THEN
    CREATE POLICY "Creators read own recovery requests"
      ON public.recovery_requests
      FOR SELECT
      USING (creator_id = auth.uid());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Private storage bucket for recovery evidence (signed upload URLs from API only)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recovery-evidence',
  'recovery-evidence',
  false,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
