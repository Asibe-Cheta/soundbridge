-- Event discovery in feed: analytics counters + safe increment RPC.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS feed_impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feed_cta_taps integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_event_feed_stat(
  p_event_id uuid,
  p_field text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field = 'feed_impressions' THEN
    UPDATE public.events
    SET feed_impressions = feed_impressions + 1
    WHERE id = p_event_id;
  ELSIF p_field = 'feed_cta_taps' THEN
    UPDATE public.events
    SET feed_cta_taps = feed_cta_taps + 1
    WHERE id = p_event_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_event_feed_stat(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_event_feed_stat(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_event_feed_stat(uuid, text) TO service_role;
