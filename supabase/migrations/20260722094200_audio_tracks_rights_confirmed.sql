-- Mandatory rights-confirmation checkbox on upload (LEGAL_CONFIRMATION.MD).
-- Creator affirmatively confirms ownership/licence of the recording (masters)
-- and underlying composition (publishing) at the point of upload. Applies
-- going forward only — not backfilled onto existing uploads.

ALTER TABLE public.audio_tracks
  ADD COLUMN IF NOT EXISTS rights_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE public.audio_tracks
  ADD COLUMN IF NOT EXISTS rights_confirmed_at timestamptz;

COMMENT ON COLUMN public.audio_tracks.rights_confirmed IS
  'Creator affirmatively confirmed at upload time that they own or hold the rights to distribute this recording and its underlying composition.';
COMMENT ON COLUMN public.audio_tracks.rights_confirmed_at IS
  'Timestamp of the rights_confirmed affirmation, recorded at upload time.';
