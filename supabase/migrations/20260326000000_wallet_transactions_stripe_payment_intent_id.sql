-- WEB_TEAM_RECEIPTS_AND_PLATFORM_FEE_FIX.MD: receipt PDF and Stripe lookup
-- Add stripe_payment_intent_id to wallet_transactions so receipts can reference Stripe PI.
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

COMMENT ON COLUMN wallet_transactions.stripe_payment_intent_id IS 'Stripe Payment Intent ID for receipt and support lookup';
