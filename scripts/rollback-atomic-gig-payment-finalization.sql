-- Rollback for supabase/migrations/20261110120000_atomic_gig_payment_finalization.sql
--
-- WARNING: only run this AFTER redeploying the pre-atomic version of the 4
-- caller files (complete, confirm-delivery, admin/release-escrow,
-- cron/auto-release), never before — otherwise those callers will error
-- trying to call a function that no longer exists.
DROP FUNCTION IF EXISTS public.finalize_gig_payment(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, INTEGER, NUMERIC, TEXT);
DROP TABLE IF EXISTS public.gig_finalize_failures;
DROP INDEX IF EXISTS public.idx_wallet_transactions_gig_payment_unique;
