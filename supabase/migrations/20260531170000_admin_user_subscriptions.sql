-- Admin: paginated list of platform subscribers and their plans (profiles + user_subscriptions).

CREATE OR REPLACE FUNCTION public.admin_list_user_subscriptions(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_paid_only boolean DEFAULT true
)
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  display_name text,
  profile_tier text,
  profile_status text,
  legacy_tier text,
  legacy_status text,
  effective_tier text,
  billing_cycle text,
  early_adopter boolean,
  subscription_start_date timestamptz,
  subscription_renewal_date timestamptz,
  subscription_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH base AS (
    SELECT
      u.id AS b_user_id,
      u.email::text AS b_email,
      COALESCE(p.username::text, '') AS b_username,
      COALESCE(p.display_name::text, '') AS b_display_name,
      lower(COALESCE(NULLIF(p.subscription_tier::text, ''), 'free')) AS b_profile_tier,
      lower(COALESCE(NULLIF(p.subscription_status::text, ''), '')) AS b_profile_status,
      lower(COALESCE(NULLIF(us.tier::text, ''), 'free')) AS b_legacy_tier,
      lower(COALESCE(NULLIF(us.status::text, ''), '')) AS b_legacy_status,
      CASE
        WHEN lower(COALESCE(p.subscription_tier::text, '')) IN ('unlimited', 'enterprise') THEN 'unlimited'
        WHEN lower(COALESCE(p.subscription_tier::text, '')) IN ('premium', 'pro') THEN 'premium'
        WHEN lower(COALESCE(us.tier::text, '')) IN ('unlimited', 'enterprise') THEN 'unlimited'
        WHEN lower(COALESCE(us.tier::text, '')) IN ('premium', 'pro') THEN 'premium'
        ELSE 'free'
      END AS b_effective_tier,
      COALESCE(NULLIF(p.subscription_period::text, ''), NULLIF(us.billing_cycle::text, ''), 'monthly') AS b_billing_cycle,
      COALESCE(p.early_adopter, false) AS b_early_adopter,
      COALESCE(p.subscription_start_date, us.subscription_start_date) AS b_subscription_start_date,
      COALESCE(p.subscription_renewal_date, us.subscription_renewal_date) AS b_subscription_renewal_date,
      COALESCE(p.subscription_period_end::timestamptz, us.subscription_ends_at) AS b_subscription_ends_at,
      COALESCE(NULLIF(us.stripe_customer_id::text, ''), NULLIF(p.stripe_customer_id::text, '')) AS b_stripe_customer_id,
      COALESCE(NULLIF(us.stripe_subscription_id::text, ''), NULLIF(p.stripe_subscription_id::text, '')) AS b_stripe_subscription_id,
      COALESCE(us.created_at, p.subscription_start_date, p.created_at) AS b_created_at,
      COALESCE(us.updated_at, p.updated_at, us.created_at, p.created_at) AS b_updated_at
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
    WHERE
      (
        NOT COALESCE(p_paid_only, true)
        OR lower(COALESCE(NULLIF(p.subscription_tier::text, ''), 'free')) NOT IN ('free')
        OR lower(COALESCE(NULLIF(us.tier::text, ''), 'free')) NOT IN ('free')
      )
      AND (
        p_tier IS NULL
        OR btrim(p_tier) = ''
        OR lower(btrim(p_tier)) = 'all'
        OR (
          CASE
            WHEN lower(COALESCE(p.subscription_tier::text, '')) IN ('unlimited', 'enterprise') THEN 'unlimited'
            WHEN lower(COALESCE(p.subscription_tier::text, '')) IN ('premium', 'pro') THEN 'premium'
            WHEN lower(COALESCE(us.tier::text, '')) IN ('unlimited', 'enterprise') THEN 'unlimited'
            WHEN lower(COALESCE(us.tier::text, '')) IN ('premium', 'pro') THEN 'premium'
            ELSE 'free'
          END
        ) = lower(btrim(p_tier))
        OR (lower(btrim(p_tier)) = 'pro' AND lower(COALESCE(us.tier::text, '')) = 'pro')
      )
      AND (
        p_status IS NULL
        OR btrim(p_status) = ''
        OR lower(btrim(p_status)) = 'all'
        OR lower(COALESCE(NULLIF(p.subscription_status::text, ''), NULLIF(us.status::text, ''), 'active')) = lower(btrim(p_status))
      )
  ),
  filtered AS (
    SELECT *
    FROM base
    WHERE
      p_search IS NULL
      OR btrim(p_search) = ''
      OR b_email ILIKE '%' || btrim(p_search) || '%'
      OR b_username ILIKE '%' || btrim(p_search) || '%'
      OR b_display_name ILIKE '%' || btrim(p_search) || '%'
      OR b_stripe_customer_id ILIKE '%' || btrim(p_search) || '%'
      OR b_stripe_subscription_id ILIKE '%' || btrim(p_search) || '%'
  ),
  with_total AS (
    SELECT
      f.*,
      (SELECT COUNT(*)::bigint FROM filtered) AS b_total_count
    FROM filtered f
  )
  SELECT
    wt.b_user_id,
    wt.b_email,
    NULLIF(wt.b_username, ''),
    NULLIF(wt.b_display_name, ''),
    NULLIF(wt.b_profile_tier, 'free'),
    NULLIF(wt.b_profile_status, ''),
    NULLIF(wt.b_legacy_tier, 'free'),
    NULLIF(wt.b_legacy_status, ''),
    wt.b_effective_tier,
    wt.b_billing_cycle,
    wt.b_early_adopter,
    wt.b_subscription_start_date,
    wt.b_subscription_renewal_date,
    wt.b_subscription_ends_at,
    NULLIF(wt.b_stripe_customer_id, ''),
    NULLIF(wt.b_stripe_subscription_id, ''),
    wt.b_created_at,
    wt.b_updated_at,
    wt.b_total_count
  FROM with_total wt
  ORDER BY
    CASE wt.b_effective_tier WHEN 'free' THEN 2 ELSE 1 END,
    COALESCE(wt.b_updated_at, wt.b_created_at) DESC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.admin_user_subscriptions_summary()
