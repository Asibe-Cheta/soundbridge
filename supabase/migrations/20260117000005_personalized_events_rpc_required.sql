-- Personalized Events RPC - Required safety migration
-- Ensures required columns exist and refreshes the RPC definition.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS preferred_event_distance INTEGER DEFAULT 50;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS preferred_event_genres TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS event_notifications_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_start_hour INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS notification_end_hour INTEGER DEFAULT 22;

DROP FUNCTION IF EXISTS get_personalized_events(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  venue TEXT,
  category TEXT,
  price_gbp NUMERIC,
  price_ngn NUMERIC,
  max_attendees INTEGER,
  current_attendees INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_latitude DECIMAL;
  v_user_longitude DECIMAL;
  v_preferred_genres TEXT[];
  v_max_radius_km INTEGER := 50;
BEGIN
  SELECT
    latitude,
    longitude,
    COALESCE(preferred_event_distance, 50)
  INTO v_user_latitude, v_user_longitude, v_max_radius_km
  FROM profiles
  WHERE profiles.id = p_user_id;

  SELECT preferred_event_genres
  INTO v_preferred_genres
  FROM user_notification_preferences
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    e.id,
    e.title::text,
    e.description::text,
    e.event_date,
    e.location::text,
    e.venue::text,
    e.category::text,
    e.price_gbp,
    e.price_ngn,
    e.max_attendees,
    e.current_attendees,
    e.image_url::text,
    e.created_at
  FROM events e
  WHERE
    e.event_date >= NOW()
    AND (
      v_user_latitude IS NULL
      OR v_user_longitude IS NULL
      OR e.latitude IS NULL
      OR e.longitude IS NULL
      OR (
        6371 * acos(
          cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(v_user_longitude)) +
          sin(radians(v_user_latitude)) * sin(radians(e.latitude))
        )
      ) <= v_max_radius_km
    )
    AND (
      v_preferred_genres IS NULL
      OR array_length(v_preferred_genres, 1) = 0
      OR (
        CASE e.category::text
          WHEN 'Gospel' THEN 'Gospel Concert'
          WHEN 'Jazz' THEN 'Jazz Room'
          WHEN 'Classical' THEN 'Instrumental'
          WHEN 'Carnival' THEN 'Carnival'
          WHEN 'Christian' THEN 'Gospel Concert'
          WHEN 'Hip-Hop' THEN 'Music Concert'
          WHEN 'Afrobeat' THEN 'Music Concert'
          WHEN 'Rock' THEN 'Music Concert'
          WHEN 'Pop' THEN 'Music Concert'
          WHEN 'Secular' THEN 'Music Concert'
          WHEN 'Other' THEN 'Other'
          ELSE e.category::text
        END
      ) = ANY(v_preferred_genres)
    )
  ORDER BY
    e.event_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_personalized_events(UUID, INTEGER, INTEGER) TO authenticated;
