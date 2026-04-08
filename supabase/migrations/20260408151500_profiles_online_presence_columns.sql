ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
