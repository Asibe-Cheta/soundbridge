-- =============================================================================
-- Flag early adopters on profiles (waitlist signups only) — no user_subscriptions
-- Prereqs: waitlist table + seed (waitlist-premium-2026-seed-emails.sql)
-- =============================================================================

-- Preview
SELECT COUNT(*) AS will_update
FROM (
  SELECT DISTINCT ON (lower(trim(u.email))) p.id
  FROM public.waitlist_premium_3mo_2026 c
  INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE COALESCE(p.early_adopter, false) = false
  ORDER BY lower(trim(u.email)), u.created_at DESC NULLS LAST
) x;

-- APPLY
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
  subscription_period_end   = COALESCE(
    p.subscription_period_end,
    '2026-07-01T00:00:00+00'::timestamptz
  ),
  subscription_renewal_date = COALESCE(
    p.subscription_renewal_date,
    p.subscription_period_end,
    '2026-07-01T00:00:00+00'::timestamptz
  ),
  early_adopter             = true
FROM latest l
WHERE p.id = l.profile_id;

-- Verify
SELECT
  COUNT(*) FILTER (WHERE early_adopter) AS early_adopters,
  COUNT(*) FILTER (WHERE early_adopter AND subscription_tier = 'premium') AS premium_granted,
  COUNT(*) FILTER (WHERE early_adopter AND subscription_period_end IS NOT NULL) AS with_end_date
FROM public.profiles;
