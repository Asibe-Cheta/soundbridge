-- Fix: creator_bank_accounts and wallet_withdrawal_methods is_verified never set to true
-- Existing rows were inserted with is_verified = false and never updated, so Withdrawal screen showed "Pending".
-- @see WEB_TEAM_ACCOUNT_VERIFICATION_STATUS.md

-- creator_bank_accounts: one-time fix for existing rows
UPDATE creator_bank_accounts
SET is_verified = true
WHERE is_verified = false OR is_verified IS NULL;

-- wallet_withdrawal_methods: one-time fix for existing rows (web Withdrawal screen reads from this table)
UPDATE wallet_withdrawal_methods
SET is_verified = true
WHERE is_verified = false OR is_verified IS NULL;
