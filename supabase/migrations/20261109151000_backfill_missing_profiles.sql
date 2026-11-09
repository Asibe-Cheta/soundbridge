-- Backfill a profiles row for the ~225 pre-existing auth.users accounts that
-- had a real session established (organic email-confirm click, or Google/Apple
-- OAuth) but whose profile insert failed silently, before the handle_new_user
-- trigger (20261109150000_handle_new_user_trigger.sql) existed to guarantee it.
--
-- Forensic note on the 2026-10-06 exclusion below: that date is not a rogue
-- script or bad actor. Commit 87979672 ("Remove email-confirmation gate from
-- login-initiate (confirm-email temporarily off)", 2026-10-06 10:57 BST)
-- records that Justice disabled Supabase's project-level "Confirm email"
-- requirement that day because the email service needed renewal and couldn't
-- send confirmation emails. Supabase's own backend auto-confirmed the
-- existing backlog of unconfirmed accounts as a side effect of that setting
-- change, which produced email_confirmed_at timestamps clustered in
-- sequential sub-second intervals that day for accounts that never actually
-- clicked anything and never signed in afterward. Those are excluded here —
-- not real drop-off. (Separately: as of this migration, "Confirm email" is
-- STILL off, five weeks after a change noted as temporary — flagged to
-- Justice, not addressed by this migration.)
--
-- Also excludes 4 known test/internal accounts found in the candidate set:
-- two automated Supabase test accounts (sb-rls-upload-test / sb-confirm-test
-- @mailinator.com), one brand-owned account (soundbridgeliveuk@gmail.com),
-- and one of Justice's own secondary accounts (asibejustice@gmail.com).
--
-- A count guard aborts before writing anything if the live candidate count
-- has drifted far from the ~225 found during investigation, rather than
-- silently backfilling a materially different population than was reviewed.

CREATE TABLE IF NOT EXISTS public.profile_backfill_log (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  backfilled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_backfill_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.profile_backfill_log IS
  'Exactly which auth.users rows got a profiles row from the 2026-11-09 one-off backfill, so a rollback can target precisely these rows rather than guessing from profiles.onboarding_completed.';

REVOKE ALL ON public.profile_backfill_log FROM PUBLIC;
REVOKE ALL ON public.profile_backfill_log FROM anon;
REVOKE ALL ON public.profile_backfill_log FROM authenticated;
GRANT SELECT, INSERT ON public.profile_backfill_log TO service_role;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
    AND NOT (u.email_confirmed_at::date = '2026-10-06' AND u.last_sign_in_at IS NULL)
    AND u.email NOT IN (
      'sb-rls-upload-test-1791587323@mailinator.com',
      'sb-confirm-test-1791280720@mailinator.com',
      'soundbridgeliveuk@gmail.com',
      'asibejustice@gmail.com'
    );

  IF v_count NOT BETWEEN 200 AND 250 THEN
    RAISE EXCEPTION 'Expected ~225 profile-backfill candidates, found %. Aborting — investigate before re-running.', v_count;
  END IF;
END $$;

INSERT INTO public.profile_backfill_log (user_id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND NOT (u.email_confirmed_at::date = '2026-10-06' AND u.last_sign_in_at IS NULL)
  AND u.email NOT IN (
    'sb-rls-upload-test-1791587323@mailinator.com',
    'sb-confirm-test-1791280720@mailinator.com',
    'soundbridgeliveuk@gmail.com',
    'asibejustice@gmail.com'
  )
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.profiles (
  id, username, display_name, role, location, country, bio,
  onboarding_completed, onboarding_step, selected_role,
  profile_completed, first_action_completed, onboarding_skipped,
  created_at, updated_at
)
SELECT
  u.id,
  'user' || substring(u.id::text, 1, 8),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'New User'),
  'listener', 'london', 'UK', '',
  false, 'role_selection', 'listener',
  false, false, false,
  u.created_at, now()
FROM auth.users u
WHERE u.id IN (SELECT user_id FROM public.profile_backfill_log)
ON CONFLICT (id) DO NOTHING;
