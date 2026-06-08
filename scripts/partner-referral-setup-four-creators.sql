-- =============================================================================
-- Partner referral setup — 4 community creators (prod: aunxdbqukbxyyiusaeqi)
-- =============================================================================
-- Targets (from profile screenshots):
--   @bookmeshade   — Sha_De
--   @gidion1       — Gidion
--   @loveabolade_  — Love Abolade
--   @eba_nessa     — Nessa (Early adopter badge)
--
-- What this script does:
--   1. Ensures each user has profiles.role = 'creator'
--   2. Grants 1 year Premium (unlike Dan Edmund's permanent grant — see note below)
--   3. Creates a partners row + referral link (same pattern as Dan Edmund / danedmund)
--
-- Dan Edmund reference (already on prod):
--   user_id:       55b5bc91-5f6a-4155-9594-2e0237417976
--   referral_code: danedmund
--   link:          https://soundbridge.live/join?ref=danedmund
--   premium:       permanent manual grant (subscription_period_end IS NULL)
--
-- Referral tracking:
--   When fans sign up via /join?ref=<code>, the app calls record_referral_signup().
--   That inserts referral_signups (partner_id + referred_user_id) and sets
--   community_entry_creator_id on the new fan's profile.
--   Names/details live on profiles + auth.users — use the verify queries in §6.
--
-- Run in Supabase SQL Editor: preview each section before uncommenting APPLY blocks.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Shared target list (edit here if usernames or codes change)
-- -----------------------------------------------------------------------------
-- username      = profiles.username (no @)
-- referral_code = lowercase code in ?ref= (stored in partners.referral_code)
-- display_label = human-readable note only

-- -----------------------------------------------------------------------------
-- 1) PREVIEW — resolve accounts (must return exactly 4 rows)
-- -----------------------------------------------------------------------------
WITH targets AS (
  SELECT *
  FROM (VALUES
    ('bookmeshade',   'bookmeshade',   'Sha_De'),
    ('gidion1',       'gidion1',       'Gidion'),
    ('loveabolade_',  'loveabolade_',  'Love Abolade'),
    ('eba_nessa',     'eba_nessa',     'Nessa')
  ) AS t(username, referral_code, display_label)
)
SELECT
  t.display_label,
  t.username,
  t.referral_code,
  p.id AS user_id,
  u.email,
  p.display_name,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.subscription_period_end,
  p.early_adopter,
  pt.id AS existing_partner_id,
  pt.referral_link AS existing_referral_link
FROM targets t
LEFT JOIN public.profiles p ON lower(p.username) = lower(t.username)
LEFT JOIN auth.users u ON u.id = p.id
LEFT JOIN public.partners pt ON pt.user_id = p.id
ORDER BY t.display_label;

-- Stop here if any row has user_id NULL (account not found).

-- -----------------------------------------------------------------------------
-- 2) PREVIEW — Dan Edmund baseline (compare before/after)
-- -----------------------------------------------------------------------------
SELECT
  p.id,
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
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.partners pt ON pt.user_id = p.id
WHERE p.id = '55b5bc91-5f6a-4155-9594-2e0237417976';

-- -----------------------------------------------------------------------------
-- 3) APPLY — set role = creator (only where not already creator)
-- -----------------------------------------------------------------------------
/*
WITH targets AS (
  SELECT username
  FROM (VALUES
    ('bookmeshade'),
    ('gidion1'),
    ('loveabolade_'),
    ('eba_nessa')
  ) AS t(username)
)
UPDATE public.profiles p
SET
  role       = 'creator',
  updated_at = now()
FROM targets t
WHERE lower(p.username) = lower(t.username)
  AND COALESCE(p.role, 'listener') IS DISTINCT FROM 'creator';
*/

-- -----------------------------------------------------------------------------
-- 4) APPLY — 1 year Premium access
--     (Dan has permanent Premium with subscription_period_end = NULL; these expire in 1y)
-- -----------------------------------------------------------------------------
/*
WITH targets AS (
  SELECT username
  FROM (VALUES
    ('bookmeshade'),
    ('gidion1'),
    ('loveabolade_'),
    ('eba_nessa')
  ) AS t(username)
),
resolved AS (
  SELECT p.id AS user_id
  FROM targets t
  JOIN public.profiles p ON lower(p.username) = lower(t.username)
)
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
FROM resolved r
WHERE p.id = r.user_id;
*/

