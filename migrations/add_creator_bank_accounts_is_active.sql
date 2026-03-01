-- Add is_active to creator_bank_accounts for mobile getBankAccount() query
-- Mobile: SELECT * FROM creator_bank_accounts WHERE user_id = :uid AND is_active = true ORDER BY created_at DESC LIMIT 1
-- @see WEB_TEAM_BANK_ACCOUNTS_FOR_ALL_USERS.md §4

ALTER TABLE creator_bank_accounts
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN creator_bank_accounts.is_active IS 'Soft-active flag; mobile filters by is_active = true when loading bank account';
