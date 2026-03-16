-- WEB_TEAM_WALLET_CREDIT_WEBHOOK_REUIRED.MD: RPC for atomic wallet balance update from webhooks
-- Use this if your flow credits profiles.wallet_balance (e.g. payment_intent.succeeded handler).
-- If you only use user_wallets table, this RPC is optional; wallet credit can use user_wallets directly.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_wallet_balance(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_wallet_balance(UUID, INTEGER) IS 'Atomically add amount to profiles.wallet_balance; used by payment_intent.succeeded webhook.';
