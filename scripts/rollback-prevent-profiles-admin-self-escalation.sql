-- Rollback for supabase/migrations/20261124100000_prevent_profiles_admin_self_escalation.sql
-- Only roll this back if it is genuinely blocking a legitimate service-role
-- write -- it should never block one (service_role is explicitly exempted),
-- so if something is broken, investigate before removing this protection.

DROP TRIGGER IF EXISTS trg_prevent_profiles_admin_self_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profiles_admin_self_escalation();
