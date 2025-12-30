-- Create function to get user tracks statistics (replaces fetching all tracks)
-- This dramatically improves performance by doing aggregation in the database
-- instead of fetching all rows and processing in JavaScript

CREATE OR REPLACE FUNCTION get_user_tracks_stats(p_user_id UUID)
RETURNS TABLE (
  total_tracks BIGINT,
  total_plays BIGINT,
  total_likes BIGINT,
  music_uploads BIGINT,
  podcast_uploads BIGINT,
  total_storage_bytes BIGINT,
  last_upload_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tracks,
    COALESCE(SUM(play_count), 0)::BIGINT as total_plays,
    COALESCE(SUM(like_count), 0)::BIGINT as total_likes,
    COUNT(*) FILTER (WHERE track_type IS NULL OR track_type = 'music' OR track_type = 'song')::BIGINT as music_uploads,
    COUNT(*) FILTER (WHERE track_type = 'podcast')::BIGINT as podcast_uploads,
    COALESCE(SUM(file_size), 0)::BIGINT as total_storage_bytes,
    MAX(created_at) as last_upload_at
  FROM audio_tracks
  WHERE creator_id = p_user_id
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_tracks_stats(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_tracks_stats(UUID) IS 
  'Returns aggregated statistics for a user''s audio tracks. Used by /api/subscription/status to avoid fetching all tracks.';

