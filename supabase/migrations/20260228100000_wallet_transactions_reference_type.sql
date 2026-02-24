-- Add reference_type to wallet_transactions for project deep links (w.md §7.1)
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS reference_type TEXT;

COMMENT ON COLUMN wallet_transactions.reference_type IS 'e.g. opportunity_project for gig/opportunity completion';
