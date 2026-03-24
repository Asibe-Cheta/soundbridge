-- sync_audio_urls was previously only in FIX_PERSONALIZED_DISCOVERY_SCHEMA.sql (not migrated).
-- This migration installs it for Supabase CLI / hosted deploys.
--
-- Behavior:
-- - INSERT/UPDATE: if only one of (file_url, audio_url) is set, copy to the other (original logic).
-- - INSERT/UPDATE: if both are set but differ, treat file_url as canonical → set audio_url = file_url
--   (covers R2 migration and any backend that updates file_url only).
-- Same pattern for cover_art_url ↔ artwork_url.

ALTER TABLE public.audio_tracks
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

ALTER TABLE public.audio_tracks
  ADD COLUMN IF NOT EXISTS artwork_url TEXT;

CREATE OR REPLACE FUNCTION public.sync_audio_urls()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.file_url IS NOT NULL AND NEW.audio_url IS NULL THEN
    NEW.audio_url := NEW.file_url;
  ELSIF NEW.audio_url IS NOT NULL AND NEW.file_url IS NULL THEN
    NEW.file_url := NEW.audio_url;
  END IF;

  IF NEW.file_url IS NOT NULL
     AND NEW.audio_url IS NOT NULL
     AND NEW.audio_url IS DISTINCT FROM NEW.file_url THEN
    NEW.audio_url := NEW.file_url;
  END IF;

  IF NEW.cover_art_url IS NOT NULL AND NEW.artwork_url IS NULL THEN
    NEW.artwork_url := NEW.cover_art_url;
  ELSIF NEW.artwork_url IS NOT NULL AND NEW.cover_art_url IS NULL THEN
    NEW.cover_art_url := NEW.artwork_url;
  END IF;

  IF NEW.cover_art_url IS NOT NULL
     AND NEW.artwork_url IS NOT NULL
     AND NEW.artwork_url IS DISTINCT FROM NEW.cover_art_url THEN
    NEW.artwork_url := NEW.cover_art_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_audio_urls_trigger ON public.audio_tracks;

CREATE TRIGGER sync_audio_urls_trigger
  BEFORE INSERT OR UPDATE ON public.audio_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_audio_urls();

-- One-time alignment after R2 (and any historical drift). Idempotent.
UPDATE public.audio_tracks
SET audio_url = file_url
WHERE file_url IS NOT NULL
  AND (audio_url IS DISTINCT FROM file_url);

UPDATE public.audio_tracks
SET artwork_url = cover_art_url
WHERE cover_art_url IS NOT NULL
  AND (artwork_url IS DISTINCT FROM cover_art_url);
