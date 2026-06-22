-- Feed seen/unseen tracking cursor (safe if mobile team already applied)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_feed_caught_up_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.last_feed_caught_up_at IS
  'Last point in time the user scrolled through their unseen feed bucket';
