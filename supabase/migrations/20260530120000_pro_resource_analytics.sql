-- Pro Resource Analytics (mobile + web)
-- Tracks Pro Resources screen views and resource taps.

CREATE TABLE IF NOT EXISTS public.pro_resource_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text        NOT NULL,
  resource    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_user_id    ON public.pro_resource_events (user_id);
CREATE INDEX IF NOT EXISTS idx_pre_type       ON public.pro_resource_events (event_type);
CREATE INDEX IF NOT EXISTS idx_pre_created_at ON public.pro_resource_events (created_at DESC);

ALTER TABLE public.pro_resource_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pre_insert_own" ON public.pro_resource_events;
CREATE POLICY "pre_insert_own" ON public.pro_resource_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pre_admin_select" ON public.pro_resource_events;
CREATE POLICY "pre_admin_select" ON public.pro_resource_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE OR REPLACE VIEW public.pro_resource_analytics_summary AS
SELECT
  event_type,
  resource,
  COUNT(*)                                                               AS total_events,
  COUNT(DISTINCT user_id)                                                AS unique_users,
  COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days')       AS events_7d,
  COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days')      AS events_30d,
  MAX(created_at)                                                        AS last_event_at
FROM public.pro_resource_events
GROUP BY event_type, resource
ORDER BY total_events DESC;

CREATE OR REPLACE VIEW public.pro_resource_user_events AS
SELECT
  e.id,
  e.event_type,
  e.resource,
  e.created_at,
  e.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.subscription_tier
FROM  public.pro_resource_events e
LEFT JOIN public.profiles p ON p.id = e.user_id
ORDER BY e.created_at DESC;

GRANT INSERT ON public.pro_resource_events TO authenticated;
GRANT SELECT ON public.pro_resource_analytics_summary TO authenticated;
GRANT SELECT ON public.pro_resource_user_events TO authenticated;
