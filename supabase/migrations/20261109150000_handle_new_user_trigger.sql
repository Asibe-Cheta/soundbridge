-- Guarantees a profile row exists for every new auth.users row, closing the
-- root cause behind the profile-creation drop-off investigated this session:
-- there was no DB-level guarantee that a profile row ever gets created, only
-- a client/server insert (post-signup-confirm/route.ts, auth/callback/route.ts)
-- that ran after a multi-step auth flow and silently logged-and-continued on
-- failure. Of 426 confirmed-email auth.users rows with no profiles row, ~225
-- had a real session established (organic email-confirm click, or Google/Apple
-- OAuth) and the insert simply failed somewhere in that chain; the other ~198
-- were never real drop-off at all (their email_confirmed_at was set only by a
-- one-time 2026-10-06 bulk update — see the backfill migration's header for
-- that forensic finding — and they never signed in).
--
-- This trigger creates the same minimal stub the existing insert code already
-- creates (identical username/display_name formula), inside the SAME
-- transaction as the auth.users insert — profile existence becomes a database
-- guarantee, not an outcome of a later client request succeeding.
--
-- The existing insert code in post-signup-confirm/route.ts is left completely
-- unchanged: it already computes display_name with the exact same formula
-- this trigger uses, and already handles referral-code attribution in a
-- separate, idempotent step outside the insert block — so once the trigger
-- wins the race, that route's own insert simply finds the row and no-ops.
-- auth/callback/route.ts's OAuth branch IS changed (same commit as this
-- migration) to enrich avatar_url/first_name/last_name once the trigger has
-- already created the row, since this SQL trigger has no equivalent to
-- extractOAuthDisplayNameParts()'s provider-specific parsing and shouldn't
-- try to duplicate it.
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
