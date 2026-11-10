-- Records the beneficiary name and bank snapshot on a payout_requests row at
-- the moment a transfer is actually submitted, rather than relying on a live
-- join to creator_bank_accounts (which can change after the fact, and
-- currently cannot be reconstructed for any historic payout — a limitation
-- flagged in this session's payout reconciliation report).
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS beneficiary_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS account_last4_snapshot VARCHAR(4),
  ADD COLUMN IF NOT EXISTS bank_currency_snapshot VARCHAR(3);

COMMENT ON COLUMN public.payout_requests.beneficiary_name IS
  'creator_bank_accounts.account_holder_name as it was at the moment this payout was submitted — a snapshot, not a live reference.';
COMMENT ON COLUMN public.payout_requests.bank_name_snapshot IS
  'creator_bank_accounts.bank_name snapshot at submission time.';
COMMENT ON COLUMN public.payout_requests.account_last4_snapshot IS
  'creator_bank_accounts.account_last4 snapshot at submission time.';
COMMENT ON COLUMN public.payout_requests.bank_currency_snapshot IS
  'creator_bank_accounts.currency snapshot at submission time.';
