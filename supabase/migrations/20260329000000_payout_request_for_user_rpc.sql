-- Server-side RPC for creating payout requests when auth.uid() is not set in RPC context
-- (e.g. API route calls with Bearer token). Call only from backend with service role after
-- authenticating the user; pass that user's id as p_creator_id.
CREATE OR REPLACE FUNCTION create_payout_request_for_user(
  p_creator_id UUID,
  p_amount DECIMAL(10,2),
  p_currency VARCHAR(3) DEFAULT 'USD'
) RETURNS JSON AS $$
DECLARE
  eligibility JSON;
  request_id UUID;
BEGIN
  IF p_creator_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Creator ID required');
  END IF;

  IF p_amount < 25.00 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal amount is $25.00');
  END IF;

  eligibility := get_payout_eligibility(p_creator_id);

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
