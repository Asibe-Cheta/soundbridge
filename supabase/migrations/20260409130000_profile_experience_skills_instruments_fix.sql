-- Fix profile_experience missing columns causing POST /api/profile/experience 500s.
-- Also ensure profile_skills/profile_instruments match API expectations.

-- 1) profile_experience columns expected by API
CREATE TABLE IF NOT EXISTS public.profile_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  collaborators JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_experience
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS start_date TEXT,
  ADD COLUMN IF NOT EXISTS end_date TEXT,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS collaborators JSONB;

ALTER TABLE public.profile_experience
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.profile_experience ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_experience'
      AND policyname = 'Users manage own experience'
  ) THEN
    CREATE POLICY "Users manage own experience"
      ON public.profile_experience
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$policy$;

-- 2) profile_skills expected by API
CREATE TABLE IF NOT EXISTS public.profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill)
);

ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_skills'
      AND policyname = 'Users manage own skills'
  ) THEN
    CREATE POLICY "Users manage own skills"
      ON public.profile_skills
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$policy$;

-- 3) profile_instruments expected by API
CREATE TABLE IF NOT EXISTS public.profile_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, instrument)
);

ALTER TABLE public.profile_instruments ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_instruments'
      AND policyname = 'Users manage own instruments'
  ) THEN
    CREATE POLICY "Users manage own instruments"
      ON public.profile_instruments
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$policy$;

-- 4) Schema cache reload for PostgREST
NOTIFY pgrst, 'reload schema';
