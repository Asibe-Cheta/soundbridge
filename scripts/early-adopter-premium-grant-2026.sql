-- =============================================================================
-- Early adopter + 3 months Premium (profiles) — verify & apply
-- =============================================================================
-- Run in Supabase SQL Editor (preview sections first).
-- Cohort: emails in public.waitlist_premium_3mo_2026 (same as launch campaign).
-- Adjust dates if your promo window differs.
--
-- Prerequisites:
--   - Table public.waitlist_premium_3mo_2026 exists (see waitlist-premium-2026-profile-update.sql)
--   - Column profiles.early_adopter exists (migration 20260329120000_profiles_early_adopter.sql)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) PREVIEW: matched users with current tier / badge flag
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  p.id AS profile_id,
  p.subscription_tier,
  p.subscription_status,
  p.subscription_period_end,
  p.early_adopter
FROM public.waitlist_premium_3mo_2026 c
INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
INNER JOIN public.profiles p ON p.id = u.id
ORDER BY lower(u.email);

-- -----------------------------------------------------------------------------
-- 2) PREVIEW: campaign emails with no Supabase user yet
-- -----------------------------------------------------------------------------
SELECT lower(trim(c.email)) AS email
FROM public.waitlist_premium_3mo_2026 c
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(trim(c.email))
)
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- 3) APPLY: Premium for 3 months + early_adopter = true (same logic as step-2d)
--     Extend end date from "today" if you prefer a rolling window:
--     e.g. subscription_period_end = now() + interval '3 months'
-- -----------------------------------------------------------------------------
/*
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
  subscription_start_date   = COALESCE(p.subscription_start_date, now()),
  subscription_period_end   = '2026-07-01T00:00:00+00'::timestamptz,
  subscription_renewal_date   = '2026-07-01T00:00:00+00'::timestamptz,
  early_adopter             = TRUE,
  updated_at                = now()
FROM latest l
WHERE p.id = l.profile_id
  AND (
    p.subscription_tier IS DISTINCT FROM 'premium'
    OR COALESCE(p.early_adopter, FALSE) = FALSE
  );
*/

-- -----------------------------------------------------------------------------
-- 4) Single-account fix (e.g. lagcitykeys): set email below, preview, then apply
-- -----------------------------------------------------------------------------
-- Preview:
/*
SELECT p.id, u.email, p.subscription_tier, p.subscription_period_end, p.early_adopter
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('REPLACE_WITH_EMAIL@example.com');
*/

-- Apply:
/*
UPDATE public.profiles p
SET
  subscription_tier       = 'premium',
  subscription_status     = 'active',
  subscription_start_date = COALESCE(p.subscription_start_date, now()),
  subscription_period_end = GREATEST(COALESCE(p.subscription_period_end, now()), now() + interval '3 months'),
  subscription_renewal_date = GREATEST(COALESCE(p.subscription_renewal_date, now()), now() + interval '3 months'),
  early_adopter           = TRUE,
  updated_at              = now()
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = lower('REPLACE_WITH_EMAIL@example.com');
*/
