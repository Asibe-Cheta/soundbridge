-- Ensure audio_tracks.isrc_code supports SoundBridge generated format GB-KTZ-YY-NNNNN
-- (15 chars). Use 32 for future compatibility.

ALTER TABLE public.audio_tracks
  ALTER COLUMN isrc_code TYPE VARCHAR(32);
