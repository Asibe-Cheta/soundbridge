-- Hardens handle_new_user() (20261109150000_handle_new_user_trigger.sql),
-- already applied, so that it can never block a signup. CREATE OR REPLACE is
-- idempotent against the trigger already created by that earlier migration —
-- this only changes the function body, the trigger itself is untouched.
--
-- Three failure modes now handled explicitly, all funneling into a new log
-- table (handle_new_user_failures) rather than ever raising out of the
-- trigger and failing the auth.users insert that fired it:
--  1. Username collision (unique_violation on profiles.username) — practically
--     impossible since the username is derived from the user's own UUID, but
--     falls back to the full UUID (always unique, always fits the column)
--     rather than erroring.
--  2. Null email / null full_name — already safe via COALESCE + split_part,
--     which both return NULL-safely in Postgres, falling through to
--     'New User'. Kept as-is, just documented here.
--  3. Anything else (a column dropped, a constraint added later, etc.) — a
--     catch-all WHEN OTHERS that logs SQLERRM and returns NEW regardless, so
--     a signup is never blocked by a bug in this trigger.
CREATE TABLE IF NOT EXISTS public.handle_new_user_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handle_new_user_failures_user_id ON public.handle_new_user_failures (user_id);

ALTER TABLE public.handle_new_user_failures ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.handle_new_user_failures IS
  'Every time handle_new_user() fails to create a profile stub for a new auth.users row. Service-role only, zero RLS policies. A non-empty table here means a user has NO profile row at all and is relying entirely on post-signup-confirm/route.ts or auth/callback/route.ts''s own insert to ever get one.';

REVOKE ALL ON public.handle_new_user_failures FROM PUBLIC;
REVOKE ALL ON public.handle_new_user_failures FROM anon;
REVOKE ALL ON public.handle_new_user_failures FROM authenticated;
GRANT SELECT, INSERT ON public.handle_new_user_failures TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  EXCEPTION
    WHEN unique_violation THEN
      -- id conflict is already handled by ON CONFLICT (id) above, so reaching
      -- here means a different unique constraint fired (in practice: username).
      -- Retry once with the full UUID as the username instead of its first 8
      -- characters — always unique, always fits varchar(50).
      BEGIN
        INSERT INTO public.profiles (
          id, username, display_name, role, location, country, bio,
          onboarding_completed, onboarding_step, selected_role,
          profile_completed, first_action_completed, onboarding_skipped,
          created_at, updated_at
        )
        VALUES (
          NEW.id,
          'user' || NEW.id::text,
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
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.handle_new_user_failures (user_id, error_message)
        VALUES (NEW.id, SQLERRM);
      END;

    WHEN OTHERS THEN
      -- Never let a profile-stub failure block the auth.users insert that
      -- triggered it. Logged for visibility; post-signup-confirm/route.ts and
      -- auth/callback/route.ts's own "insert if missing" fallback is still a
      -- second chance if the client-side flow succeeds afterward.
      INSERT INTO public.handle_new_user_failures (user_id, error_message)
      VALUES (NEW.id, SQLERRM);
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates a minimal stub profiles row for every new auth.users row, in the same transaction. Never raises — any failure (including a username collision, handled with one retry first) is caught and logged to handle_new_user_failures, and NEW is always returned, so this can never block a signup.';
