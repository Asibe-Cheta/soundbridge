-- Detect OAuth sign-ups where the same email already belongs to another auth user (different provider).
-- Used by web /auth/callback (service role) to block duplicate accounts.

CREATE OR REPLACE FUNCTION public.auth_email_registered_to_other_user(
  p_email text,
  p_current_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.email IS NOT NULL
      AND lower(trim(u.email::text)) = lower(trim(p_email))
      AND u.id <> p_current_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.auth_email_registered_to_other_user(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_email_registered_to_other_user(text, uuid) TO service_role;

COMMENT ON FUNCTION public.auth_email_registered_to_other_user(text, uuid) IS
  'True if another auth.users row already has this email (cross-provider duplicate). Service role only.';
