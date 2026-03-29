-- Allow Supabase Auth Admin (and GoTrue) to delete users when public tables
-- reference auth.users(id) only as optional metadata or as ownership rows.
-- Previously these FKs defaulted to NO ACTION and blocked deletion with
-- "Database error deleting user".

-- Optional pointers: clear the reference when the auth user is removed.
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_cancelled_by_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_cancelled_by_fkey
  FOREIGN KEY (cancelled_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.audio_tracks
  DROP CONSTRAINT IF EXISTS audio_tracks_reviewed_by_fkey;
ALTER TABLE public.audio_tracks
  ADD CONSTRAINT audio_tracks_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.content_moderation_queue
  DROP CONSTRAINT IF EXISTS content_moderation_queue_moderator_id_fkey;
ALTER TABLE public.content_moderation_queue
  ADD CONSTRAINT content_moderation_queue_moderator_id_fkey
  FOREIGN KEY (moderator_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.copyright_blacklist
  DROP CONSTRAINT IF EXISTS copyright_blacklist_added_by_fkey;
ALTER TABLE public.copyright_blacklist
  ADD CONSTRAINT copyright_blacklist_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.copyright_whitelist
  DROP CONSTRAINT IF EXISTS copyright_whitelist_added_by_fkey;
ALTER TABLE public.copyright_whitelist
  ADD CONSTRAINT copyright_whitelist_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.copyright_protection
  DROP CONSTRAINT IF EXISTS copyright_protection_reviewed_by_fkey;
ALTER TABLE public.copyright_protection
  ADD CONSTRAINT copyright_protection_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ownership: remove protection rows for the deleted user (avoids NOT NULL issues).
ALTER TABLE public.copyright_protection
  DROP CONSTRAINT IF EXISTS copyright_protection_creator_id_fkey;
ALTER TABLE public.copyright_protection
  ADD CONSTRAINT copyright_protection_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
