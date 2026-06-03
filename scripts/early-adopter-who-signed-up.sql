-- =============================================================================
-- Early adopter vs founding member vs real accounts (auth.users = admin dashboard)
-- =============================================================================

-- A) Three different cohorts (do not mix them up)
SELECT
  (SELECT COUNT(*) FROM public.waitlist_premium_3mo_2026) AS early_adopter_email_list,
  (SELECT COUNT(*) FROM public.founding_members) AS founding_member_list,
  (SELECT COUNT(*) FROM auth.users) AS real_registered_accounts;

-- B) Waitlist early-adopter emails vs who signed up (exact email match)
SELECT
  (SELECT COUNT(*) FROM public.waitlist_premium_3mo_2026 c
   INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))) AS waitlist_with_account,
  (SELECT COUNT(*) FROM public.waitlist_premium_3mo_2026 c
   WHERE NOT EXISTS (
     SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(trim(c.email))
   )) AS waitlist_no_account_yet;

-- C) Real signups since launch — must be <= total auth.users (not 38k)
SELECT COUNT(*) AS auth_signups_since_28_mar_2026
FROM auth.users u
WHERE u.created_at >= '2026-03-28'::timestamptz;

-- D) Why profiles COUNT is wrong for “users on app”
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS profile_rows,
  (SELECT COUNT(*) FROM auth.users) AS auth_users,
  (SELECT COUNT(*) FROM public.profiles p
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)) AS orphan_profiles;

-- E) Granted early adopters (real accounts only)
SELECT u.email, p.id, p.subscription_tier, p.early_adopter, p.subscription_period_end
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.early_adopter = true
ORDER BY u.email;
