-- Atomic tip finalization (TIP_DROPOFF_INVESTIGATION follow-up).
--
-- Root cause of tips stuck 'pending' despite a successful Stripe charge and a
-- wallet credit already having happened: finalizeTipFromSucceededPaymentIntentInner
-- (src/lib/tip-payment-intent-webhook.ts) updated tips/creator_tips and credited
-- the wallet as separate, non-transactional steps — the creator_tips update had
-- no error handling at all, and the tips update logged-and-continued on error
-- instead of stopping, so a failure there never prevented the later wallet credit
-- from succeeding. This happens identically whether the finalize call comes from
-- the client's confirm-tip request or from either Stripe webhook, since both call
-- the same shared function.
--
-- Fix: move "mark tips/creator_tips completed, record platform_revenue, credit
-- the wallet" into one Postgres function. A plpgsql function body is one
-- transaction — if any step fails, the whole thing rolls back, so the three
-- facts (row says completed, platform_revenue recorded, wallet credited) can
-- never diverge again. The row is locked with SELECT ... FOR UPDATE first, so
-- two concurrent calls for the same payment_intent_id serialize on that lock:
-- whichever commits first wins, the second sees status='completed' on its own
-- SELECT and returns as a no-op, never reaching the insert/credit steps.
--
-- A partial unique index on wallet_transactions is added as a second,
-- independent guarantee (defense in depth beyond the lock): the database
-- itself now refuses a second tip_received row for the same payment intent,
-- rather than relying solely on add_wallet_transaction's existing check-then-
-- insert logic, which is not safe under true concurrency (SELECT then INSERT,
-- with no lock or constraint between them — confirmed by reading its
-- definition in 20260412120000_add_wallet_transaction_tip_idempotency.sql).
--
-- Checked first: zero existing duplicate tip_received wallet_transactions
-- rows today, so this index applies cleanly with no data to reconcile.

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_tip_received_unique
  ON public.wallet_transactions (COALESCE(stripe_payment_intent_id, reference_id))
  WHERE transaction_type = 'tip_received';

COMMENT ON INDEX public.idx_wallet_transactions_tip_received_unique IS
  'At most one tip_received wallet transaction per payment intent, regardless of which column (stripe_payment_intent_id or the legacy reference_id) carries it. Backstops finalize_tip_transaction''s row lock.';

-- Durable, queryable record of finalize failures — previously only a
-- console.error, invisible outside Vercel's function logs. The reconciliation
-- job doesn't need to read this to know what to retry (it rediscovers stuck
-- tips directly from tips/Stripe state), but this is what makes a failure
-- visible to a person at all.
CREATE TABLE IF NOT EXISTS public.tip_finalize_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id TEXT NOT NULL,
  source TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tip_finalize_failures_pi ON public.tip_finalize_failures (payment_intent_id);

ALTER TABLE public.tip_finalize_failures ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tip_finalize_failures IS
  'Every time finalize_tip_transaction (or the call to it) errors, from any caller (webhook, confirm-tip, reconciliation job). Service-role only, zero RLS policies.';

-- RLS is on with zero policies, so PostgREST already denies anon/authenticated
-- by default — these REVOKEs make that explicit and permanent rather than
-- relying on "nobody happened to add a policy".
REVOKE ALL ON public.tip_finalize_failures FROM PUBLIC;
REVOKE ALL ON public.tip_finalize_failures FROM anon;
REVOKE ALL ON public.tip_finalize_failures FROM authenticated;
GRANT SELECT, INSERT ON public.tip_finalize_failures TO service_role;

