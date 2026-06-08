-- =============================================================================
-- Partner referral — fix Dan Edmund premium + verify all 5 partners (prod)
-- =============================================================================
-- Partners: Dan Edmund, Sha_De, Gidion, Love Abolade, Nessa
-- Expected for each:
--   • profiles.role = 'creator'
--   • subscription_tier = premium, subscription_status = active
--   • subscription_period_end set (~1 year from grant date, NOT NULL / not permanent)
--   • public.partners row with referral_code + referral_link
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) FIX — Dan Edmund: change permanent Premium → 1 year Premium
--    (was subscription_period_end IS NULL = manual permanent grant)
-- -----------------------------------------------------------------------------
/*
UPDATE public.profiles
SET
  subscription_tier         = 'premium',
  subscription_status       = 'active',
  subscription_start_date   = COALESCE(subscription_start_date, now()),
  subscription_period_end   = now() + interval '1 year',
  subscription_renewal_date = now() + interval '1 year',
  updated_at                = now()
WHERE id = '55b5bc91-5f6a-4155-9594-2e0237417976';
*/

-- Preview Dan before/after (run before and after §1):
SELECT
  p.id,
  u.email,
  p.username,
  p.display_name,
  p.subscription_tier,
  p.subscription_status,
  p.subscription_period_end,
  p.subscription_renewal_date,
  CASE
    WHEN p.subscription_period_end IS NULL THEN 'permanent (needs fix)'
    WHEN p.subscription_period_end <= now() THEN 'expired'
    ELSE 'expires ' || to_char(p.subscription_period_end, 'YYYY-MM-DD')
  END AS premium_expiry_note
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = '55b5bc91-5f6a-4155-9594-2e0237417976';

-- -----------------------------------------------------------------------------
-- 2) VERIFY — all 5 partners with pass/fail columns (run after fixes)
--     Every row should show overall_status = 'OK'
-- -----------------------------------------------------------------------------
WITH targets AS (
  SELECT *
  FROM (VALUES
    ('Dan Edmund',    NULL::text,           'danedmund',    '55b5bc91-5f6a-4155-9594-2e0237417976'::uuid),
    ('Sha_De',        'bookmeshade',        'bookmeshade',  NULL::uuid),
    ('Gidion',        'gidion1',            'gidion1',      NULL::uuid),
    ('Love Abolade',  'loveabolade_',       'loveabolade_', NULL::uuid),
    ('Nessa',         'eba_nessa',          'eba_nessa',    NULL::uuid)
  ) AS t(display_label, username, referral_code, user_id)
),
resolved AS (
  SELECT
    t.display_label,
    t.username       AS expected_username,
    t.referral_code  AS expected_referral_code,
    COALESCE(t.user_id, p.id) AS user_id,
    p.username,
    p.display_name,
    u.email,
    p.role,
    p.subscription_tier,
    p.subscription_status,
    p.subscription_period_end,
    p.subscription_renewal_date,
    pt.id            AS partner_id,
    pt.referral_code AS actual_referral_code,
    pt.referral_link,
    pt.commission_rate,
    pt.total_referrals
  FROM targets t
  LEFT JOIN public.profiles p
    ON (t.user_id IS NOT NULL AND p.id = t.user_id)
    OR (t.user_id IS NULL AND lower(p.username) = lower(t.username))
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.partners pt ON pt.user_id = p.id
)
SELECT
  display_label,
  user_id,
  email,
  username,
  display_name,
  -- checks
  CASE WHEN role = 'creator' THEN 'OK' ELSE 'FAIL: role=' || COALESCE(role, 'null') END
    AS creator_check,
  CASE
    WHEN lower(COALESCE(subscription_tier::text, '')) = 'premium'
     AND subscription_status = 'active' THEN 'OK'
    ELSE 'FAIL: tier=' || COALESCE(subscription_tier::text, 'null')
         || ' status=' || COALESCE(subscription_status, 'null')
  END AS premium_active_check,
  CASE
    WHEN subscription_period_end IS NULL THEN 'FAIL: permanent (no expiry)'
    WHEN subscription_period_end <= now() THEN 'FAIL: expired'
    WHEN subscription_period_end < now() + interval '11 months' THEN 'WARN: under 11 months left'
    WHEN subscription_period_end > now() + interval '13 months' THEN 'WARN: over 13 months (not ~1yr)'
    ELSE 'OK (expires ' || to_char(subscription_period_end, 'YYYY-MM-DD') || ')'
  END AS one_year_premium_check,
  CASE
    WHEN partner_id IS NULL THEN 'FAIL: no partners row'
    WHEN lower(actual_referral_code) <> lower(expected_referral_code) THEN
      'FAIL: code=' || COALESCE(actual_referral_code, 'null')
    WHEN referral_link IS NULL OR referral_link = '' THEN 'FAIL: missing link'
    WHEN referral_link <> 'https://soundbridge.live/join?ref=' || lower(expected_referral_code) THEN
      'WARN: link=' || COALESCE(referral_link, 'null')
    ELSE 'OK'
  END AS referral_link_check,
  referral_link,
  total_referrals,
  CASE
    WHEN role = 'creator'
     AND lower(COALESCE(subscription_tier::text, '')) = 'premium'
     AND subscription_status = 'active'
     AND subscription_period_end IS NOT NULL
     AND subscription_period_end > now()
     AND partner_id IS NOT NULL
     AND lower(actual_referral_code) = lower(expected_referral_code)
     AND referral_link = 'https://soundbridge.live/join?ref=' || lower(expected_referral_code)
    THEN 'OK'
    ELSE 'NEEDS ATTENTION'
  END AS overall_status
