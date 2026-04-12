-- Payout eligibility must match money users can withdraw (user_wallets), not only creator_revenue.
-- When add_wallet_transaction failed, record_revenue_transaction never ran — creator_revenue stayed 0
-- while USD wallet still held balance. Restore 2-arg (creator, bank_currency) + Wise min_payout logic.

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
  min_payout NUMERIC(10, 2);
  cur TEXT;
  result JSON;
  wise_currencies TEXT[] := ARRAY[
    'NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'EGP', 'RWF', 'XOF', 'XAF',
    'INR', 'IDR', 'MYR', 'PHP', 'THB', 'VND', 'BDT', 'PKR', 'LKR', 'NPR', 'CNY', 'KRW',
    'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'CRC', 'UYU',
    'TRY', 'ILS', 'MAD', 'UAH', 'GEL'
  ];
BEGIN
  cur := UPPER(TRIM(COALESCE(p_bank_currency, '')));
  IF cur = '' OR NOT (cur = ANY (wise_currencies)) THEN
    min_payout := 20.00;
  ELSE
    min_payout := 30.00;
  END IF;

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
  'Withdrawable balance: GREATEST(USD user_wallets.balance, creator_revenue.available_balance). Currency-aware min payout.';

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

  IF fn IS NULL THEN
    RAISE EXCEPTION 'get_payout_eligibility(UUID, TEXT) not found after CREATE';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
END;
$grant$;
