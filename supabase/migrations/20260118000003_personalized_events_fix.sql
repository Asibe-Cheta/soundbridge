-- Personalized Events - Strict location-only logic
-- Date: January 18, 2026
-- Purpose: Avoid fallback results; only show truly nearby events
-- Drop first because return type (RETURNS TABLE) changes; CREATE OR REPLACE cannot change return type
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
  city TEXT,
  category TEXT,
  price_gbp DECIMAL,
  price_ngn DECIMAL,
  max_attendees INTEGER,
  current_attendees INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  distance_km DECIMAL,
  relevance_score INTEGER
) AS $$
DECLARE
  v_user_latitude DECIMAL;
  v_user_longitude DECIMAL;
  v_preferred_genres TEXT[];
  v_max_radius_km INTEGER := 100;
BEGIN
  SELECT
    p.latitude,
    p.longitude,
    np.preferred_event_genres
  INTO
    v_user_latitude,
    v_user_longitude,
    v_preferred_genres
  FROM profiles p
  LEFT JOIN user_notification_preferences np ON np.user_id = p.id
  WHERE p.id = p_user_id;

  -- Strict: no location, no results
  IF v_user_latitude IS NULL OR v_user_longitude IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.title::text,
    e.description::text,
    e.event_date,
    e.location::text,
    e.venue::text,
    e.city::text,
    e.category::text,
    e.price_gbp,
    e.price_ngn,
    e.max_attendees,
    e.current_attendees,
    e.image_url::text,
    e.created_at,
    CASE
      WHEN v_user_latitude IS NOT NULL AND v_user_longitude IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL THEN
        ROUND((
          6371 * acos(
            cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
            cos(radians(e.longitude) - radians(v_user_longitude)) +
            sin(radians(v_user_latitude)) * sin(radians(e.latitude))
          )
        )::numeric, 1)
      ELSE NULL
    END AS distance_km,
    (
      10 +
      CASE
        WHEN v_preferred_genres IS NOT NULL
             AND array_length(v_preferred_genres, 1) > 0
             AND (
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
             ) = ANY(v_preferred_genres) THEN 50
        ELSE 0
      END +
      CASE
        WHEN v_user_latitude IS NOT NULL AND e.latitude IS NOT NULL THEN
          GREATEST(0, 30 - ROUND((
            6371 * acos(
              cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
              cos(radians(e.longitude) - radians(v_user_longitude)) +
              sin(radians(v_user_latitude)) * sin(radians(e.latitude))
            )
          )::numeric))::INTEGER
        ELSE 0
      END +
      GREATEST(0, 20 - EXTRACT(DAY FROM (e.event_date - NOW())))::INTEGER
    ) AS relevance_score
  FROM events e
  WHERE e.event_date >= NOW()
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
        cos(radians(e.longitude) - radians(v_user_longitude)) +
        sin(radians(v_user_latitude)) * sin(radians(e.latitude))
      )
    ) <= v_max_radius_km
    AND (
      v_preferred_genres IS NULL
      OR array_length(v_preferred_genres, 1) IS NULL
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
    distance_km NULLS LAST,
    e.event_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
