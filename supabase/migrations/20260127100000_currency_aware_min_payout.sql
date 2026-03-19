-- Currency-aware minimum payout (WEB_TEAM_PAYOUT_MINIMUM_AND_FEE_TRANSPARENCY.md).
-- Replaces fixed $50: Wise-routed currencies → $30, others → $20.
-- get_payout_eligibility now accepts optional p_bank_currency so API/RPC stay in sync.

-- Drop the old single-argument version so the new (creator_id, bank_currency) version is used.
-- Callers that only pass creator_id get p_bank_currency = NULL → min $20.
DROP FUNCTION IF EXISTS get_payout_eligibility(UUID);

CREATE OR REPLACE FUNCTION get_payout_eligibility(
  p_creator_id UUID,
  p_bank_currency TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  available_balance DECIMAL(10,2);
  pending_requests DECIMAL(10,2);
  min_payout DECIMAL(10,2);
  cur TEXT;
  result JSON;
  wise_currencies TEXT[] := ARRAY[
    'NGN','GHS','KES','ZAR','TZS','UGX','EGP','RWF','XOF','XAF',
    'INR','IDR','MYR','PHP','THB','VND','BDT','PKR','LKR','NPR','CNY','KRW',
    'BRL','MXN','ARS','CLP','COP','CRC','UYU',
    'TRY','ILS','MAD','UAH','GEL'
  ];
BEGIN
  cur := UPPER(TRIM(COALESCE(p_bank_currency, '')));
  IF cur = '' OR NOT (cur = ANY(wise_currencies)) THEN
    min_payout := 20.00;
  ELSE
    min_payout := 30.00;
  END IF;

  SELECT COALESCE(cr.available_balance, 0) INTO available_balance
  FROM creator_revenue cr
  WHERE cr.user_id = p_creator_id;

  SELECT COALESCE(SUM(pr.amount), 0) INTO pending_requests
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_payout_eligibility(UUID, TEXT) IS 'Currency-aware: $30 for Wise currencies (NGN, GHS, KES, etc.), $20 otherwise. Pass bank currency from creator_bank_accounts.';

-- create_payout_request_for_user: use eligibility min_payout and pass currency to get_payout_eligibility
CREATE OR REPLACE FUNCTION create_payout_request_for_user(
  p_creator_id UUID,
  p_amount DECIMAL(10,2),
  p_currency VARCHAR(3) DEFAULT 'USD'
) RETURNS JSON AS $$
DECLARE
  eligibility JSON;
  request_id UUID;
  min_payout DECIMAL(10,2);
BEGIN
  IF p_creator_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Creator ID required');
  END IF;

  eligibility := get_payout_eligibility(p_creator_id, p_currency);
  min_payout := (eligibility->>'min_payout')::DECIMAL;

  IF p_amount < COALESCE(min_payout, 20.00) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Minimum withdrawal amount is $' || COALESCE(min_payout::TEXT, '20') || '.00 for ' || COALESCE(p_currency, 'your account'),
      'eligibility', eligibility
    );
  END IF;

  IF NOT (eligibility->>'can_request_payout')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance or pending requests',
      'eligibility', eligibility
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM creator_bank_accounts
    WHERE user_id = p_creator_id AND is_verified = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No verified bank account found');
  END IF;

  INSERT INTO payout_requests (creator_id, amount, currency)
  VALUES (p_creator_id, p_amount, p_currency)
  RETURNING id INTO request_id;

  RETURN json_build_object(
    'success', true,
    'request_id', request_id,
    'message', 'Payout request created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
