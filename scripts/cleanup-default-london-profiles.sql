-- Cleans up the confirmed-default 'london' profiles so they stop showing
-- "London" on public profile cards and stop matching London events in the
-- personalized feed's ilike('location', ...) filter. Touches ONLY the
-- confirmed-default cohort (never touched, or onboarding never completed).
-- The ambiguous cohort (onboarding complete, profile touched, still
-- 'london') is deliberately left alone: there is no reliable signal to tell
-- those apart from genuine London users.
--
-- Run this after 20261116110000_add_profiles_location_source.sql and the
-- backfill in scripts/backfill-profiles-location-source.sql, so the
-- location_source = 'default' condition below actually matches.

-- ============================================================
-- STEP 1: READ-ONLY dry run. Review this count before going further.
-- ============================================================
SELECT count(*) AS will_be_cleaned
FROM public.profiles
WHERE location_source = 'default'
  AND location ILIKE 'london';

-- ============================================================
-- STEP 2: reversible backup of exactly the rows about to change.
-- Keep this table until you're confident the cleanup is correct; drop it
-- manually later (it is not dropped by anything automatically).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles_default_london_backup_20261118 AS
SELECT id, location, city, latitude, longitude, country, country_code, location_source, updated_at
FROM public.profiles
WHERE location_source = 'default'
  AND location ILIKE 'london';

-- ============================================================
-- STEP 3: the cleanup itself. Only the backed-up rows are touched
-- (location_source = 'default' guard matches the backup's WHERE exactly).
-- city and latitude/longitude are already NULL for every row in this cohort
-- (confirmed before writing this script), so only location and country
-- actually change here.
-- ============================================================
UPDATE public.profiles
SET location = NULL,
    country = NULL,
    country_code = NULL,
    updated_at = now()
WHERE location_source = 'default'
  AND location ILIKE 'london';

-- ============================================================
-- STEP 4: verify. Should return 0.
-- ============================================================
SELECT count(*) AS still_showing_london_default
FROM public.profiles
WHERE location_source = 'default'
  AND location ILIKE 'london';
