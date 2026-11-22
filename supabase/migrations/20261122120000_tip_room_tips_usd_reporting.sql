-- USD reporting for Tip Room tips, so cross-currency rollups are possible
-- on the admin dashboard. amount/currency remain the source of truth for
-- what was actually charged (GBP only, today) -- these are read-only
-- reporting columns, never used to re-derive what the creator is owed.
--
-- Note: tip_room_tips.stripe_payment_intent_id and its unique index
-- (tip_room_tips_stripe_pi_uidx) already exist as of migration
-- 20260622130000_tip_room_tips.sql -- confirmed live, not re-added here.
--
-- Full snapshot of tip_room_tips before altering, in case this needs to be
-- rolled back -- see scripts/rollback-tip-room-tips-usd-reporting.sql.
CREATE TABLE IF NOT EXISTS public.tip_room_tips_pre_usd_reporting_backup_20261122 AS
SELECT * FROM public.tip_room_tips;

ALTER TABLE public.tip_room_tips_pre_usd_reporting_backup_20261122 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tip_room_tips_pre_usd_reporting_backup_20261122 FROM PUBLIC;
REVOKE ALL ON public.tip_room_tips_pre_usd_reporting_backup_20261122 FROM anon;
REVOKE ALL ON public.tip_room_tips_pre_usd_reporting_backup_20261122 FROM authenticated;
GRANT SELECT ON public.tip_room_tips_pre_usd_reporting_backup_20261122 TO service_role;

ALTER TABLE public.tip_room_tips
  ADD COLUMN IF NOT EXISTS amount_usd_cents INTEGER,
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS fx_rate_source TEXT,
  ADD COLUMN IF NOT EXISTS fx_rate_time TIMESTAMPTZ;

COMMENT ON COLUMN public.tip_room_tips.amount_usd_cents IS
  'Reporting only. amount/currency remain the source of truth for the actual charge. Null when no fx rate was available at insert time -- never blocks the tip itself.';

-- Daily USD exchange rate snapshot, refreshed by a scheduled job (see
-- app/api/cron/refresh-fx-rates/route.ts). One row per (currency, day).
-- Reporting-only -- nothing that charges money reads this table.
CREATE TABLE IF NOT EXISTS public.fx_rates_daily (
  currency     TEXT NOT NULL,
  as_of_date   DATE NOT NULL,
  rate_to_usd  NUMERIC NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (currency, as_of_date)
);

ALTER TABLE public.fx_rates_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fx_rates_daily FROM PUBLIC;
REVOKE ALL ON public.fx_rates_daily FROM anon;
REVOKE ALL ON public.fx_rates_daily FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fx_rates_daily TO service_role;

COMMENT ON TABLE public.fx_rates_daily IS
  'Daily USD exchange rate snapshot per currency, for reporting-only USD conversions (e.g. tip_room_tips.amount_usd_cents). Not used for anything that charges money.';
