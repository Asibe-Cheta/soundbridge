-- Deduct creator balance when a payout_request is completed (manual or Fincra webhook).
-- Uses user_wallets (primary) via add_wallet_transaction; syncs creator_revenue when present.
-- Idempotent per payout_request_id (reference_id payout_request:<uuid>).

CREATE OR REPLACE FUNCTION public.complete_payout_request_balance_deduction(
  p_creator_id UUID,
  p_amount DECIMAL(10, 2),
  p_payout_request_id UUID,
  p_currency VARCHAR(3) DEFAULT 'USD'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref TEXT;
  v_currency VARCHAR(3);
  v_amount DECIMAL(10, 2);
  v_existing_tx UUID;
  v_wallet_balance DECIMAL(10, 2);
  v_wallet_tx UUID;
  v_cr_balance DECIMAL(10, 2);
  v_cr_deduct DECIMAL(10, 2);
BEGIN
  IF p_creator_id IS NULL OR p_payout_request_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'creator_id and payout_request_id are required');
  END IF;

  v_amount := ROUND(COALESCE(p_amount, 0)::numeric, 2);
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount must be positive');
  END IF;

  v_currency := UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD'));
  v_ref := 'payout_request:' || p_payout_request_id::text;

  SELECT wt.id INTO v_existing_tx
  FROM wallet_transactions wt
  WHERE wt.user_id = p_creator_id
    AND wt.reference_id = v_ref
    AND wt.transaction_type = 'payout'
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    SELECT COALESCE(uw.balance, 0) INTO v_wallet_balance
    FROM user_wallets uw
    WHERE uw.user_id = p_creator_id AND uw.currency = v_currency
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'already_deducted', true,
      'wallet_transaction_id', v_existing_tx,
      'wallet_balance', COALESCE(v_wallet_balance, 0),
      'currency', v_currency
    );
  END IF;

  SELECT COALESCE(uw.balance, 0) INTO v_wallet_balance
  FROM user_wallets uw
  WHERE uw.user_id = p_creator_id AND uw.currency = v_currency
  LIMIT 1;

  IF v_wallet_balance IS NULL THEN
    v_wallet_balance := 0;
  END IF;

  IF v_wallet_balance < v_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_wallet_balance',
      'wallet_balance', v_wallet_balance,
      'required', v_amount,
      'currency', v_currency
    );
  END IF;

  v_wallet_tx := public.add_wallet_transaction(
    p_creator_id,
    'payout',
    -v_amount,
    'Payout withdrawal',
    v_ref,
    jsonb_build_object(
      'payout_request_id', p_payout_request_id,
      'source', 'complete_payout_request_balance_deduction'
    ),
    v_currency,
    NULL
  );

  SELECT COALESCE(cr.available_balance, 0) INTO v_cr_balance
  FROM creator_revenue cr
  WHERE cr.user_id = p_creator_id;

  v_cr_deduct := 0;
  IF v_cr_balance IS NOT NULL AND v_cr_balance > 0 THEN
    v_cr_deduct := LEAST(v_cr_balance, v_amount);
    UPDATE creator_revenue
    SET
      available_balance = available_balance - v_cr_deduct,
      total_paid_out = COALESCE(total_paid_out, 0) + v_cr_deduct,
      last_payout_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_creator_id;
  END IF;

  SELECT COALESCE(uw.balance, 0) INTO v_wallet_balance
  FROM user_wallets uw
  WHERE uw.user_id = p_creator_id AND uw.currency = v_currency
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'already_deducted', false,
    'wallet_transaction_id', v_wallet_tx,
    'wallet_balance', COALESCE(v_wallet_balance, 0),
    'creator_revenue_deducted', COALESCE(v_cr_deduct, 0),
    'currency', v_currency
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.complete_payout_request_balance_deduction(UUID, DECIMAL, UUID, VARCHAR) IS
  'Idempotent wallet debit for payout_requests completion; reference payout_request:<id>.';

DO $grant$
DECLARE
  fn regprocedure;
BEGIN
  SELECT p.oid::regprocedure INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'complete_payout_request_balance_deduction';

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END IF;
END;
$grant$;
