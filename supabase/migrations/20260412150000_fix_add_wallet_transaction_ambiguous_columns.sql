-- Fix 42702: column reference "transaction_type" is ambiguous (PL/pgSQL param vs wallet_transactions columns).
-- Copy param names into locals before INSERT/UPDATE so VALUES(...) is unambiguous.

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
  v_transaction_type VARCHAR(20);
  v_amount DECIMAL(10, 2);
BEGIN
  v_transaction_type := transaction_type;
  v_amount := amount;
  v_description := description;
  v_reference_id := reference_id;
  v_metadata := metadata;
  wallet_currency := UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'USD'));

  IF v_reference_id IS NOT NULL AND length(trim(v_reference_id)) > 0 THEN
    SELECT wt.id INTO transaction_id
    FROM wallet_transactions wt
    WHERE wt.user_id = user_uuid
      AND wt.reference_id = v_reference_id
      AND wt.transaction_type = v_transaction_type
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
      AND wt.transaction_type = v_transaction_type
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
    v_transaction_type,
    v_amount,
    wallet_currency,
    v_description,
    v_reference_id,
    p_stripe_payment_intent_id,
    'completed',
    v_metadata
  )
  RETURNING id INTO transaction_id;

  UPDATE user_wallets
  SET balance = balance + v_amount, updated_at = NOW()
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
    RAISE EXCEPTION 'add_wallet_transaction(8 args) not found after CREATE OR REPLACE';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
END;
$grant$;
