-- Guest tips from artist fan landing page (web); source for creator CRM / analytics.
-- Inserts use service role from Next.js API; RLS enabled with no policies = deny via PostgREST.

CREATE TABLE IF NOT EXISTS public.fan_landing_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_email TEXT NOT NULL,
  guest_name TEXT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'fan_landing_page',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fan_landing_tips_creator_created
  ON public.fan_landing_tips (creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_landing_tips_pi
  ON public.fan_landing_tips (stripe_payment_intent_id);

ALTER TABLE public.fan_landing_tips ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fan_landing_tips IS 'Guest tips from soundbridge.live/[username]/home; finalized via Stripe webhook.';

-- Anonymous page analytics (optional; API uses service role).
CREATE TABLE IF NOT EXISTS public.fan_landing_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fan_landing_analytics_creator_created
  ON public.fan_landing_analytics_events (creator_id, created_at DESC);

ALTER TABLE public.fan_landing_analytics_events ENABLE ROW LEVEL SECURITY;
