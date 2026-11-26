-- Personal e-signature flow for partner agreements (Talk 2 Dan first).
-- RLS enabled, zero policies on both tables -- anon/authenticated get
-- nothing; every read/write goes through a server route using the service
-- role (same pattern as every table locked down this week). The signing
-- link's security comes entirely from the token: 32+ random bytes
-- generated server-side, only its SHA-256 hash is ever stored, compared in
-- constant time (src/lib/agreements/agreement-token.ts). The raw token is
-- never logged and never stored.

CREATE TABLE IF NOT EXISTS public.agreements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id              UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  partner_name            TEXT NOT NULL,
  signer_email            TEXT,
  template_key            TEXT NOT NULL,
  agreement_text_snapshot TEXT NOT NULL,
  document_hash           TEXT NOT NULL,
  token_hash              TEXT NOT NULL UNIQUE,
  expires_at              TIMESTAMPTZ NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'sent'
                            CHECK (status IN ('sent', 'viewed', 'signed', 'revoked')),
  created_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at               TIMESTAMPTZ,
  signed_at               TIMESTAMPTZ,
  revoked_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agreements_token_hash_idx ON public.agreements (token_hash);
CREATE INDEX IF NOT EXISTS agreements_partner_id_idx ON public.agreements (partner_id);
CREATE INDEX IF NOT EXISTS agreements_status_idx ON public.agreements (status);

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agreements FROM PUBLIC;
REVOKE ALL ON public.agreements FROM anon;
REVOKE ALL ON public.agreements FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agreements TO service_role;

COMMENT ON TABLE public.agreements IS
  'Partner e-signature agreements. token_hash is the only trace of the signing link -- the raw token is never stored. agreement_text_snapshot is the exact text shown and hashed at creation time; later edits to the content file never change an already-created agreement.';

CREATE TABLE IF NOT EXISTS public.agreement_signatures (
  agreement_id        UUID PRIMARY KEY REFERENCES public.agreements(id) ON DELETE CASCADE,
  signer_name          TEXT NOT NULL,
  signer_role          TEXT NOT NULL,
  signer_entity        TEXT NOT NULL,
  signature_image      TEXT NOT NULL, -- private storage path, not a public URL
  signed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address           TEXT,
  user_agent           TEXT,
  accepted_text_hash   TEXT NOT NULL
);

ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agreement_signatures FROM PUBLIC;
REVOKE ALL ON public.agreement_signatures FROM anon;
REVOKE ALL ON public.agreement_signatures FROM authenticated;
GRANT SELECT, INSERT ON public.agreement_signatures TO service_role;

COMMENT ON TABLE public.agreement_signatures IS
  'One row per agreement (PK on agreement_id, not a separate id, so a second signature can never be inserted for the same agreement). Personal data recorded: signer name, role, entity, signature image, IP address, browser user agent, date/time -- disclosed to the signer on the signing page itself.';

-- Rate-limit ledger for the public signing page/endpoint. Hashed IP only,
-- same reasoning as survey_rate_limit_hits -- never store a raw IP for a
-- rate-limit key.
CREATE TABLE IF NOT EXISTS public.agreement_rate_limit_hits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agreement_rate_limit_hits_ip_idx ON public.agreement_rate_limit_hits (ip_hash, created_at);

ALTER TABLE public.agreement_rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agreement_rate_limit_hits FROM PUBLIC;
REVOKE ALL ON public.agreement_rate_limit_hits FROM anon;
REVOKE ALL ON public.agreement_rate_limit_hits FROM authenticated;
GRANT SELECT, INSERT ON public.agreement_rate_limit_hits TO service_role;

-- Private bucket for signed PDFs and signature PNGs. No public/user
-- policies at all -- every read goes through a service-role-issued,
-- short-lived signed URL, never a direct bucket URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreement-files', 'agreement-files', false)
ON CONFLICT (id) DO NOTHING;

-- Atomic sign: row-locks the agreement, validates its state, inserts the
-- one-and-only signature row, and flips status to 'signed' -- all in one
-- transaction, so two concurrent submits for the same token can never both
-- succeed (the FOR UPDATE lock serializes them; the PK on agreement_id is
-- the second line of defense if that were ever bypassed).
CREATE OR REPLACE FUNCTION public.sign_partner_agreement(
  p_token_hash       TEXT,
  p_signer_name      TEXT,
  p_signer_role      TEXT,
  p_signer_entity    TEXT,
  p_signature_image  TEXT,
  p_ip_address       TEXT,
  p_user_agent       TEXT
)
RETURNS TABLE (
  agreement_id             UUID,
  partner_name             TEXT,
  document_hash            TEXT,
  agreement_text_snapshot  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement RECORD;
BEGIN
  SELECT * INTO v_agreement
  FROM public.agreements
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_agreement.status = 'revoked' THEN
    RAISE EXCEPTION 'revoked';
  END IF;

  IF v_agreement.status = 'signed' THEN
    RAISE EXCEPTION 'already_signed';
  END IF;

  IF v_agreement.expires_at < now() THEN
    RAISE EXCEPTION 'expired';
  END IF;

  INSERT INTO public.agreement_signatures (
    agreement_id, signer_name, signer_role, signer_entity,
    signature_image, ip_address, user_agent, accepted_text_hash
  ) VALUES (
    v_agreement.id, p_signer_name, p_signer_role, p_signer_entity,
    p_signature_image, p_ip_address, p_user_agent, v_agreement.document_hash
  );

  UPDATE public.agreements
  SET status = 'signed', signed_at = now()
  WHERE id = v_agreement.id;

  RETURN QUERY
    SELECT v_agreement.id, v_agreement.partner_name, v_agreement.document_hash, v_agreement.agreement_text_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.sign_partner_agreement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_partner_agreement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
