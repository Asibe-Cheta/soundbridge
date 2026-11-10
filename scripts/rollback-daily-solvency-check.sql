-- Rollback for supabase/migrations/20261110150000_daily_solvency_check.sql
-- Safe at any time — drops 2 new, standalone tables nothing else depends on.
DROP TABLE IF EXISTS public.solvency_check_log;
DROP TABLE IF EXISTS public.fincra_funded_balance;
