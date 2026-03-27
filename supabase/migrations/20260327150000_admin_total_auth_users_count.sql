-- Total registered accounts (auth.users). Admin dashboard only (service_role).

CREATE OR REPLACE FUNCTION public.admin_total_auth_users_count()
RETURNS TABLE (total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COUNT(*)::bigint FROM auth.users;
$$;

REVOKE ALL ON FUNCTION public.admin_total_auth_users_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_total_auth_users_count() TO service_role;
