-- Google Calendar integration (FreeBusy only — tokens server-side, encrypted)
-- See MOBILE_TEAM_GOOGLE_CALENDAR_WEB_HANDOFF.MD

CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  user_id                uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider               text NOT NULL DEFAULT 'google',
  access_token           text NOT NULL,
  refresh_token          text NOT NULL,
  token_expires_at       timestamptz NOT NULL,
  calendar_connected     boolean NOT NULL DEFAULT false,
  calendar_connected_at  timestamptz,
  last_synced_at         timestamptz,
  needs_reconnect        boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_integrations_connected_idx
  ON public.calendar_integrations (calendar_connected)
  WHERE calendar_connected = true;

ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
-- No client policies: tokens accessed only via service-role API routes.

ALTER TABLE public.user_behaviour_profiles
  ADD COLUMN IF NOT EXISTS calendar_free_days text[],
  ADD COLUMN IF NOT EXISTS calendar_free_times text[],
  ADD COLUMN IF NOT EXISTS calendar_pattern_confidence decimal,
  ADD COLUMN IF NOT EXISTS calendar_pattern_updated_at timestamptz;

-- Optional: audit free/busy checks for pattern learning (binary only, no raw Google payload)
CREATE TABLE IF NOT EXISTS public.calendar_availability_checks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id     uuid REFERENCES public.events(id) ON DELETE SET NULL,
  checked_at   timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL,
  window_end   timestamptz NOT NULL,
  is_free      boolean NOT NULL,
  source       text NOT NULL DEFAULT 'freebusy'
);

CREATE INDEX IF NOT EXISTS calendar_availability_checks_user_idx
  ON public.calendar_availability_checks (user_id, checked_at DESC);

ALTER TABLE public.calendar_availability_checks ENABLE ROW LEVEL SECURITY;
