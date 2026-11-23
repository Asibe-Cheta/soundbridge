-- Public survey responses (/survey/notifications), starting with
-- survey_key = 'notifications_interest_2026_11'.
--
-- Both tables here are brand new -- no existing data to snapshot, so unlike
-- recent migrations that ALTER an existing table, there is no backup table
-- in this one. See scripts/rollback-survey-responses.sql to drop both.
--
-- RLS is enabled with ZERO policies on both tables: anon/authenticated get
-- nothing (no policy = no access), and service_role bypasses RLS entirely
-- (Supabase's BYPASSRLS on that role) -- the explicit REVOKE/GRANT below is
-- the Data API grant layer, required separately from RLS (confirmed
-- necessary firsthand on the Tip Room USD-reporting migration this week:
-- a new public-schema table needs an explicit GRANT to service_role or the
-- Data API returns "table not found" even with RLS correctly configured).
-- The browser never talks to either table directly -- only the server
-- route (app/api/survey/notifications/route.ts), using the service client.

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_key     TEXT NOT NULL,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  anon_id        TEXT NOT NULL,
  answers        JSONB NOT NULL DEFAULT '{}'::jsonb,
  country        TEXT,
  ref            TEXT,
  utm_source     TEXT,
  utm_medium     TEXT,
  utm_campaign   TEXT,
  started_at     TIMESTAMPTZ DEFAULT now(),
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (survey_key, anon_id)
);

CREATE INDEX IF NOT EXISTS survey_responses_survey_key_idx
  ON public.survey_responses (survey_key);
CREATE INDEX IF NOT EXISTS survey_responses_completed_idx
  ON public.survey_responses (survey_key, completed_at);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.survey_responses FROM PUBLIC;
REVOKE ALL ON public.survey_responses FROM anon;
REVOKE ALL ON public.survey_responses FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.survey_responses TO service_role;

COMMENT ON TABLE public.survey_responses IS
  'Public survey responses. No personal data: no IP, no email. country is the platform-provided connection country, not precise location. Written only by app/api/survey/notifications/route.ts via the service role.';

-- Rate-limit ledger. Stores a salted hash of the IP, never the IP itself --
-- see hashIp() in src/lib/survey-rate-limit.ts.
CREATE TABLE IF NOT EXISTS public.survey_rate_limit_hits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash     TEXT NOT NULL,
  anon_id     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survey_rate_limit_hits_ip_idx
  ON public.survey_rate_limit_hits (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS survey_rate_limit_hits_anon_idx
  ON public.survey_rate_limit_hits (anon_id, created_at);

ALTER TABLE public.survey_rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.survey_rate_limit_hits FROM PUBLIC;
REVOKE ALL ON public.survey_rate_limit_hits FROM anon;
REVOKE ALL ON public.survey_rate_limit_hits FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.survey_rate_limit_hits TO service_role;

COMMENT ON TABLE public.survey_rate_limit_hits IS
  'Rate-limit ledger for public survey endpoints. ip_hash is a salted SHA-256 of the IP, never the IP itself. Rows are small and short-lived; safe to periodically delete rows older than a day.';
