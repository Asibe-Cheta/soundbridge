-- Add institution_badge (and is_verified, for badge-adjacent display) to the
-- get_creators_with_stats RPC used by the discover surface.
-- Return type changes require dropping and recreating the function.
DROP FUNCTION IF EXISTS get_creators_with_stats(INT);

CREATE FUNCTION get_creators_with_stats(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  social_links JSONB,
  role TEXT,
  location TEXT,
  country TEXT,
  genre TEXT,
  is_verified BOOLEAN,
  institution_badge TEXT,
  followers_count BIGINT,
  tracks_count BIGINT,
  events_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.banner_url,
    p.website_url,
    p.social_links,
    p.role,
    p.location,
    p.country,
    p.genre,
    p.is_verified,
    p.institution_badge,
    COALESCE(f.followers_count, 0) AS followers_count,
    COALESCE(t.tracks_count, 0) AS tracks_count,
    COALESCE(e.events_count, 0) AS events_count,
    p.created_at
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS followers_count
    FROM follows
    WHERE following_id = p.id
  ) f ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS tracks_count
    FROM audio_tracks
    WHERE creator_id = p.id AND is_public = true
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS events_count
    FROM events
    WHERE creator_id = p.id
  ) e ON true
  WHERE p.role = 'creator'
  ORDER BY f.followers_count DESC, t.tracks_count DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_creators_with_stats(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_creators_with_stats(INT) TO anon;
