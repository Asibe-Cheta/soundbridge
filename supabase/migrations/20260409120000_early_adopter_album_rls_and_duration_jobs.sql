-- Early-adopter premium grant + album_tracks INSERT ownership RLS + duration job queue.

-- 1) URGENT: ensure early adopters get premium grant in profiles for gating checks.
UPDATE public.profiles
SET
  subscription_tier = 'premium',
  subscription_status = 'active',
  subscription_period_start = NOW(),
  subscription_period_end = NOW() + INTERVAL '3 months'
WHERE
  early_adopter = true
  AND (subscription_tier IS NULL OR subscription_tier = 'free');

-- 2) Enforce album_tracks INSERT ownership at RLS level.
ALTER TABLE public.album_tracks ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'album_tracks'
      AND policyname = 'Users can only add tracks to their own albums'
  ) THEN
    CREATE POLICY "Users can only add tracks to their own albums"
      ON public.album_tracks
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.albums
          WHERE albums.id = album_tracks.album_id
            AND albums.creator_id = auth.uid()
        )
      );
  END IF;
END
$policy$;

-- 3) Queue server-side duration processing jobs for tracks with missing duration.
CREATE TABLE IF NOT EXISTS public.audio_track_duration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(track_id)
);

ALTER TABLE public.audio_track_duration_jobs ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audio_track_duration_jobs'
      AND policyname = 'Service role can manage duration jobs'
  ) THEN
    CREATE POLICY "Service role can manage duration jobs"
      ON public.audio_track_duration_jobs
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$policy$;

CREATE OR REPLACE FUNCTION public.queue_audio_track_duration_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.duration IS NULL OR NEW.duration <= 0 THEN
    INSERT INTO public.audio_track_duration_jobs (track_id, status, attempts, last_error, created_at, updated_at)
    VALUES (NEW.id, 'queued', 0, NULL, NOW(), NOW())
    ON CONFLICT (track_id) DO UPDATE
      SET status = 'queued',
          updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_queue_audio_track_duration_job ON public.audio_tracks;
CREATE TRIGGER trigger_queue_audio_track_duration_job
AFTER INSERT OR UPDATE OF duration ON public.audio_tracks
FOR EACH ROW
EXECUTE FUNCTION public.queue_audio_track_duration_job();

-- Backfill queue with existing tracks that still have duration missing.
INSERT INTO public.audio_track_duration_jobs (track_id, status, attempts, last_error, created_at, updated_at)
SELECT at.id, 'queued', 0, NULL, NOW(), NOW()
FROM public.audio_tracks at
WHERE COALESCE(at.duration, 0) <= 0
ON CONFLICT (track_id) DO NOTHING;

-- Keep album total_duration accurate when duration is corrected after upload.
CREATE OR REPLACE FUNCTION public.recompute_albums_for_track_duration_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.duration, 0) = COALESCE(OLD.duration, 0) THEN
    RETURN NEW;
  END IF;

  UPDATE public.albums a
  SET total_duration = COALESCE((
      SELECT SUM(COALESCE(t.duration, 0))
      FROM public.album_tracks at
      JOIN public.audio_tracks t ON t.id = at.track_id
      WHERE at.album_id = a.id
    ), 0),
    updated_at = NOW()
  WHERE a.id IN (
    SELECT at2.album_id
    FROM public.album_tracks at2
    WHERE at2.track_id = NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recompute_albums_on_track_duration_change ON public.audio_tracks;
CREATE TRIGGER trigger_recompute_albums_on_track_duration_change
AFTER UPDATE OF duration ON public.audio_tracks
FOR EACH ROW
EXECUTE FUNCTION public.recompute_albums_for_track_duration_change();
