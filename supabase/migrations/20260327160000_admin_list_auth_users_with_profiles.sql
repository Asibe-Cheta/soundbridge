-- Paginated list of all accounts: auth email + profile display name / username (admin, service_role only).

CREATE OR REPLACE FUNCTION public.admin_list_auth_users_with_profiles(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  username text,
  account_created_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH filtered AS (
    SELECT
      u.id AS f_user_id,
      u.email::text AS f_email,
      COALESCE(p.display_name::text, '') AS f_display_name,
      COALESCE(p.username::text, '') AS f_username,
      u.created_at AS f_created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE
      p_search IS NULL
      OR btrim(p_search) = ''
      OR u.email ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(p.display_name::text, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(p.username::text, '') ILIKE '%' || btrim(p_search) || '%'
  ),
  with_total AS (
    SELECT
      f.f_user_id,
      f.f_email,
      f.f_display_name,
      f.f_username,
      f.f_created_at,
      (SELECT COUNT(*)::bigint FROM filtered) AS f_total
    FROM filtered f
  )
  SELECT
    wt.f_user_id,
    wt.f_email,
    wt.f_display_name,
    wt.f_username,
    wt.f_created_at,
    wt.f_total
  FROM with_total wt
  ORDER BY wt.f_created_at DESC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.admin_list_auth_users_with_profiles(int, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_auth_users_with_profiles(int, int, text) TO service_role;
