-- =============================================================================
-- Steps 1, 2, 3 — run in Supabase SQL Editor
-- =============================================================================
-- IMPORTANT: Highlight and execute ONE step at a time. Running the whole file runs
--            STEP 3 immediately after the previews (writes to profiles).
-- Prerequisites: waitlist_premium_3mo_2026 populated; profiles.early_adopter exists.
-- Flow: run STEP 1 → review → STEP 2 → review → STEP 3 → re-run STEP 1 to verify.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — PREVIEW: waitlist emails that already have auth + profile (current state)
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
-- STEP 2 — PREVIEW: waitlist emails with NO Supabase user yet (cannot grant until signup)
-- -----------------------------------------------------------------------------
SELECT lower(trim(c.email)) AS email
FROM public.waitlist_premium_3mo_2026 c
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(trim(c.email))
)
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- STEP 3 — APPLY: set Premium + early_adopter for matched users only
-- (Adjust fixed end date below if your promo window differs.)
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
  subscription_tier       = 'premium',
  subscription_status     = 'active',
  subscription_start_date = COALESCE(p.subscription_start_date, now()),
  subscription_period_end = '2026-07-01T00:00:00+00'::timestamptz,
  subscription_renewal_date = '2026-07-01T00:00:00+00'::timestamptz,
  early_adopter           = TRUE,
  updated_at              = now()
FROM latest l
WHERE p.id = l.profile_id
  AND (
    p.subscription_tier IS DISTINCT FROM 'premium'
    OR COALESCE(p.early_adopter, FALSE) = FALSE
  );

-- After STEP 3, run STEP 1 again to confirm subscription_tier / early_adopter updated.