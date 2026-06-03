-- =============================================================================
-- Early adopter diagnose — SOURCE OF TRUTH: auth.users (same as admin dashboard)
-- Do NOT use COUNT(*) FROM profiles alone — prod has many orphan profile rows.
-- =============================================================================

-- ★ RUN THIS ONLY (one row) — matches admin/founding-members “Total accounts”
SELECT
  current_database() AS db_name,
  (SELECT COUNT(*)::bigint FROM auth.users) AS total_auth_users,
  (SELECT COUNT(*)::bigint FROM public.profiles) AS total_profile_rows,
  (
    SELECT COUNT(*)::bigint
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
  ) AS orphan_profile_rows_not_in_auth,
  (
    SELECT COUNT(*)::bigint
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
      AND p.early_adopter
  ) AS real_users_early_adopter,
  (
    SELECT COUNT(*)::bigint
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
      AND lower(COALESCE(p.subscription_tier::text, 'free')) NOT IN ('free', '')
  ) AS real_users_paid_tier_on_profiles,
  (SELECT COUNT(*)::bigint FROM public.early_adopter_conversion) AS conversion_rows,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'waitlist_premium_3mo_2026'
  ) AS waitlist_table_exists,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'waitlist_premium_3mo_2026'
    ) THEN (SELECT COUNT(*)::bigint FROM public.waitlist_premium_3mo_2026)
    ELSE NULL::bigint
  END AS waitlist_email_count,
  (
    SELECT COUNT(*)::bigint
    FROM public.waitlist_premium_3mo_2026 c
    INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
  ) AS waitlist_exact_auth_email_matches,
  (
    SELECT COUNT(*)::bigint
    FROM auth.users u
    WHERE u.created_at >= '2026-03-28'::timestamptz
  ) AS auth_signups_since_28_mar_2026,
  (
    SELECT COUNT(*)::bigint FROM public.founding_members
  ) AS founding_member_rows,
  (
    SELECT COUNT(*)::bigint
    FROM public.founding_members fm
    WHERE fm.user_id IS NOT NULL
  ) AS founding_members_linked_to_accounts;

-- -----------------------------------------------------------------------------
-- Optional detail
-- -----------------------------------------------------------------------------

-- Real accounts with early adopter grant (should match waitlist_exact_auth_email_matches after APPLY)
SELECT u.email, p.subscription_tier, p.early_adopter, p.subscription_period_end
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.early_adopter = true
ORDER BY u.email;
