-- Tip Room stats (mobile Live Sessions QR — /tip/{username})
-- Safe if mobile already applied a similar script.

CREATE TABLE IF NOT EXISTS public.tip_room_tips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      DECIMAL(10,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'gbp',
  tipped_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tip_room_tips
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS tip_room_tips_stripe_pi_uidx
  ON public.tip_room_tips (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tip_room_tips_creator_id_idx
  ON public.tip_room_tips (creator_id);

CREATE INDEX IF NOT EXISTS tip_room_tips_tipped_at_idx
  ON public.tip_room_tips (tipped_at DESC);

ALTER TABLE public.tip_room_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tip_room_tips_creator_select ON public.tip_room_tips;
CREATE POLICY tip_room_tips_creator_select ON public.tip_room_tips
  FOR SELECT USING (creator_id = auth.uid());

COMMENT ON TABLE public.tip_room_tips IS
  'Tip Room QR scan tips — stats for creator today/week/month on mobile. Inserts via service role after Stripe success.';
