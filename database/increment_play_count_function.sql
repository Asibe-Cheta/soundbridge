-- =====================================================
-- Function to increment play count on audio tracks
-- =====================================================
-- Purpose: Increment play_count atomically for basic analytics
-- Used by: stream-event API endpoint
-- =====================================================

CREATE OR REPLACE FUNCTION increment_play_count(track_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE audio_tracks
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = track_id;
END;
$$;

COMMENT ON FUNCTION increment_play_count IS 'Atomically increments play_count for a track (used by stream event tracking)';