FROM resolved
ORDER BY display_label;

-- -----------------------------------------------------------------------------
-- 3) SUMMARY — quick count (expect 5 OK)
-- -----------------------------------------------------------------------------
WITH checks AS (
  SELECT overall_status
  FROM (
    WITH targets AS (
      SELECT *
      FROM (VALUES
        ('Dan Edmund',    NULL::text,           'danedmund',    '55b5bc91-5f6a-4155-9594-2e0237417976'::uuid),
        ('Sha_De',        'bookmeshade',        'bookmeshade',  NULL::uuid),
        ('Gidion',        'gidion1',            'gidion1',      NULL::uuid),
        ('Love Abolade',  'loveabolade_',       'loveabolade_', NULL::uuid),
        ('Nessa',         'eba_nessa',          'eba_nessa',    NULL::uuid)
      ) AS t(display_label, username, referral_code, user_id)
    ),
    resolved AS (
      SELECT
        t.referral_code AS expected_referral_code,
        p.role,
        p.subscription_tier,
        p.subscription_status,
        p.subscription_period_end,
        pt.id AS partner_id,
        pt.referral_code AS actual_referral_code,
        pt.referral_link
      FROM targets t
      LEFT JOIN public.profiles p
        ON (t.user_id IS NOT NULL AND p.id = t.user_id)
        OR (t.user_id IS NULL AND lower(p.username) = lower(t.username))
      LEFT JOIN public.partners pt ON pt.user_id = p.id
    )
    SELECT
      CASE
        WHEN role = 'creator'
         AND lower(COALESCE(subscription_tier::text, '')) = 'premium'
         AND subscription_status = 'active'
         AND subscription_period_end IS NOT NULL
         AND subscription_period_end > now()
         AND partner_id IS NOT NULL
         AND lower(actual_referral_code) = lower(expected_referral_code)
         AND referral_link = 'https://soundbridge.live/join?ref=' || lower(expected_referral_code)
        THEN 'OK'
        ELSE 'NEEDS ATTENTION'
      END AS overall_status
    FROM resolved
  ) s
)
SELECT
  COUNT(*) FILTER (WHERE overall_status = 'OK')              AS partners_fully_configured,
  COUNT(*) FILTER (WHERE overall_status = 'NEEDS ATTENTION') AS partners_needing_fix,
  COUNT(*)                                                   AS total_partners
FROM checks;

-- -----------------------------------------------------------------------------
-- 4) REFERRAL ATTRIBUTION — who has signed up via each partner link
-- -----------------------------------------------------------------------------
SELECT
  pt.referral_code,
  partner_p.display_name AS partner_name,
  rs.signed_up_at,
  fan.display_name       AS referred_name,
  fan.username           AS referred_username,
  fan_u.email            AS referred_email,
  fan.community_entry_creator_id IS NOT NULL AS community_entry_tagged
FROM public.referral_signups rs
JOIN public.partners pt ON pt.id = rs.partner_id
JOIN public.profiles partner_p ON partner_p.id = pt.user_id
JOIN public.profiles fan ON fan.id = rs.referred_user_id
JOIN auth.users fan_u ON fan_u.id = fan.id
WHERE pt.referral_code IN ('danedmund', 'bookmeshade', 'gidion1', 'loveabolade_', 'eba_nessa')
ORDER BY pt.referral_code, rs.signed_up_at DESC;
