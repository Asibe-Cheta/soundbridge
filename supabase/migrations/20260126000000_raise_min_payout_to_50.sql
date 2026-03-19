-- Raise minimum payout from $25 to $50.
-- Wise transfer fees are ~$7 flat; at $25 minimum, fees would be ~28% of the payout.
-- At $50 minimum, fees are ~14%, leaving a more reasonable amount for the creator.

CREATE OR REPLACE FUNCTION get_payout_eligibility(
  p_creator_id UUID
) RETURNS JSON AS $$
DECLARE
  available_balance DECIMAL(10,2);
  pending_requests DECIMAL(10,2);
  min_payout DECIMAL(10,2) := 50.00;
  result JSON;
BEGIN
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