-- Optional: also record institutional grant (audit trail). Safe to run in addition to §4.
/*
WITH targets AS (
  SELECT username, referral_code
  FROM (VALUES
    ('bookmeshade',  'bookmeshade'),
    ('gidion1',      'gidion1'),
    ('loveabolade_', 'loveabolade_'),
    ('eba_nessa',    'eba_nessa')
  ) AS t(username, referral_code)
),
resolved AS (
  SELECT p.id AS user_id, t.referral_code
  FROM targets t
  JOIN public.profiles p ON lower(p.username) = lower(t.username)
)
SELECT public.grant_institutional_access(
  r.user_id,
  'partner_' || r.referral_code,
  'premium'
)
FROM resolved r;
*/

-- -----------------------------------------------------------------------------
-- 5) APPLY — partner referral links (10% commission, same as Dan Edmund)
-- -----------------------------------------------------------------------------
/*
WITH targets AS (
  SELECT username, referral_code
  FROM (VALUES
    ('bookmeshade',  'bookmeshade'),
    ('gidion1',      'gidion1'),
    ('loveabolade_', 'loveabolade_'),
    ('eba_nessa',    'eba_nessa')
  ) AS t(username, referral_code)
),
resolved AS (
  SELECT
    p.id AS user_id,
    lower(t.referral_code) AS referral_code,
    'https://soundbridge.live/join?ref=' || lower(t.referral_code) AS referral_link
  FROM targets t
  JOIN public.profiles p ON lower(p.username) = lower(t.username)
)
INSERT INTO public.partners (user_id, referral_code, referral_link, commission_rate)
SELECT
  r.user_id,
  r.referral_code,
  r.referral_link,
  0.10
FROM resolved r
WHERE NOT EXISTS (
  SELECT 1 FROM public.partners pt WHERE pt.user_id = r.user_id
)
ON CONFLICT (referral_code) DO NOTHING;
*/

-- If a partner row exists but referral_code/link need fixing (rare), use per-user upsert:
/*
UPDATE public.partners pt
SET
  referral_code = 'bookmeshade',
  referral_link = 'https://soundbridge.live/join?ref=bookmeshade'
FROM public.profiles p
WHERE pt.user_id = p.id AND lower(p.username) = 'bookmeshade';
*/

-- -----------------------------------------------------------------------------
-- 6) VERIFY — creators, premium, and referral links
-- -----------------------------------------------------------------------------
WITH targets AS (
  SELECT *
  FROM (VALUES
    ('bookmeshade',   'bookmeshade',   'Sha_De'),
    ('gidion1',       'gidion1',       'Gidion'),
    ('loveabolade_',  'loveabolade_',  'Love Abolade'),
    ('eba_nessa',     'eba_nessa',     'Nessa')
  ) AS t(username, referral_code, display_label)
)
SELECT
  t.display_label,
  p.username,
  u.email,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.subscription_period_end,
  pt.referral_code,
  pt.referral_link,
  pt.total_referrals
FROM targets t
JOIN public.profiles p ON lower(p.username) = lower(t.username)
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.partners pt ON pt.user_id = p.id
ORDER BY t.display_label;

-- -----------------------------------------------------------------------------
-- 7) VERIFY — referred signups with names + details (admin / SQL editor)
--     Partners see anonymised rows in-app; this join exposes full attribution data.
-- -----------------------------------------------------------------------------
SELECT
  pt.referral_code,
  partner_profile.display_name AS partner_name,
  partner_profile.username     AS partner_username,
  rs.signed_up_at,
  referred.display_name        AS referred_name,
  referred.username            AS referred_username,
  referred_u.email             AS referred_email,
  referred.bio                 AS referred_bio,
  referred.location            AS referred_location,
  referred.onboarding_user_type,
  rs.converted_to_paid,
  rs.subscription_tier         AS referred_paid_tier
FROM public.referral_signups rs
JOIN public.partners pt ON pt.id = rs.partner_id
JOIN public.profiles partner_profile ON partner_profile.id = pt.user_id
JOIN public.profiles referred ON referred.id = rs.referred_user_id
JOIN auth.users referred_u ON referred_u.id = referred.id
WHERE pt.referral_code IN ('bookmeshade', 'gidion1', 'loveabolade_', 'eba_nessa', 'danedmund')
ORDER BY pt.referral_code, rs.signed_up_at DESC;

-- -----------------------------------------------------------------------------
-- 8) Smoke test — simulate attribution for an existing fan (optional, one-off)
--     Replace placeholders; only run if you need to backfill a missed referral.
-- -----------------------------------------------------------------------------
/*
SELECT public.record_referral_signup(
  'REFERRED_USER_UUID_HERE'::uuid,
  'bookmeshade'
);
*/
