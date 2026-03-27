-- Admin reporting: first N founding members (by waitlist order) vs auth accounts (email match).
-- Used by GET /api/admin/founding-members/claims (service role only).

CREATE OR REPLACE FUNCTION public.founding_cohort_account_stats(p_limit int DEFAULT 101)
RETURNS TABLE (
  cohort_size int,
  with_account int,
  without_account int,
  account_rate_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH first_n AS (
    SELECT fm.id, fm.email
    FROM public.founding_members fm
    ORDER BY fm.waitlist_signed_up_at ASC NULLS LAST
    LIMIT GREATEST(p_limit, 1)
  )
  SELECT
    COUNT(*)::int,
    COUNT(u.id)::int,
    (COUNT(*) - COUNT(u.id))::int,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(u.id) / COUNT(*)::numeric, 2)
      ELSE 0::numeric
    END
  FROM first_n fm
  LEFT JOIN auth.users u ON lower(u.email) = lower(fm.email);
$$;

CREATE OR REPLACE FUNCTION public.founding_cohort_members_with_accounts(p_limit int DEFAULT 101)
RETURNS TABLE (
  founding_member_id uuid,
  email text,
  waitlist_signed_up_at timestamptz,
  has_account boolean,
  account_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH first_n AS (
    SELECT fm.id, fm.email, fm.waitlist_signed_up_at
    FROM public.founding_members fm
    ORDER BY fm.waitlist_signed_up_at ASC NULLS LAST
    LIMIT GREATEST(p_limit, 1)
  )
  SELECT
    fn.id,
    fn.email,
    fn.waitlist_signed_up_at,
    (u.id IS NOT NULL),
    u.created_at
  FROM first_n fn
  LEFT JOIN auth.users u ON lower(u.email) = lower(fn.email)
  ORDER BY fn.waitlist_signed_up_at ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.founding_cohort_account_stats(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.founding_cohort_members_with_accounts(int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.founding_cohort_account_stats(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.founding_cohort_members_with_accounts(int) TO service_role;
