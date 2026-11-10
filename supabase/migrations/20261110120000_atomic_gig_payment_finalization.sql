-- Atomic gig payment finalization (Urgent Gigs investigation follow-up,
-- mirrors 20261108140000_atomic_tip_finalization.sql).
--
-- Root cause: creditGigPaymentToWallet (src/lib/gig-wallet-credit.ts) hand-rolled
-- its own wallet credit (SELECT balance, compute in JS, separate INSERT +
-- UPDATE) instead of using the already-safe add_wallet_transaction RPC, which
-- already does an atomic `balance = balance + amount` and has its own
-- idempotency check by (user_id, reference_id, transaction_type). Separately,
-- all 4 call sites (complete, confirm-delivery, admin/release-escrow,
-- cron/auto-release) each read a status field, then later write a terminal
-- status, with no row lock between — a classic TOCTOU race, and in
-- confirm-delivery's case the credit happens BEFORE the status write, so a
-- crash in between leaves a paid project still queryable as "not yet paid"
-- by the auto-release cron. Verified via the database that this has never
-- actually fired (zero gig_payment wallet_transactions exist, zero urgent
-- gig posts exist) — this is a preventive fix, not a correction.
--
-- Fix: lock the opportunity_projects row first (SELECT ... FOR UPDATE), so
-- concurrent calls for the same project serialize; the second call sees
-- status = 'completed' already and returns as a no-op. Delegates the actual
-- balance change to add_wallet_transaction (reused, not reimplemented) and
-- records platform_revenue in the same transaction. A partial unique index
-- on wallet_transactions is added as independent defense-in-depth, same
-- reasoning as the tip fix: add_wallet_transaction's own idempotency check
-- is a SELECT-then-INSERT, not safe against true concurrency on its own.
--
-- Scope is deliberately the same as finalize_tip_transaction: this function
-- owns project-status + wallet-credit + platform-revenue only. FX
-- conversion (Stripe rate lookup / currencyService), Stripe capture,
-- opportunity_posts updates, notifications, pushes and emails stay in the
-- calling TypeScript code, exactly as they do for tips — those are I/O or
-- best-effort steps that don't belong inside a SQL transaction.

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_gig_payment_unique
  ON public.wallet_transactions (reference_id)
  WHERE transaction_type = 'gig_payment';

COMMENT ON INDEX public.idx_wallet_transactions_gig_payment_unique IS
  'At most one gig_payment wallet transaction per opportunity_projects.id. Backstops finalize_gig_payment''s row lock the same way idx_wallet_transactions_tip_received_unique backstops finalize_tip_transaction.';

CREATE TABLE IF NOT EXISTS public.gig_finalize_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  source TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gig_finalize_failures_project_id ON public.gig_finalize_failures (project_id);

ALTER TABLE public.gig_finalize_failures ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gig_finalize_failures IS
  'Every time finalize_gig_payment (or the call to it) errors, from any of the 4 call sites. Service-role only, zero RLS policies.';

REVOKE ALL ON public.gig_finalize_failures FROM PUBLIC;
REVOKE ALL ON public.gig_finalize_failures FROM anon;
REVOKE ALL ON public.gig_finalize_failures FROM authenticated;
GRANT SELECT, INSERT ON public.gig_finalize_failures TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_gig_payment(
  p_project_id UUID,
  p_creator_id UUID,
  p_credited_amount NUMERIC,
  p_credited_currency TEXT DEFAULT 'USD',
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_title TEXT DEFAULT 'Gig',
  p_description_prefix TEXT DEFAULT 'Gig payment',
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_gross_amount_minor INTEGER DEFAULT NULL,
  p_platform_fee_minor INTEGER DEFAULT NULL,
  p_platform_fee_percent NUMERIC DEFAULT 15,
  p_payment_method_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_wallet_tx_id UUID;
  v_platform_revenue_id UUID;
  v_new_balance NUMERIC;
BEGIN
  SELECT status INTO v_status
  FROM opportunity_projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'finalize_gig_payment: no opportunity_projects row for id %', p_project_id;
  END IF;

  IF v_status = 'completed' THEN
    SELECT wt.id INTO v_wallet_tx_id
    FROM wallet_transactions wt
    WHERE wt.reference_id = p_project_id::text
      AND wt.transaction_type = 'gig_payment'
    LIMIT 1;
    SELECT uw.balance INTO v_new_balance
    FROM user_wallets uw
    WHERE uw.user_id = p_creator_id AND uw.currency = p_credited_currency;
    RETURN jsonb_build_object(
      'already_completed', true,
      'wallet_transaction_id', v_wallet_tx_id,
      'new_balance', v_new_balance
    );
  END IF;

  UPDATE opportunity_projects
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_project_id;

  v_wallet_tx_id := add_wallet_transaction(
    user_uuid => p_creator_id,
    transaction_type => 'gig_payment',
    amount => p_credited_amount,
    description => p_description_prefix || ' — "' || p_title || '"',
    reference_id => p_project_id::text,
    metadata => p_metadata,
    p_currency => p_credited_currency,
    p_stripe_payment_intent_id => p_stripe_payment_intent_id
  );

  IF p_gross_amount_minor IS NOT NULL THEN
    v_platform_revenue_id := insert_platform_revenue(
      p_charge_type => 'gig_payment',
      p_gross_amount => p_gross_amount_minor,
      p_platform_fee_amount => p_platform_fee_minor,
      p_platform_fee_percent => p_platform_fee_percent,
      p_creator_payout_amount => ROUND(p_credited_amount * 100)::INTEGER,
      p_stripe_payment_intent_id => p_stripe_payment_intent_id,
      p_reference_id => p_project_id::text,
      p_creator_user_id => p_creator_id,
      p_currency => p_credited_currency,
      p_payment_method_type => p_payment_method_type
    );
  END IF;

  SELECT uw.balance INTO v_new_balance
  FROM user_wallets uw
  WHERE uw.user_id = p_creator_id AND uw.currency = p_credited_currency;

  RETURN jsonb_build_object(
    'already_completed', false,
    'wallet_transaction_id', v_wallet_tx_id,
    'platform_revenue_id', v_platform_revenue_id,
    'new_balance', v_new_balance
  );
END;
$$;

COMMENT ON FUNCTION public.finalize_gig_payment IS
  'Atomically marks an opportunity_projects row completed, credits the creator wallet (via add_wallet_transaction, not reimplemented), and records platform_revenue. Locks the project row first, so concurrent calls for the same project serialize and the second is a no-op once the first commits. Replaces creditGigPaymentToWallet''s hand-rolled credit — never call directly without also updating its 4 callers (complete, confirm-delivery, admin/release-escrow, cron/auto-release route.ts files).';

REVOKE ALL ON FUNCTION public.finalize_gig_payment(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, INTEGER, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_gig_payment(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, INTEGER, NUMERIC, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_gig_payment(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, INTEGER, NUMERIC, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_gig_payment(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, INTEGER, NUMERIC, TEXT) TO service_role;
