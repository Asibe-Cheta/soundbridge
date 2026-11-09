-- Rollback for supabase/migrations/20261109153000_harden_handle_new_user_trigger.sql
--
-- Reverts handle_new_user() to the pre-hardening body from
-- 20261109150000_handle_new_user_trigger.sql (no exception handling — a
-- failure would propagate and could block the signup that triggered it).
-- Only do this if you have a specific reason to; the hardened version is
-- strictly safer. Does not touch the trigger itself, and leaves
-- handle_new_user_failures in place (drop it separately if you want it gone
-- too — it's harmless to leave, it just won't receive new rows).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, username, display_name, role, location, country, bio,
    onboarding_completed, onboarding_step, selected_role,
    profile_completed, first_action_completed, onboarding_skipped,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    'user' || substring(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'New User'),
    'listener',
    'london',
    'UK',
    '',
    false,
    'role_selection',
    'listener',
    false,
    false,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
