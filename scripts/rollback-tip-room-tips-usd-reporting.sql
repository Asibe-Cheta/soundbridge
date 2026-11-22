-- Rollback for supabase/migrations/20261122120000_tip_room_tips_usd_reporting.sql
-- Safe at any time: these are additive, reporting-only columns and a
-- standalone table -- nothing that charges money reads them.

-- Sanity check first: these two counts should match before you drop anything.
SELECT COUNT(*) AS backup_rows FROM public.tip_room_tips_pre_usd_reporting_backup_20261122;
SELECT COUNT(*) AS current_rows FROM public.tip_room_tips;

ALTER TABLE public.tip_room_tips
  DROP COLUMN IF EXISTS amount_usd_cents,
  DROP COLUMN IF EXISTS fx_rate,
  DROP COLUMN IF EXISTS fx_rate_source,
  DROP COLUMN IF EXISTS fx_rate_time;

DROP TABLE IF EXISTS public.fx_rates_daily;
DROP TABLE IF EXISTS public.tip_room_tips_pre_usd_reporting_backup_20261122;
