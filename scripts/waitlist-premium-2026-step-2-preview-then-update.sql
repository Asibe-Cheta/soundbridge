-- =============================================================================
-- Step 2 — AFTER running waitlist-premium-2026-seed-emails.sql
-- =============================================================================
-- Run each section in order in Supabase SQL Editor.

-- -----------------------------------------------------------------------------
-- 2a) PREVIEW: how many campaign emails match an existing auth user + profile?
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS matched_profiles
FROM (
  SELECT DISTINCT ON (lower(trim(u.email)))
    p.id
  FROM public.waitlist_premium_3mo_2026 c
  INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
  INNER JOIN public.profiles p ON p.id = u.id
  ORDER BY lower(trim(u.email)), u.created_at DESC NULLS LAST
) x;

-- -----------------------------------------------------------------------------
-- 2b) PREVIEW: campaign emails with NO Supabase account yet (grant RC after signup)
-- -----------------------------------------------------------------------------
SELECT lower(trim(c.email)) AS email
FROM public.waitlist_premium_3mo_2026 c
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(trim(c.email))
)
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- 2c) EXPORT UUIDs → save as uuids.txt → RevenueCat grant script (one UUID per row)
-- -----------------------------------------------------------------------------
-- Copy result to a file for: node scripts/revenuecat-grant-waitlist-premium.js uuids.txt
SELECT l.profile_id::text AS app_user_id
FROM (
  SELECT DISTINCT ON (lower(trim(u.email)))
    p.id AS profile_id
  FROM public.waitlist_premium_3mo_2026 c
  INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
  INNER JOIN public.profiles p ON p.id = u.id
  ORDER BY lower(trim(u.email)), u.created_at DESC NULLS LAST
) l
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- 2d) APPLY Premium on profiles (run when you are ready — same cohort as campaign)
-- -----------------------------------------------------------------------------
WITH latest AS (
  SELECT DISTINCT ON (lower(trim(u.email)))
    p.id AS profile_id
  FROM public.waitlist_premium_3mo_2026 c
  INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
  INNER JOIN public.profiles p ON p.id = u.id
  ORDER BY lower(trim(u.email)), u.created_at DESC NULLS LAST
)
UPDATE public.profiles p
SET
  subscription_tier         = 'premium',
  subscription_status       = 'active',
  subscription_start_date   = '2026-04-01T00:00:00+00'::timestamptz,
  subscription_period_end   = '2026-07-01T00:00:00+00'::timestamptz,
  subscription_renewal_date = '2026-07-01T00:00:00+00'::timestamptz,
  updated_at                = now()
FROM latest l
WHERE p.id = l.profile_id;
