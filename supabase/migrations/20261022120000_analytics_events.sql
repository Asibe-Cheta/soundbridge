-- Generic client analytics event ingestion table.
-- First consumer: mobile app's "Vote for SoundBridge" campaign engagement
-- tracking (vote_notification_tapped, vote_now_tapped, vote_link_copied,
-- vote_link_shared), sent via POST /api/analytics/events. Designed generic
-- so future client-side event types can reuse the same table/endpoint.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL,
  action text NOT NULL,
  label text,
  value numeric,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_action ON public.analytics_events (action);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON public.analytics_events USING gin (properties);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Authenticated clients can insert their own events. No SELECT policy —
-- reads happen only through the service role (admin dashboard APIs).
CREATE POLICY "Users can insert their own analytics events"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
