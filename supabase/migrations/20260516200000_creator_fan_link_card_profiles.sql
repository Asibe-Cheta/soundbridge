-- Creator fan link share nudge + branded card (mobile CREATOR_CARD_WEB_TEAM_MEMO / CREATOR_BRANDED_CARD)
-- Safe defaults: existing creators get fan_link_shared=false, app_launch_count=0.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fan_link_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fan_link_shared_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS fan_link_share_method text DEFAULT null,
  ADD COLUMN IF NOT EXISTS app_launch_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teaser_last_shown_at_launch integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.fan_link_shared IS 'True after first fan link or branded card share; suppresses nudge/teaser.';
COMMENT ON COLUMN public.profiles.fan_link_shared_at IS 'Timestamp of first fan link/card share (analytics).';
COMMENT ON COLUMN public.profiles.fan_link_share_method IS 'First share method: link (native sheet) or card (PNG).';
COMMENT ON COLUMN public.profiles.app_launch_count IS 'Creator app opens; incremented on each launch.';
COMMENT ON COLUMN public.profiles.teaser_last_shown_at_launch IS 'app_launch_count when teaser modal was last shown; re-show when delta >= 4.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_fan_link_share_method_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_fan_link_share_method_check
      CHECK (fan_link_share_method IN ('link', 'card') OR fan_link_share_method IS NULL)
      NOT VALID;
  END IF;
END $$;
