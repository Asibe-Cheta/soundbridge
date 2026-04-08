-- Admin live session controls (WEB_TEAM_ADMIN_LIVE_SESSION_CONTROLS.md)
-- Mobile: adminEndLiveSession updates live_sessions / participants without creator_id filter.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS 'When true, user may end any live session via client (RLS policies below).';

DO $$
BEGIN
  IF to_regclass('public.live_sessions') IS NULL THEN
    RAISE NOTICE 'Skipping live_sessions admin policies: table public.live_sessions not found';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Admins can update any live session" ON public.live_sessions;
  CREATE POLICY "Admins can update any live session"
    ON public.live_sessions
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_admin = true
      )
    );

  DROP POLICY IF EXISTS "Admins can view all live sessions" ON public.live_sessions;
  CREATE POLICY "Admins can view all live sessions"
    ON public.live_sessions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_admin = true
      )
    );
END $$;

DO $$
BEGIN
  IF to_regclass('public.live_session_participants') IS NULL THEN
    RAISE NOTICE 'Skipping live_session_participants admin policy: table not found';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Admins can update any session participants" ON public.live_session_participants;
  CREATE POLICY "Admins can update any session participants"
    ON public.live_session_participants
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_admin = true
      )
    );
END $$;
