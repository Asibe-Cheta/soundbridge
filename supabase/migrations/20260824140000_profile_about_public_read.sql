-- profile_skills/instruments/experience only had "USING (auth.uid() = user_id)" (FOR ALL),
-- so a viewer requesting another creator's data via /api/profile/{skills,instruments,experience}
-- would be RLS-blocked once the route correctly scopes by ?user_id= instead of the caller's own
-- id (see the bug report: the route bug masked this — it always queried the caller's own id, so
-- the RLS gap never surfaced, it just silently returned the caller's own data mislabeled as the
-- viewed creator's). These are public "About" section fields, same as external_links (already
-- public) — add a public SELECT policy alongside the existing owner-only write policy.

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profile_skills' AND policyname = 'Public can read skills'
  ) THEN
    CREATE POLICY "Public can read skills" ON public.profile_skills FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profile_instruments' AND policyname = 'Public can read instruments'
  ) THEN
    CREATE POLICY "Public can read instruments" ON public.profile_instruments FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profile_experience' AND policyname = 'Public can read experience'
  ) THEN
    CREATE POLICY "Public can read experience" ON public.profile_experience FOR SELECT USING (true);
  END IF;
END
$policy$;
