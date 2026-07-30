-- PayPal as a payment option (PAYPAL_INTEGRATION.MD): record which payment method
-- (card vs paypal) was used per transaction, for reconciliation now that PayPal is
-- selectable alongside card on every one-time payment flow.

ALTER TABLE public.platform_revenue
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT;
COMMENT ON COLUMN public.platform_revenue.payment_method_type IS 'Stripe payment method type used for the charge, e.g. card, paypal';

ALTER TABLE public.content_purchases
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT;
COMMENT ON COLUMN public.content_purchases.payment_method_type IS 'Stripe payment method type used for the charge, e.g. card, paypal';

ALTER TABLE public.request_room_requests
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT;
COMMENT ON COLUMN public.request_room_requests.payment_method_type IS 'Stripe payment method type used for the charge, e.g. card, paypal';

ALTER TABLE public.purchased_event_tickets
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT;
COMMENT ON COLUMN public.purchased_event_tickets.payment_method_type IS 'Stripe payment method type used for the charge, e.g. card, paypal';

-- insert_platform_revenue gains an optional p_payment_method_type param. The prior 9-arg
-- overload is dropped first so callers that omit it still resolve to this one function
-- (Postgres treats a different arg count as a distinct overload, not a replacement).
DROP FUNCTION IF EXISTS public.insert_platform_revenue(TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.insert_platform_revenue(
  p_charge_type TEXT,
  p_gross_amount INTEGER,
  p_platform_fee_amount INTEGER,
  p_platform_fee_percent DECIMAL,
  p_creator_payout_amount INTEGER,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_creator_user_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT 'GBP',
  p_payment_method_type TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_stripe_payment_intent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.platform_revenue WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
  ) THEN
    SELECT id INTO v_id FROM public.platform_revenue WHERE stripe_payment_intent_id = p_stripe_payment_intent_id LIMIT 1;
    RETURN v_id;
  END IF;
  INSERT INTO public.platform_revenue (
    charge_type, gross_amount, platform_fee_amount, platform_fee_percent, creator_payout_amount,
    stripe_payment_intent_id, reference_id, creator_user_id, currency, payment_method_type
  )
  VALUES (
    p_charge_type, p_gross_amount, p_platform_fee_amount, p_platform_fee_percent, p_creator_payout_amount,
    p_stripe_payment_intent_id, p_reference_id, p_creator_user_id, p_currency, p_payment_method_type
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_platform_revenue(TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_platform_revenue(TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT, TEXT, UUID, TEXT, TEXT) TO service_role;

-- Ops runbook: card vs PayPal mix by charge type (amounts in minor units; divide by 100 for GBP)
-- SELECT charge_type, COALESCE(payment_method_type, 'unknown') AS method, COUNT(*), SUM(gross_amount)/100.0 AS gross_gbp
-- FROM platform_revenue GROUP BY charge_type, method ORDER BY charge_type, method;
