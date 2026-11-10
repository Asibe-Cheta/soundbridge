-- Rollback for supabase/migrations/20261110130000_payout_requests_beneficiary_snapshot.sql
-- Safe at any time — drops 4 nullable columns, no data elsewhere depends on them.
ALTER TABLE public.payout_requests
  DROP COLUMN IF EXISTS beneficiary_name,
  DROP COLUMN IF EXISTS bank_name_snapshot,
  DROP COLUMN IF EXISTS account_last4_snapshot,
  DROP COLUMN IF EXISTS bank_currency_snapshot;
