-- AI Career Adviser proactive monitoring (mobile parity — safe if already applied)

ALTER TABLE public.venue_notification_preferences
  ADD COLUMN IF NOT EXISTS opportunity_scouting_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.venue_notification_preferences
  ADD COLUMN IF NOT EXISTS last_opportunity_search_at TIMESTAMPTZ;

COMMENT ON COLUMN public.venue_notification_preferences.opportunity_scouting_enabled IS
  'Opt-in weekly open mic / venue opportunity search for AI Career Adviser';

-- ─── Curated opportunities (admin-managed) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.curated_opportunities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  opportunity_type TEXT NOT NULL
    CHECK (opportunity_type IN (
      'open_mic', 'venue', 'policy_change', 'brand_partnership', 'industry_news'
    )),
  genre_tags       TEXT[] NOT NULL DEFAULT '{}',
  location_city    TEXT,
  source_url       TEXT,
  expires_at       DATE,
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curated_opportunities_expires_idx
  ON public.curated_opportunities (expires_at);

CREATE INDEX IF NOT EXISTS curated_opportunities_city_idx
  ON public.curated_opportunities (location_city);

-- Tracks which opportunity was shown to which creator (no re-surface)
CREATE TABLE IF NOT EXISTS public.curated_opportunity_surfaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  UUID NOT NULL REFERENCES public.curated_opportunities(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  surfaced_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, creator_id)
);

CREATE INDEX IF NOT EXISTS curated_opportunity_surfaces_creator_idx
  ON public.curated_opportunity_surfaces (creator_id);

-- ─── Proactive signals ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_proactive_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type       TEXT NOT NULL
    CHECK (signal_type IN (
      'quality_threshold', 'live_interest', 'curated_opportunity', 'service_match'
    )),
  signal_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_insight TEXT,
  shown_to_user     BOOLEAN NOT NULL DEFAULT false,
  notified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_proactive_signals_creator_created_idx
  ON public.ai_proactive_signals (creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_proactive_signals_creator_unshown_idx
  ON public.ai_proactive_signals (creator_id)
  WHERE shown_to_user = false;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.curated_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_opportunity_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_proactive_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS curated_opportunities_authenticated_read ON public.curated_opportunities;
CREATE POLICY curated_opportunities_authenticated_read ON public.curated_opportunities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS curated_opportunities_admin_write ON public.curated_opportunities;
CREATE POLICY curated_opportunities_admin_write ON public.curated_opportunities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS curated_opportunity_surfaces_own_read ON public.curated_opportunity_surfaces;
CREATE POLICY curated_opportunity_surfaces_own_read ON public.curated_opportunity_surfaces
  FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS ai_proactive_signals_own_read ON public.ai_proactive_signals;
CREATE POLICY ai_proactive_signals_own_read ON public.ai_proactive_signals
  FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS ai_proactive_signals_own_update ON public.ai_proactive_signals;
CREATE POLICY ai_proactive_signals_own_update ON public.ai_proactive_signals
  FOR UPDATE USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());
