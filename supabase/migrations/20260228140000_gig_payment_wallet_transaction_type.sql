-- WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.MD: allow gig_payment and gig_refund in wallet_transactions
-- so gig completion can record instant wallet credit with a distinct transaction type.

DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'wallet_transactions'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%transaction_type%'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS %I', conname);
  END IF;
END $$;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'deposit', 'withdrawal', 'tip_received', 'tip_sent', 'payout', 'refund',
    'gig_payment', 'gig_refund', 'content_sale'
  ));

COMMENT ON COLUMN wallet_transactions.transaction_type IS 'gig_payment = instant wallet credit on gig complete; gig_refund = gig refund';
