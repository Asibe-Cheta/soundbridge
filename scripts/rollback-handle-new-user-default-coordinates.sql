-- Rollback for supabase/migrations/20261116120000_handle_new_user_default_coordinates.sql
--
-- Restores handle_new_user() to its exact pre-migration body (20261109150000),
-- dropping the city/latitude/longitude columns from the stub-profile insert.
-- Does not touch any already-created profile rows; only changes what new
-- signups get going forward.
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

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates a minimal stub profiles row for every new auth.users row, in the same transaction. ON CONFLICT DO NOTHING so it is always safe to re-run and never fights with the app-level insert fallback in post-signup-confirm/route.ts or auth/callback/route.ts.';
