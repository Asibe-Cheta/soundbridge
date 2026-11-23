-- CRITICAL FIX: profiles' own RLS policy -- "Users can update their own
-- profile" FOR UPDATE USING (auth.uid() = id) -- only restricts which ROW
-- can be touched, not which COLUMNS. RLS has no column-level concept, so
-- any logged-in user can currently do, via the normal authenticated client
-- (no service role needed):
--   supabase.from('profiles').update({ role: 'super_admin' }).eq('id', user.id)
--   supabase.from('profiles').update({ is_admin: true }).eq('id', user.id)
-- and RLS allows it, because auth.uid() = id is true for their own row.
-- requireAdmin() in src/lib/admin-auth.ts trusts both of these columns.
--
-- Can't just block all self-updates to `role`: app/api/user/become-creator
-- legitimately updates profiles.role to 'creator' using the end user's own
-- (anon-key, RLS-bound) client, not a service client -- that must keep
-- working. So this only blocks escalating INTO an admin-tier role value,
-- not ordinary role transitions.
--
-- service_role (used by every admin route via requireAdmin's serviceClient,
-- and by this fix's own future admin-role-grant UI) bypasses RLS but NOT
-- triggers, so this trigger checks auth.role() itself rather than relying
-- on RLS bypass semantics.

CREATE OR REPLACE FUNCTION public.prevent_profiles_admin_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND lower(NEW.role::text) IN ('admin', 'super_admin', 'moderator') THEN
      RAISE EXCEPTION 'Cannot self-assign an admin role';
    END IF;

    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin AND NEW.is_admin = true THEN
      RAISE EXCEPTION 'Cannot self-assign is_admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profiles_admin_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profiles_admin_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profiles_admin_self_escalation();

COMMENT ON FUNCTION public.prevent_profiles_admin_self_escalation IS
  'Blocks a non-service-role caller from setting profiles.role to admin/super_admin/moderator or profiles.is_admin to true on any row, including their own. Does not affect ordinary role values (creator/listener/organizer) or service-role writes (e.g. the future admin-role-grant UI).';
