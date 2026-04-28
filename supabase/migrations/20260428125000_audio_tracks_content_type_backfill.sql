-- Add content_type for discover routing (music/podcast/mixtape), then backfill.
-- Idempotent so it is safe to re-run.

ALTER TABLE public.audio_tracks
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'music';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audio_tracks_content_type_check'
      AND conrelid = 'public.audio_tracks'::regclass
  ) THEN
    ALTER TABLE public.audio_tracks
      ADD CONSTRAINT audio_tracks_content_type_check
      CHECK (content_type IN ('music', 'podcast', 'mixtape'));
  END IF;
END $$;

-- Existing mixtapes were already marked by is_mixtape.
UPDATE public.audio_tracks
SET content_type = 'mixtape'
WHERE is_mixtape = TRUE;

-- Preview count before backfill (shows in migration logs).
DO $$
DECLARE
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.audio_tracks
  WHERE content_type = 'music'
    AND (
      description ILIKE 'Episode %'
      OR genre IN (
        'True Crime', 'Society & Culture', 'News', 'Comedy',
        'Education', 'Business', 'Technology', 'Health & Wellness',
        'Sports', 'Arts', 'Science', 'History', 'Religion',
        'Politics', 'Entertainment', 'Kids & Family', 'Leisure'
      )
    );
  RAISE NOTICE 'audio_tracks podcast backfill candidate rows: %', v_count;
END $$;

-- Backfill likely podcasts.
UPDATE public.audio_tracks
SET content_type = 'podcast'
WHERE content_type = 'music'
  AND (
    description ILIKE 'Episode %'
    OR genre IN (
      'True Crime', 'Society & Culture', 'News', 'Comedy',
      'Education', 'Business', 'Technology', 'Health & Wellness',
      'Sports', 'Arts', 'Science', 'History', 'Religion',
      'Politics', 'Entertainment', 'Kids & Family', 'Leisure'
    )
  );

CREATE INDEX IF NOT EXISTS idx_audio_tracks_content_type
  ON public.audio_tracks (content_type);

