-- Shared drafts for /agreement (unlisted link + uuid). Service role from Next.js API only.

CREATE TABLE IF NOT EXISTS public.agreement_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  save_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_drafts_expires
  ON public.agreement_drafts (expires_at);

ALTER TABLE public.agreement_drafts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.agreement_drafts IS 'Saved agreement form + signatures for shared signing at /agreement?draft=uuid';
