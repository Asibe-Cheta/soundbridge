-- WEB_TEAM_STRIPE_AMOUNTS_FIXED.MD: Store wallet amounts in major units (pounds/dollars), not Stripe minor units (pence/cents)

-- profiles.wallet_balance: use NUMERIC for decimal amounts (e.g. 8.80)
ALTER TABLE profiles
  ALTER COLUMN wallet_balance TYPE NUMERIC(12,2) USING (COALESCE(wallet_balance, 0)::NUMERIC(12,2));

-- increment_wallet_balance: accept NUMERIC so we can pass major units (8.80 not 880)
CREATE OR REPLACE FUNCTION increment_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION increment_wallet_balance(UUID, NUMERIC) IS 'Atomically add amount (major units) to profiles.wallet_balance. Stripe amounts must be divided by 100 before calling.';

-- increment_user_wallet_balance: for user_wallets table (one row per user per currency)
CREATE OR REPLACE FUNCTION increment_user_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE user_wallets
  SET balance = COALESCE(balance, 0) + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION increment_user_wallet_balance(UUID, NUMERIC) IS 'Atomically add amount (major units) to user_wallets.balance. Stripe amounts must be divided by 100 before calling.';

GRANT EXECUTE ON FUNCTION increment_wallet_balance(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION increment_user_wallet_balance(UUID, NUMERIC) TO service_role;
