-- EMERGENCY, Stage 0 of the money-path RLS audit. Same bug class as
-- profiles.role/is_admin: every policy below only ever checked row
-- ownership (auth.uid() = user_id), never which column, so any logged-in
-- user could write directly to these columns via the normal authenticated
-- client. Traced and confirmed: a user could set their own user_wallets
-- balance, mark their own bank account verified, and self-insert a
-- "completed" wallet credit or tip -- then /api/payouts/create (which reads
-- all of this with the user's own client, not service role) would act on
-- it. That route-level trust is Stage 1's job; this migration closes the
-- database-level holes feeding it.
--
-- Every write site this broke has already been converted to use the
-- service role in this same change: app/api/wallet/withdraw/route.ts,
-- app/api/revenue/request-payout/route.ts, app/api/payments/create-tip/route.ts.
-- See the commit for the full list and what was checked.

-- =============================================================================
-- 1) user_wallets -- drop the user UPDATE policy entirely; writes service-role only.
--    (ensure_creator_bank_accounts_table.sql-style setup scripts for this app's
--    wallet tables grant broadly to `authenticated`, same pattern found on
--    creator_bank_accounts below -- revoke that too, not just the RLS policy.)
-- =============================================================================
DROP POLICY IF EXISTS "Users can update their own wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.user_wallets;

REVOKE INSERT, UPDATE, DELETE ON public.user_wallets FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_wallets FROM anon;
GRANT SELECT ON public.user_wallets TO authenticated;

-- =============================================================================
-- 2) creator_bank_accounts -- the table-level GRANT INSERT/UPDATE/DELETE to
--    `authenticated` from ensure_creator_bank_accounts_table.sql is what
--    actually allowed self-writing is_verified etc; a bare column REVOKE
--    would have done nothing while that blanket grant still existed, so
--    this revokes the table-level grant first, then re-grants only the
--    columns a user legitimately edits about their own bank account.
-- =============================================================================
REVOKE UPDATE, INSERT ON public.creator_bank_accounts FROM authenticated;
REVOKE UPDATE, INSERT ON public.creator_bank_accounts FROM anon;

GRANT UPDATE (
  account_holder_name,
  bank_name,
  account_number_encrypted,
  routing_number_encrypted,
  account_type,
  currency,
  is_active,
  updated_at
) ON public.creator_bank_accounts TO authenticated;

GRANT INSERT (
  user_id,
  account_holder_name,
  bank_name,
  account_number_encrypted,
  routing_number_encrypted,
  account_type,
  currency,
  is_active
) ON public.creator_bank_accounts TO authenticated;

-- Explicitly NOT grantable to authenticated: is_verified, verification_status,
-- verification_attempts, verified_at, stripe_account_id, stripe_bank_token,
-- stripe_account_status, account_last4 -- these default (false/'pending'/0/
-- null) on insert and are otherwise service-role only. This is a superset of
-- the 3 columns named in the task (is_verified, verification_status,
-- stripe_account_id) -- verification_attempts/verified_at/stripe_bank_token/
-- stripe_account_status/account_last4 are the same risk class, found while
-- enumerating the table's full column history, so included here too.

-- =============================================================================
-- 3) wallet_transactions -- remove user INSERT entirely (service role only).
--    A legitimate "pending" credit/debit must now be written by a server
--    route using the service client.
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.wallet_transactions;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon;
GRANT SELECT ON public.wallet_transactions TO authenticated;

-- =============================================================================
-- 4) creator_tips -- remove user INSERT entirely, same reasoning: every
--    legitimate insert site has already been moved to the service role in
--    this change, so there is no remaining legitimate client-side writer.
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert tips they send" ON public.creator_tips;
DROP POLICY IF EXISTS "Users can insert tips they send legacy" ON public.creator_tips;
REVOKE INSERT, UPDATE, DELETE ON public.creator_tips FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.creator_tips FROM anon;
GRANT SELECT ON public.creator_tips TO authenticated;

-- =============================================================================
-- 5) tips -- not named in the task but found with the identical bug while
--    tracing creator_tips' insert sites (supabase/migrations/20260117000006_tips_table.sql:
--    FOR INSERT WITH CHECK (auth.uid() = sender_id), no column restriction).
--    Its one legitimate insert site (app/api/payments/create-tip/route.ts)
--    is also already converted to the service role in this change.
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert tips they send" ON public.tips;
REVOKE INSERT, UPDATE, DELETE ON public.tips FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tips FROM anon;
GRANT SELECT ON public.tips TO authenticated;
