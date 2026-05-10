-- Allow audiobook uploads (mobile + web). See WEB_TEAM_AUDIO_BOOK_CONTENT_TYPE_MIGRATION.MD

ALTER TABLE public.audio_tracks DROP CONSTRAINT IF EXISTS audio_tracks_content_type_check;

ALTER TABLE public.audio_tracks
  ADD CONSTRAINT audio_tracks_content_type_check
  CHECK (content_type IN ('music', 'podcast', 'mixtape', 'audio_book'));
