-- Event promotion source tracking (notification, feed card, shared link, etc.)
-- Canonical migration — mobile writes INSERT/UPDATE; web admin uses service_role.

CREATE TABLE IF NOT EXISTS public.event_promotion_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (
    source IN ('notification', 'feed_card', 'direct_search', 'shared_link', 'other')
  ),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purchased_ticket BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS event_promotion_interactions_event_id_idx
  ON public.event_promotion_interactions (event_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS event_promotion_interactions_user_event_idx
  ON public.event_promotion_interactions (user_id, event_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS event_promotion_interactions_source_idx
  ON public.event_promotion_interactions (source, viewed_at DESC);

CREATE INDEX IF NOT EXISTS event_promotion_interactions_purchased_idx
  ON public.event_promotion_interactions (purchased_at DESC)
  WHERE purchased_ticket = TRUE;

COMMENT ON TABLE public.event_promotion_interactions IS
  'Tracks how users arrived at events and whether they purchased tickets via SoundBridge promotion.';

ALTER TABLE public.event_promotion_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_promotion_interactions_insert_own ON public.event_promotion_interactions;
CREATE POLICY event_promotion_interactions_insert_own ON public.event_promotion_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS event_promotion_interactions_update_own ON public.event_promotion_interactions;
CREATE POLICY event_promotion_interactions_update_own ON public.event_promotion_interactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS event_promotion_interactions_select_own ON public.event_promotion_interactions;
CREATE POLICY event_promotion_interactions_select_own ON public.event_promotion_interactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS event_promotion_interactions_service_all ON public.event_promotion_interactions;
CREATE POLICY event_promotion_interactions_service_all ON public.event_promotion_interactions
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT, INSERT, UPDATE ON public.event_promotion_interactions TO authenticated;
GRANT ALL ON public.event_promotion_interactions TO service_role;
