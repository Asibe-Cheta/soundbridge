-- =============================================================================
-- Apply early adopter cohort (prod)
-- Prerequisite: 20260601120000_early_adopter_conversion.sql already applied.
--
-- ORDER:
--   1) Run THIS file — STEP 0 only first (creates waitlist table).
--   2) Run scripts/waitlist-premium-2026-seed-emails.sql (loads ~397 emails).
--   3) Run THIS file again — sections A through E (or A→B→C→D→E).
-- =============================================================================

-- STEP 0 — Create waitlist staging table (run once; safe to re-run)
CREATE TABLE IF NOT EXISTS public.waitlist_premium_3mo_2026 (
  email text NOT NULL PRIMARY KEY
);

COMMENT ON TABLE public.waitlist_premium_3mo_2026 IS
  'Emails for 3-month Premium promo (Apr–Jul 2026). Match auth.users on signup.';

-- Optional: lock down client access (service role / SQL editor still works)
ALTER TABLE public.waitlist_premium_3mo_2026 ENABLE ROW LEVEL SECURITY;

-- >>> STOP HERE until seed is loaded. Then run:
-- >>> scripts/waitlist-premium-2026-seed-emails.sql
-- >>> (waitlist_email_count should be ~397 before continuing below)

-- A) Diagnostics
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'waitlist_premium_3mo_2026'
) AS waitlist_table_exists;

SELECT COUNT(*) AS waitlist_email_count
FROM public.waitlist_premium_3mo_2026;

SELECT COUNT(*) AS matched_auth_profiles
FROM (
  SELECT DISTINCT ON (lower(trim(u.email))) p.id
  FROM public.waitlist_premium_3mo_2026 c
  INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
  INNER JOIN public.profiles p ON p.id = u.id
  ORDER BY lower(trim(u.email)), u.created_at DESC NULLS LAST
) x;

-- B) PREVIEW — first 50 matched users
SELECT
  u.email,
  p.id AS profile_id,
  p.subscription_tier,
  p.early_adopter,
  p.subscription_period_end
FROM public.waitlist_premium_3mo_2026 c
INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
INNER JOIN public.profiles p ON p.id = u.id
ORDER BY lower(u.email)
LIMIT 50;

-- C) APPLY — Premium grant + early_adopter (promo ends 1 Jul 2026 UTC)
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
  subscription_renewal_date = '2026-07-01T00:00:00+00'::timestamptz,
  early_adopter             = true
FROM latest l
WHERE p.id = l.profile_id;

-- D) Conversion tracking for already-expired free-tier early adopters
INSERT INTO public.early_adopter_conversion (user_id, access_expired_at)
SELECT p.id, p.subscription_period_end
FROM public.profiles p
WHERE p.early_adopter = true
  AND lower(COALESCE(p.subscription_tier::text, 'free')) = 'free'
  AND p.subscription_period_end IS NOT NULL
  AND p.subscription_period_end < now()
ON CONFLICT (user_id) DO NOTHING;

-- E) VERIFY
SELECT
  COUNT(*) FILTER (WHERE early_adopter) AS early_adopters,
  COUNT(*) FILTER (WHERE early_adopter AND subscription_tier = 'premium') AS premium_granted,
  COUNT(*) FILTER (WHERE early_adopter AND subscription_period_end IS NOT NULL) AS with_end_date,
  COUNT(*) FILTER (WHERE early_adopter AND subscription_period_end < now()) AS already_expired,
  (SELECT COUNT(*) FROM public.early_adopter_conversion) AS conversion_rows
FROM public.profiles;
