-- Backfills platform_revenue for the 3 historic Request Room payments found
-- during this session's investigation — all real Stripe charges, all
-- correctly credited to the creator's wallet, none ever recorded in
-- platform_revenue (see 20261109160000's header for why). Source data is
-- wallet_transactions.metadata, the only place these fee amounts currently
-- live: each row has gross_amount/platform_fee/creator_earnings/
-- platform_fee_percent already computed by the webhook at the time it ran.
--
-- A count guard aborts before writing anything if the live count has
-- drifted from the 3 found during investigation, rather than silently
-- backfilling a different population than was reviewed.
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM wallet_transactions wt
  WHERE wt.metadata->>'source' = 'request_room'
    AND NOT EXISTS (
      SELECT 1 FROM platform_revenue pr
      WHERE pr.stripe_payment_intent_id = wt.stripe_payment_intent_id
    );

  IF v_count <> 3 THEN
    RAISE EXCEPTION 'Expected exactly 3 Request Room backfill candidates, found %. Aborting — investigate before re-running.', v_count;
  END IF;
END $$;

INSERT INTO public.platform_revenue (
  charge_type, gross_amount, platform_fee_amount, platform_fee_percent,
  creator_payout_amount, stripe_payment_intent_id, reference_id,
  creator_user_id, currency, payment_method_type, created_at
)
SELECT
  'request_room',
  ROUND((wt.metadata->>'gross_amount')::numeric * 100)::INTEGER,
  ROUND((wt.metadata->>'platform_fee')::numeric * 100)::INTEGER,
  (wt.metadata->>'platform_fee_percent')::numeric,
  ROUND((wt.metadata->>'creator_earnings')::numeric * 100)::INTEGER,
  wt.stripe_payment_intent_id,
  wt.stripe_payment_intent_id,
  wt.user_id,
  wt.currency,
  NULL,
  wt.created_at
FROM wallet_transactions wt
WHERE wt.metadata->>'source' = 'request_room'
  AND NOT EXISTS (
    SELECT 1 FROM platform_revenue pr
    WHERE pr.stripe_payment_intent_id = wt.stripe_payment_intent_id
  );