-- The atomic finalize function itself.
CREATE OR REPLACE FUNCTION public.finalize_tip_transaction(
  p_payment_intent_id TEXT,
  p_creator_id UUID,
  p_tipper_id UUID,
  p_amount NUMERIC,
  p_creator_earnings NUMERIC,
  p_platform_fee NUMERIC,
  p_currency TEXT DEFAULT 'USD',
  p_platform_fee_percent NUMERIC DEFAULT 15,
  p_payment_method_type TEXT DEFAULT NULL,
  p_tip_message TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tips_id UUID;
  v_tips_status TEXT;
  v_creator_tips_id UUID;
  v_platform_revenue_id UUID;
  v_wallet_tx_id UUID;
BEGIN
  -- Lock the tip row first. A concurrent second call for the same PI blocks
  -- here until the first transaction commits or rolls back.
  SELECT id, status INTO v_tips_id, v_tips_status
  FROM tips
  WHERE payment_intent_id = p_payment_intent_id
  FOR UPDATE;

  IF v_tips_id IS NULL THEN
    RAISE EXCEPTION 'finalize_tip_transaction: no tips row for payment_intent_id %', p_payment_intent_id;
  END IF;

  IF v_tips_status = 'completed' THEN
    SELECT wt.id INTO v_wallet_tx_id
    FROM wallet_transactions wt
    WHERE wt.transaction_type = 'tip_received'
      AND (wt.stripe_payment_intent_id = p_payment_intent_id OR wt.reference_id = p_payment_intent_id)
    LIMIT 1;
    RETURN jsonb_build_object(
      'already_completed', true,
      'tips_id', v_tips_id,
      'wallet_transaction_id', v_wallet_tx_id
    );
  END IF;

  UPDATE tips
  SET status = 'completed', completed_at = now()
  WHERE id = v_tips_id;

  UPDATE creator_tips
  SET status = 'completed'
  WHERE stripe_payment_intent_id = p_payment_intent_id
  RETURNING id INTO v_creator_tips_id;

  v_platform_revenue_id := insert_platform_revenue(
    p_charge_type => 'tip',
    p_gross_amount => ROUND(p_amount * 100)::INTEGER,
    p_platform_fee_amount => ROUND(p_platform_fee * 100)::INTEGER,
    p_platform_fee_percent => p_platform_fee_percent,
    p_creator_payout_amount => ROUND(p_creator_earnings * 100)::INTEGER,
    p_stripe_payment_intent_id => p_payment_intent_id,
    p_reference_id => p_payment_intent_id,
    p_creator_user_id => p_creator_id,
    p_currency => p_currency,
    p_payment_method_type => p_payment_method_type
  );

  v_wallet_tx_id := add_wallet_transaction(
    user_uuid => p_creator_id,
    transaction_type => 'tip_received',
    amount => p_creator_earnings,
    description => CASE WHEN p_tip_message IS NOT NULL AND p_tip_message <> ''
                     THEN 'Tip received: ' || p_tip_message
                     ELSE 'Tip received' END,
    reference_id => p_payment_intent_id,
    metadata => jsonb_build_object(
      'tipper_id', p_tipper_id,
      'original_amount', p_amount,
      'creator_earnings', p_creator_earnings,
      'platform_fee', p_platform_fee
    ),
    p_currency => p_currency,
    p_stripe_payment_intent_id => p_payment_intent_id
  );

  RETURN jsonb_build_object(
    'already_completed', false,
    'tips_id', v_tips_id,
    'creator_tips_id', v_creator_tips_id,
    'platform_revenue_id', v_platform_revenue_id,
    'wallet_transaction_id', v_wallet_tx_id
  );
END;
$$;

COMMENT ON FUNCTION public.finalize_tip_transaction IS
  'Atomically marks tips/creator_tips completed, records platform_revenue, and credits the creator wallet for one payment_intent_id. One transaction: any failure rolls back all of it. Locks the tips row first, so concurrent calls for the same payment intent serialize and the second is a no-op once the first commits. Called by finalizeTipFromSucceededPaymentIntentInner (shared by both Stripe webhooks, confirm-tip, and the reconciliation job) — never call directly without also updating that caller.';

-- SECURITY DEFINER + credits money: must NOT be callable by anon or
-- authenticated via the API (unlike add_wallet_transaction/insert_platform_revenue,
-- which this project grants to `authenticated` too — that pattern is not safe to
-- copy for a function that single-handedly completes a payment). PostgREST
-- would otherwise let any logged-in user ring up arbitrary wallet credits by
-- calling this directly with a made-up payment_intent_id and amount.
REVOKE ALL ON FUNCTION public.finalize_tip_transaction(TEXT, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_tip_transaction(TEXT, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_tip_transaction(TEXT, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_tip_transaction(TEXT, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) TO service_role;
