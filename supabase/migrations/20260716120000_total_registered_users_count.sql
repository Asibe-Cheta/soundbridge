-- Total registered accounts (auth.users), safe to expose as a bare count to
-- authenticated clients (no PII). Powers the mobile app's dynamic user-count
-- milestone nudge so it always matches the admin "Total Accounts (Platform)"
-- stat, which reads from admin_total_auth_users_count() — that function stays
-- service_role-only, so this is a narrow, count-only sibling for client use.
CREATE OR REPLACE FUNCTION public.total_registered_users_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COUNT(*)::bigint FROM auth.users;
$$;

REVOKE ALL ON FUNCTION public.total_registered_users_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.total_registered_users_count() TO authenticated;
