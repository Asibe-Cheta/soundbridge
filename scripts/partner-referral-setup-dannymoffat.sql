-- =============================================================================
-- Partner referral setup — dannymoffat09@gmail.com (prod: aunxdbqukbxyyiusaeqi)
-- =============================================================================
-- What this script does (same bundle as the 4-creator batch / Dan Edmund):
--   1. Ensures profiles.role = 'creator'
--   2. Grants 1 year Premium (NOT permanent — see note below)
--   3. Creates a partners row + referral link, 10% commission (standard rate)
--
-- Reference precedents on prod:
--   Dan Edmund (danedmund)     — permanent Premium (subscription_period_end IS NULL)
--   4-creator batch (2026-xx)  — 1 year Premium, 10% commission
--   This grant follows the 4-creator batch: 1 year Premium, 10% commission.
--
-- Referral tracking:
--   When fans sign up via /join?ref=<code>, the app calls record_referral_signup().
--   That inserts referral_signups (partner_id + referred_user_id) and sets
--   community_entry_creator_id on the new fan's profile.
--
-- Run in Supabase SQL Editor: preview §1 first — it must return exactly 1 row
-- with user_id NOT NULL before uncommenting any APPLY block.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) PREVIEW — resolve account by email (must return exactly 1 row, user_id NOT NULL)
-- -----------------------------------------------------------------------------
SELECT
  u.id AS user_id,
  u.email,
  p.username,
  p.display_name,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.subscription_period_end,
  p.early_adopter,
  pt.id AS existing_partner_id,
  pt.referral_code AS existing_referral_code,
  pt.referral_link AS existing_referral_link
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.partners pt ON pt.user_id = p.id
WHERE lower(u.email) = lower('dannymoffat09@gmail.com');

-- Stop here if user_id is NULL (no account with this email) or if a partners
-- row already exists (existing_partner_id NOT NULL) — re-running §5 would then
-- need the per-user upsert at the bottom instead of the INSERT.

-- -----------------------------------------------------------------------------
-- 2) APPLY — set role = creator (only if not already creator)
-- -----------------------------------------------------------------------------
/*
UPDATE public.profiles p
SET
  role       = 'creator',
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = lower('dannymoffat09@gmail.com')
  AND COALESCE(p.role, 'listener') IS DISTINCT FROM 'creator';
*/

-- -----------------------------------------------------------------------------
-- 3) APPLY — 1 year Premium access
--     (extends from existing period_end if one is already set and in the future)
-- -----------------------------------------------------------------------------
/*
UPDATE public.profiles p
SET
  subscription_tier         = 'premium',
  subscription_status       = 'active',
  subscription_start_date   = COALESCE(p.subscription_start_date, now()),
  subscription_period_end   = GREATEST(
                                COALESCE(p.subscription_period_end, now()),
                                now() + interval '1 year'
                              ),
  subscription_renewal_date = GREATEST(
                                COALESCE(p.subscription_renewal_date, now()),
                                now() + interval '1 year'
                              ),
  updated_at                = now()
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = lower('dannymoffat09@gmail.com');
*/

-- Optional: also record institutional grant (audit trail). Safe to run in addition to §3.
-- Replace <username> with the resolved profiles.username from §1 before running.
/*
SELECT public.grant_institutional_access(
  u.id,
  'partner_' || lower(p.username),
  'premium'
)
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('dannymoffat09@gmail.com');
*/

-- -----------------------------------------------------------------------------
-- 4) APPLY — partner referral link (10% commission, code = lowercase username)
--     Requires profiles.username to already be set (check §1 output first).
-- -----------------------------------------------------------------------------
/*
INSERT INTO public.partners (user_id, referral_code, referral_link, commission_rate)
SELECT
  p.id,
  lower(p.username),
  'https://soundbridge.live/join?ref=' || lower(p.username),
  0.10
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('dannymoffat09@gmail.com')
  AND p.username IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.partners pt WHERE pt.user_id = p.id)
ON CONFLICT (referral_code) DO NOTHING;
*/

-- If a partner row already exists and only needs the code/link fixed, use this
-- per-user upsert instead of §4 (edit the referral code literal if it differs):
/*
UPDATE public.partners pt
SET
  referral_code = lower(p.username),
  referral_link = 'https://soundbridge.live/join?ref=' || lower(p.username)
FROM public.profiles p, auth.users u
WHERE pt.user_id = p.id
  AND p.id = u.id
  AND lower(u.email) = lower('dannymoffat09@gmail.com');
*/

-- -----------------------------------------------------------------------------
-- 5) VERIFY — role, premium, and referral link
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  p.username,
  p.display_name,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.subscription_period_end,
  pt.referral_code,
  pt.referral_link,
  pt.commission_rate,
  pt.total_referrals
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.partners pt ON pt.user_id = p.id
WHERE lower(u.email) = lower('dannymoffat09@gmail.com');
