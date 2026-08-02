-- Standalone PayPal integration (PAYPAL_INTEGRATION.MD): PayPal's Orders API only carries a
-- single 127-char custom_id, nowhere near Stripe's flexible metadata dict. Insert a pending
-- charge row first, pass its id as custom_id, look it up again on capture to know exactly
-- what to finalize (which creator's wallet, which per-flow table row, etc).

CREATE TABLE IF NOT EXISTS public.paypal_pending_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_type TEXT NOT NULL CHECK (charge_type IN ('tip_room', 'fan_landing_tip', 'request_room_tip', 'content_purchase')),
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  payer_id UUID REFERENCES auth.users(id),
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL,
  platform_fee DECIMAL NOT NULL,
  creator_earnings DECIMAL NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed')),
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  captured_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_paypal_pending_charges_order_id ON public.paypal_pending_charges(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_paypal_pending_charges_status ON public.paypal_pending_charges(status);

COMMENT ON TABLE public.paypal_pending_charges IS 'Tracks a PayPal charge from order creation through capture; referenced by id via PayPal''s custom_id since PayPal has no equivalent to Stripe''s flexible PaymentIntent metadata.';

ALTER TABLE public.paypal_pending_charges ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side finalize/webhook code) reads/writes this table directly;
-- payers and creators never query it, they see the resulting tips/content_purchases/etc rows.
GRANT ALL ON public.paypal_pending_charges TO service_role;
