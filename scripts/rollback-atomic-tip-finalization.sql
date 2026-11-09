-- Rollback for 20261108140000_atomic_tip_finalization.sql.
--
-- DO NOT RUN THIS BEFORE THE OLD CODE IS BACK IN PRODUCTION. Deploy order for
-- a rollback is the reverse of the forward deploy: revert/redeploy the code
-- that no longer calls finalize_tip_transaction FIRST, confirm it's live,
-- THEN run this script. Running this first would break every tip finalization
-- (webhook, confirm-tip, reconciliation job) between the DROP and the code
-- redeploy, since they'd be calling a function that no longer exists.
--
-- This only removes what the forward migration added. It does not touch any
-- tips/creator_tips/wallet_transactions/platform_revenue data, and does not
-- un-complete any tip that finalize_tip_transaction already completed.

DROP FUNCTION IF EXISTS public.finalize_tip_transaction(TEXT, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT);

DROP TABLE IF EXISTS public.tip_finalize_failures;

DROP INDEX IF EXISTS public.idx_wallet_transactions_tip_received_unique;
