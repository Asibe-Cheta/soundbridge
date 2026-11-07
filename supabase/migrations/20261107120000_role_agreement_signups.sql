-- Reusable single-signer + admin-countersign volunteer-role agreement pages,
-- e.g. /agreement/product-manager. One row per role slug. Unlisted (robots
-- noindex) rather than token-gated — the slug/name is the agreement's identity,
-- matching the /agreement/<slug> convention used by partner and mbg-sonics.
--
-- Service-role only (API routes use createServiceClient()), same access
-- pattern as podcast_host_agreement_signups / partner_agreement_signups:
-- RLS enabled, zero policies, and (per the Data API grant requirement that
-- took effect 2026-10-30) an explicit grant to service_role only — anon and
-- authenticated get nothing, since the public page never queries Supabase
-- directly from the browser.

CREATE TABLE IF NOT EXISTS public.role_agreement_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  role_title TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  agreement_version TEXT NOT NULL DEFAULT 'v1',
  text_hash TEXT,
  signer_email TEXT,
  signer_signature_png TEXT,
  signer_agreed_at TIMESTAMPTZ,
  signer_ip TEXT,
  signer_user_agent TEXT,
  admin_signed_by TEXT,
  admin_signature_png TEXT,
  admin_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_agreement_signups ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.role_agreement_signups IS
  'Signed state for reusable single-signer + admin-countersign role agreement pages (e.g. /agreement/product-manager). Service-role only, zero RLS policies.';

GRANT SELECT, INSERT, UPDATE ON public.role_agreement_signups TO service_role;

CREATE TABLE IF NOT EXISTS public.role_agreement_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_agreement_attempts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.role_agreement_attempts IS
  'Per-IP rate-limit log for signing attempts on role agreement pages. Service-role only, zero RLS policies.';

CREATE INDEX IF NOT EXISTS idx_role_agreement_attempts_ip_created
  ON public.role_agreement_attempts (ip_address, created_at);

GRANT SELECT, INSERT ON public.role_agreement_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.role_agreement_attempts_id_seq TO service_role;

-- Seed the Product Manager agreement for Promise Akabudu.
INSERT INTO public.role_agreement_signups (slug, role_title, signer_name, agreement_version)
VALUES ('product-manager', 'Product Manager', 'Promise Akabudu', 'v1')
ON CONFLICT (slug) DO NOTHING;
