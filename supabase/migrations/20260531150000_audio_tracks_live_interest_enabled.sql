-- Live interest flag on audio_tracks (mobile + web upload, listener prompt gating)
ALTER TABLE public.audio_tracks
  ADD COLUMN IF NOT EXISTS live_interest_enabled boolean NOT NULL DEFAULT true;

UPDATE public.audio_tracks
SET live_interest_enabled = true
WHERE live_interest_enabled = false;

COMMENT ON COLUMN public.audio_tracks.live_interest_enabled IS
  'When true, listeners may see the live interest prompt after repeat listens on this track.';
