-- Backfill for profiles.location_source on rows that existed before that
-- column did (20261116110000_add_profiles_location_source.sql). Run the
-- SELECT first and read the counts before running any UPDATE below.
--
-- Classification used throughout this project: a profile currently showing
-- location ilike 'london' is treated as a confirmed, never-edited default
-- when EITHER created_at = updated_at (never touched at all) OR
-- onboarding_completed = false (never finished signup). Everything else
-- that still reads 'london' is ambiguous: it could be a genuine London user,
-- or a default that survived an onboarding path which didn't happen to touch
-- location. There is no column today that tells these two apart.

-- ============================================================
-- STEP 1: READ-ONLY. Run this first and review the counts.
-- ============================================================
SELECT
  count(*) FILTER (
    WHERE location ILIKE 'london'
      AND (created_at = updated_at OR onboarding_completed = false)
  ) AS confirmed_default_count,
  count(*) FILTER (
    WHERE location ILIKE 'london'
      AND NOT (created_at = updated_at OR onboarding_completed = false)
  ) AS ambiguous_london_count,
  count(*) FILTER (WHERE location IS NOT NULL AND location NOT ILIKE 'london') AS other_real_location_count,
  count(*) FILTER (WHERE location IS NULL) AS already_null_count,
  count(*) AS total_profiles
FROM public.profiles;

-- ============================================================
-- STEP 2: the only UPDATE this script recommends running now.
-- Marks the confirmed-default cohort 'default'. Touches nothing else.
-- ============================================================
UPDATE public.profiles
SET location_source = 'default'
WHERE location ILIKE 'london'
  AND (created_at = updated_at OR onboarding_completed = false)
  AND location_source IS NULL;

-- The 255-ish ambiguous 'london' rows are deliberately left untouched
-- (location_source stays NULL, i.e. unknown) per the instruction not to
-- guess at them. They will only get classified the next time that profile
-- goes through a real write path (resolveLocationUpdate stamps 'user' or
-- 'geocoded' then).

-- ============================================================
-- OPTIONAL, NOT RECOMMENDED TO RUN YET: the remaining profiles whose
-- location is real, non-default text (not 'london' at all) are very likely
-- genuine user input, just never classified because this column didn't
-- exist when they were written. Uncomment and run this only if you want
-- them marked 'user' retroactively instead of waiting for their next real
-- save to stamp it naturally:
--
-- UPDATE public.profiles
-- SET location_source = 'user'
-- WHERE location IS NOT NULL
--   AND location NOT ILIKE 'london'
--   AND location_source IS NULL;
