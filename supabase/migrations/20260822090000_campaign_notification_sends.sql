-- Idempotency guard for scheduled marketing campaign push notifications
-- (WEB_TEAM_IG_LIVE_CAMPAIGN.MD). One row per (campaign, day) sent; the cron
-- route inserts before sending and treats a unique-violation as "already sent".
CREATE TABLE IF NOT EXISTS public.campaign_notification_sends (
  campaign_id TEXT NOT NULL,
  send_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, send_date)
);

-- Service role only (cron route uses SUPABASE_SERVICE_ROLE_KEY); no client access needed.
ALTER TABLE public.campaign_notification_sends ENABLE ROW LEVEL SECURITY;
