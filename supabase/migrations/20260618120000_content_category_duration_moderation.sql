-- Content category duration moderation (one-time recategorisation)
-- Podcast minimum: 480s (8 min). Audiobook minimum: 900s (15 min).
-- Mobile team may have already run equivalent UPDATEs; this migration is idempotent.

DO $$
DECLARE
  podcast_moved integer;
  audiobook_moved integer;
BEGIN
  UPDATE audio_tracks
  SET content_type = 'music'
  WHERE content_type = 'podcast'
    AND duration IS NOT NULL
    AND duration > 0
    AND duration < 480;

  GET DIAGNOSTICS podcast_moved = ROW_COUNT;

  UPDATE audio_tracks
  SET content_type = 'music'
  WHERE content_type = 'audio_book'
    AND duration IS NOT NULL
    AND duration > 0
    AND duration < 900;

  GET DIAGNOSTICS audiobook_moved = ROW_COUNT;

  RAISE NOTICE 'content_category_duration_moderation: podcast→music %, audiobook→music %',
    podcast_moved, audiobook_moved;
END $$;
