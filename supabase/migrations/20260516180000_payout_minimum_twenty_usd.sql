-- Unified minimum withdrawal: $20 USD for all bank currencies (including NGN/Fincra).

DO $drop$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_payout_eligibility'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END;
$drop$;

CREATE OR REPLACE FUNCTION public.get_payout_eligibility(
  p_creator_id UUID,
  p_bank_currency TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_usd NUMERIC(10, 2);
  cr_avail NUMERIC(10, 2);
  available_balance NUMERIC(10, 2);
  pending_requests NUMERIC(10, 2);
  min_payout NUMERIC(10, 2) := 20.00;
  result JSON;
BEGIN
  SELECT COALESCE(
    (SELECT uw.balance
     FROM user_wallets uw
     WHERE uw.user_id = p_creator_id
       AND UPPER(TRIM(uw.currency)) = 'USD'
     LIMIT 1),
    0
  )
  INTO wallet_usd;

  SELECT COALESCE(
    (SELECT cr.available_balance FROM creator_revenue cr WHERE cr.user_id = p_creator_id),
    0
  )
  INTO cr_avail;

  available_balance := GREATEST(COALESCE(wallet_usd, 0), COALESCE(cr_avail, 0));

  SELECT COALESCE(SUM(pr.amount), 0)
  INTO pending_requests
  FROM payout_requests pr
  WHERE pr.creator_id = p_creator_id
    AND pr.status IN ('pending', 'approved', 'processing');

  result := json_build_object(
    'available_balance', available_balance,
    'pending_requests', pending_requests,
    'min_payout', min_payout,
    'can_request_payout', (available_balance - pending_requests) >= min_payout,
    'withdrawable_amount', GREATEST(0, available_balance - pending_requests)
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_payout_eligibility(UUID, TEXT) IS
  'Withdrawable balance: GREATEST(USD user_wallets.balance, creator_revenue.available_balance). Min payout $20.';

DO $grant$
DECLARE
  fn regprocedure;
BEGIN
  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_payout_eligibility'
    AND p.pronargs = 2;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
  END IF;
END;
$grant$;
