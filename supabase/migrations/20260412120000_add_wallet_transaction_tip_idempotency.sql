-- Wallet credit RPC: idempotent on reference_id or stripe_payment_intent_id; multi-currency wallets.
-- Replaces 6-arg add_wallet_transaction. Existing JS callers keep passing 6 keys (defaults for p_currency / p_stripe_payment_intent_id).
--
-- Drop/revoke uses pg_proc so we do not depend on exact typmod spelling (varchar(255) vs text, etc.).

DO $drop$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'add_wallet_transaction'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END;
$drop$;

CREATE OR REPLACE FUNCTION public.add_wallet_transaction(
  user_uuid UUID,
  transaction_type VARCHAR(20),
  amount DECIMAL(10, 2),
  description TEXT DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  p_currency VARCHAR(3) DEFAULT 'USD',
  p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_id UUID;
  transaction_id UUID;
  wallet_currency VARCHAR(3);
  v_description TEXT;
  v_reference_id VARCHAR(255);
  v_metadata JSONB;
BEGIN
  v_description := description;
  v_reference_id := reference_id;
  v_metadata := metadata;
  wallet_currency := UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD'));

  IF v_reference_id IS NOT NULL AND length(trim(v_reference_id)) > 0 THEN
    SELECT wt.id INTO transaction_id
    FROM wallet_transactions wt
    WHERE wt.user_id = user_uuid
      AND wt.reference_id = v_reference_id
      AND wt.transaction_type = transaction_type
    LIMIT 1;
    IF transaction_id IS NOT NULL THEN
      RETURN transaction_id;
    END IF;
  END IF;

  IF p_stripe_payment_intent_id IS NOT NULL AND length(trim(p_stripe_payment_intent_id)) > 0 THEN
    SELECT wt.id INTO transaction_id
    FROM wallet_transactions wt
    WHERE wt.user_id = user_uuid
      AND wt.stripe_payment_intent_id = p_stripe_payment_intent_id
      AND wt.transaction_type = transaction_type
    LIMIT 1;
    IF transaction_id IS NOT NULL THEN
      RETURN transaction_id;
    END IF;
  END IF;

  SELECT uw.id INTO wallet_id
  FROM user_wallets uw
  WHERE uw.user_id = user_uuid AND uw.currency = wallet_currency;

  IF wallet_id IS NULL THEN
    wallet_id := create_user_wallet(user_uuid, wallet_currency);
  END IF;

  INSERT INTO wallet_transactions (
    wallet_id,
    user_id,
    transaction_type,
    amount,
    currency,
    description,
    reference_id,
    stripe_payment_intent_id,
    status,
    metadata
  )
  VALUES (
    wallet_id,
    user_uuid,
    transaction_type,
    amount,
    wallet_currency,
    v_description,
    v_reference_id,
    p_stripe_payment_intent_id,
    'completed',
    v_metadata
  )
  RETURNING id INTO transaction_id;

  UPDATE user_wallets
  SET balance = balance + amount, updated_at = NOW()
  WHERE id = wallet_id;

  RETURN transaction_id;
END;
$$;

DO $grant$
DECLARE
  fn regprocedure;
BEGIN
  SELECT p.oid::regprocedure INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'add_wallet_transaction'
    AND p.pronargs = 8;

  IF fn IS NULL THEN
    RAISE EXCEPTION 'add_wallet_transaction (8 parameters) not found after CREATE';
  END IF;

  EXECUTE format(
    'COMMENT ON FUNCTION %s IS %L',
    fn,
    'Credits user_wallets; idempotent on reference_id or stripe_payment_intent_id per transaction_type.'
  );
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
END;
$grant$;
