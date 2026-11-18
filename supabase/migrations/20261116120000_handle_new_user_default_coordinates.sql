-- Revises handle_new_user() (20261109150000) to stop fabricating a location
-- for every new signup.
--
-- The first version of this migration (committed in e1f8c0f6, never run)
-- added a hardcoded London-centre city/latitude/longitude to the stub profile
-- row. A pre-run review (see conversation) found that was not an improvement:
-- it converts "no location, no match" (today's actual state for every
-- default) into a confident false match for the event-notification system
-- (find_nearby_users_for_event matches on exact city text or a coordinate
-- radius), which is worse for a real non-London user than matching nothing.
--
-- This version instead leaves location, city, latitude, longitude and
-- country all NULL, and stamps location_source = 'default' so this stub
-- state is always distinguishable from a real user-provided or geocoded
-- value. The country was previously hardcoded to 'UK' alongside 'london';
-- that's the same fabricated-default problem (a UK flag with no UK evidence)
-- so it is dropped too, not kept.
--
-- Depends on profiles.location_source existing
-- (20261116110000_add_profiles_location_source.sql must run first).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, username, display_name, role, location, country, bio,
    location_source,
    onboarding_completed, onboarding_step, selected_role,
    profile_completed, first_action_completed, onboarding_skipped,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    'user' || substring(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'New User'),
    'listener',
    NULL,
    NULL,
    '',
    'default',
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
  'Creates a minimal stub profiles row for every new auth.users row, in the same transaction, with location/city/latitude/longitude/country left NULL and location_source = ''default'' rather than a fabricated location. ON CONFLICT DO NOTHING so it is always safe to re-run and never fights with the app-level insert fallback in post-signup-confirm/route.ts or auth/callback/route.ts.';
