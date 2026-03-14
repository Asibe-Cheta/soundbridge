-- Bank accounts for ALL authenticated users (not just creators)
-- @see WEB_TEAM_BANK_ACCOUNTS_FOR_ALL.md
-- Any user can receive tips, event payouts, etc. — they must be able to add withdrawal methods.
-- RLS must allow access by ownership only: auth.uid() = user_id. No is_creator check.

-- Drop any policy that might have been created with creator-only restriction (exact names from doc)
DROP POLICY IF EXISTS "Users can manage their bank accounts" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON creator_bank_accounts;

-- Ensure DELETE exists (some migrations only had SELECT/INSERT/UPDATE)
DROP POLICY IF EXISTS "creator_bank_accounts_delete_own" ON creator_bank_accounts;
CREATE POLICY "creator_bank_accounts_delete_own"
ON creator_bank_accounts FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'sub')::uuid = user_id
);

-- Verify: no policy on creator_bank_accounts should reference is_creator or profiles.is_creator.
-- Existing policies (from fix_creator_bank_accounts_rls_payment_methods.sql or similar) should remain:
-- creator_bank_accounts_select_own, creator_bank_accounts_insert_own,
-- creator_bank_accounts_update_own, creator_bank_accounts_delete_own.
