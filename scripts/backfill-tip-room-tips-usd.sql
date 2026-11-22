-- Backfills amount_usd_cents/fx_rate/fx_rate_source/fx_rate_time for existing
-- tip_room_tips rows, using the daily rate closest to (at or before) each
-- row's tipped_at date. Safe to re-run: only ever touches rows where
-- amount_usd_cents IS NULL, and any row with no fx_rates_daily history at
-- or before its tipped_at date is simply left null (never guessed).
--
-- Run this AFTER fx_rates_daily has at least one day of real data in it
-- (app/api/cron/refresh-fx-rates has run at least once). Rows older than
-- the oldest fx_rates_daily row will stay null indefinitely unless you
-- manually seed a historical rate for that date.

-- PART A: read-only preview of what would be touched.
SELECT t.id, t.currency, t.amount, t.tipped_at, r.as_of_date, r.rate_to_usd
FROM public.tip_room_tips t
LEFT JOIN LATERAL (
  SELECT as_of_date, rate_to_usd
  FROM public.fx_rates_daily f
  WHERE f.currency = t.currency
    AND f.as_of_date <= t.tipped_at::date
  ORDER BY f.as_of_date DESC
  LIMIT 1
) r ON true
WHERE t.amount_usd_cents IS NULL;

-- PART B: the backfill. Only writes rows where a rate was actually found.
UPDATE public.tip_room_tips t
SET
  amount_usd_cents = ROUND(t.amount * r.rate_to_usd * 100),
  fx_rate = r.rate_to_usd,
  fx_rate_source = 'backfill_daily_rate',
  fx_rate_time = (r.as_of_date::timestamptz)
FROM (
  SELECT t2.id, f.as_of_date, f.rate_to_usd
  FROM public.tip_room_tips t2
  JOIN LATERAL (
    SELECT as_of_date, rate_to_usd
    FROM public.fx_rates_daily f
    WHERE f.currency = t2.currency
      AND f.as_of_date <= t2.tipped_at::date
    ORDER BY f.as_of_date DESC
    LIMIT 1
  ) f ON true
  WHERE t2.amount_usd_cents IS NULL
) r
WHERE t.id = r.id;

-- PART C: verify. Rows still null here either predate all fx_rates_daily
-- history, or are a currency fx_rates_daily has never been refreshed for.
SELECT COUNT(*) AS still_null FROM public.tip_room_tips WHERE amount_usd_cents IS NULL;
