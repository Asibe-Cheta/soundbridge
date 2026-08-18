-- =============================================================================
-- Live Streaming (mobile-only video, via Cloudflare Stream Live)
-- =============================================================================
-- Separate from — and does not touch — the existing Agora audio live_sessions
-- feature. See LIVE_STREAMING.MD for the full feature spec.
--
-- Eligibility (enforced server-side in apps/web/src/lib/live-stream-eligibility.ts,
-- not here): >=50 followers OR profiles.institution_badge IS NOT NULL, following
-- the exact same "tagged with a partner institution" pattern already used for
-- Sound Academy / Abbey Road Institute / Logic Church.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.live_streams (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cloudflare_stream_id text NOT NULL,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'failed')),
  started_at         timestamptz NOT NULL DEFAULT now(),
  ended_at           timestamptz,
  title              text,
  viewer_count       integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  -- Not in the original field list — needed so the 2h45m warning cron (runs
  -- every minute) sends it exactly once per stream instead of re-sending on
  -- every tick during that 15-minute window.
  duration_warning_sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_live_streams_user_id ON public.live_streams (user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status_active ON public.live_streams (status) WHERE status = 'active';
-- At most one active stream per creator — start route relies on this to detect "already live".
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_streams_one_active_per_user
  ON public.live_streams (user_id) WHERE status = 'active';

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators manage own live streams" ON public.live_streams;
CREATE POLICY "Creators manage own live streams"
  ON public.live_streams FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read active streams" ON public.live_streams;
CREATE POLICY "Authenticated users can read active streams"
  ON public.live_streams FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'active');

COMMENT ON TABLE public.live_streams IS
  'Mobile-only video live streaming via Cloudflare Stream Live. RTMP URL and stream key are never stored here — see /api/live-streams/[id]/credentials, which re-fetches them from Cloudflare, scoped to the owning creator only. Enable Supabase Realtime replication for this table via the dashboard (Database -> Replication) so viewer_count UPDATEs push to subscribed clients — no other table in this project enables replication via migration SQL, it is a dashboard-managed toggle here.';

-- -----------------------------------------------------------------------------
-- Tag tips sent during a live stream, so the end-of-stream summary notification
-- can sum "total tips received during the session". Nullable, additive — the
-- existing tip flow (track_id-style optional tagging) is otherwise untouched.
-- -----------------------------------------------------------------------------
ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tips_live_stream_id ON public.tips (live_stream_id) WHERE live_stream_id IS NOT NULL;

ALTER TABLE public.creator_tips ADD COLUMN IF NOT EXISTS live_stream_id uuid REFERENCES public.live_streams(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Atomic viewer-count adjustment (avoids read-then-write races between
-- concurrent viewer join/leave requests). UPDATE on live_streams is what
-- clients subscribe to via Supabase Realtime (postgres_changes) for the
-- live-updating viewer count.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_live_stream_viewer_count(p_live_stream_id uuid, p_delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_streams
  SET viewer_count = GREATEST(0, viewer_count + p_delta)
  WHERE id = p_live_stream_id
    AND status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_live_stream_viewer_count(uuid, integer) TO authenticated;
