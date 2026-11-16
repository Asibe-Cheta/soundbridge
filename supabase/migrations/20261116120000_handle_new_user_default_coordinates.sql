-- Adds static London-centre coordinates to the stub profile row that
-- handle_new_user() (20261109150000) creates for every new auth.users row.
--
-- This trigger is the actual, DB-guaranteed write path for profiles.location
-- on nearly every signup: it fires in the same transaction as the auth.users
-- insert and wins the race before post-signup-confirm/route.ts or
-- auth/callback/route.ts's own fallback inserts ever run (their inserts now
-- simply find the row already there, via ON CONFLICT DO NOTHING). Those two
-- app-level fallbacks, and the client-side oauth-callback/page.tsx path, have
-- separately been given the same static values in application code this
-- session, since this is the dominant path, this migration is what actually
-- matters for leaving almost no new signup without coordinates.
--
-- A live geocoding call cannot run inside a SQL trigger, and would be pointless
-- here anyway: the typed text is always the literal 'london' default, never
-- user input, so the result would be identical every time. Hardcoding London's
-- centre (51.5072, -0.1276) is exact and avoids any network dependency inside
-- a transaction that also creates the auth.users row.
--
-- country stays 'UK' exactly as the existing trigger already set it; this
-- migration only adds the three new columns, so it does not touch that
-- pre-existing UK vs "United Kingdom" naming question.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, username, display_name, role, location, city, latitude, longitude, country, bio,
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
    'London',
    51.5072,
    -0.1276,
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
  'Creates a minimal stub profiles row (including a London-centre default city/latitude/longitude) for every new auth.users row, in the same transaction. ON CONFLICT DO NOTHING so it is always safe to re-run and never fights with the app-level insert fallback in post-signup-confirm/route.ts or auth/callback/route.ts.';
