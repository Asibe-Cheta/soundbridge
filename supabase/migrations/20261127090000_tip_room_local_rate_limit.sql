-- Per-IP rate limit ledger for the public, read-only
-- /api/payments/tip-room-local-rate endpoint (Tip Room's display-only local
-- currency approximation). Hashed IP only, never the raw IP, same pattern
-- as agreement_rate_limit_hits / survey_rate_limit_hits.
CREATE TABLE IF NOT EXISTS public.tip_room_local_rate_hits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tip_room_local_rate_hits_ip_idx ON public.tip_room_local_rate_hits (ip_hash, created_at);

ALTER TABLE public.tip_room_local_rate_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tip_room_local_rate_hits FROM PUBLIC;
REVOKE ALL ON public.tip_room_local_rate_hits FROM anon;
REVOKE ALL ON public.tip_room_local_rate_hits FROM authenticated;
GRANT SELECT, INSERT ON public.tip_room_local_rate_hits TO service_role;
