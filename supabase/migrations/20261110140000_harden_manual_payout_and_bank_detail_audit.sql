-- Two things for the manual (non-Fincra-currency) payout screen:
--
-- 1. Hardens complete_payout_request_balance_deduction (already live, already
--    used for the 2 kachi191 manual payouts investigated this session) with
--    a row lock on the payout_requests row, so two admins (or one admin
--    double-clicking) marking the SAME request paid at the same instant
--    serialize instead of racing. CREATE OR REPLACE is idempotent against
--    the function already in 20260516140000. A partial unique index on
--    wallet_transactions is added as independent defense-in-depth, same
--    reasoning as the tip and gig fixes — add_wallet_transaction's own
--    idempotency check is a SELECT-then-INSERT, not safe against true
--    concurrency on its own.
--
-- 2. A new admin_bank_detail_views audit table. No existing route in this
--    codebase ever shows an admin a creator's FULL (unmasked) bank account
--    number — admin/payouts/route.ts only ever decrypts it server-side to
--    feed the Fincra/Stripe API directly, then shows the admin a masked
--    version. For a manual (non-Fincra) payout, the admin genuinely needs
--    the real number to send the transfer themselves, so a new reveal
--    endpoint is needed — every call to it writes a row here first.

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_payout_unique
  ON public.wallet_transactions (reference_id)
  WHERE transaction_type = 'payout';

COMMENT ON INDEX public.idx_wallet_transactions_payout_unique IS
  'At most one payout debit per payout_requests.id (reference_id = payout_request:<uuid>). Backstops complete_payout_request_balance_deduction''s lock the same way the tip/gig partial unique indexes do.';

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
  v_locked_id UUID;
BEGIN
  IF p_creator_id IS NULL OR p_payout_request_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'creator_id and payout_request_id are required');
  END IF;

  -- Lock the specific payout_requests row first — two calls for the same
  -- request now serialize; the second sees v_existing_tx already set below
  -- and returns the already_deducted branch instead of racing.
  SELECT id INTO v_locked_id FROM payout_requests WHERE id = p_payout_request_id FOR UPDATE;
  IF v_locked_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'payout_request_not_found');
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
  'Idempotent, now row-locked wallet debit for payout_requests completion; reference payout_request:<id>.';

CREATE TABLE IF NOT EXISTS public.admin_bank_detail_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  payout_request_id UUID,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_bank_detail_views_creator ON public.admin_bank_detail_views (creator_id);
CREATE INDEX IF NOT EXISTS idx_admin_bank_detail_views_admin ON public.admin_bank_detail_views (admin_user_id);

ALTER TABLE public.admin_bank_detail_views ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_bank_detail_views IS
  'Every time an admin views a creator''s full (unmasked) decrypted bank details, for the manual (non-Fincra) payout screen. Service-role only, zero RLS policies.';

REVOKE ALL ON public.admin_bank_detail_views FROM PUBLIC;
REVOKE ALL ON public.admin_bank_detail_views FROM anon;
REVOKE ALL ON public.admin_bank_detail_views FROM authenticated;
GRANT SELECT, INSERT ON public.admin_bank_detail_views TO service_role;