RETURNS TABLE (
  total_subscribed bigint,
  by_tier jsonb,
  by_status jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH base AS (
    SELECT
      CASE
        WHEN lower(COALESCE(p.subscription_tier::text, '')) IN ('unlimited', 'enterprise') THEN 'unlimited'
        WHEN lower(COALESCE(p.subscription_tier::text, '')) IN ('premium', 'pro') THEN 'premium'
        WHEN lower(COALESCE(us.tier::text, '')) IN ('unlimited', 'enterprise') THEN 'unlimited'
        WHEN lower(COALESCE(us.tier::text, '')) IN ('premium', 'pro') THEN 'premium'
        ELSE 'free'
      END AS eff_tier,
      lower(COALESCE(NULLIF(p.subscription_status::text, ''), NULLIF(us.status::text, ''), 'active')) AS eff_status
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
  ),
  paid AS (
    SELECT * FROM base WHERE eff_tier <> 'free'
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM paid) AS total_subscribed,
    COALESCE(
      (
        SELECT jsonb_object_agg(eff_tier, cnt ORDER BY eff_tier)
        FROM (
          SELECT eff_tier, COUNT(*)::bigint AS cnt
          FROM paid
          GROUP BY eff_tier
        ) t
      ),
      '{}'::jsonb
    ) AS by_tier,
    COALESCE(
      (
        SELECT jsonb_object_agg(eff_status, cnt ORDER BY eff_status)
        FROM (
          SELECT eff_status, COUNT(*)::bigint AS cnt
          FROM paid
          GROUP BY eff_status
        ) s
      ),
      '{}'::jsonb
    ) AS by_status;
$$;

REVOKE ALL ON FUNCTION public.admin_list_user_subscriptions(int, int, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_user_subscriptions(int, int, text, text, text, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.admin_user_subscriptions_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_subscriptions_summary() TO service_role;
