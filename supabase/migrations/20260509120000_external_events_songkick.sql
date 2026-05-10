-- External Songkick events: cache table, optional sync logs, claim RPC, personalized discovery merge.

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  events_added INT NOT NULL DEFAULT 0,
  events_removed INT NOT NULL DEFAULT 0,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_external_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'songkick',
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DECIMAL(9, 6),
  longitude DECIMAL(9, 6),
  genre TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  ticket_url TEXT,
  image_url TEXT,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_by_user_id UUID REFERENCES profiles (id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_events_event_date ON external_events (event_date);
CREATE INDEX IF NOT EXISTS idx_external_events_is_claimed ON external_events (is_claimed);
CREATE INDEX IF NOT EXISTS idx_external_events_city ON external_events (city);
CREATE INDEX IF NOT EXISTS idx_external_events_source ON external_events (source);

ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read external events" ON external_events;
CREATE POLICY "Anyone can read external events" ON external_events FOR SELECT USING (true);

-- Claim: single transaction; only the authenticated user may claim for themselves.
CREATE OR REPLACE FUNCTION claim_external_event(p_external_event_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row external_events%ROWTYPE;
  v_new_event_id UUID;
  v_category event_category;
  v_location TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM external_events WHERE id = p_external_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.is_claimed THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED' USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    v_category := COALESCE(trim(v_row.genre), 'Other')::event_category;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_category := 'Other';
  END;

  v_location := trim(both ', ' FROM concat_ws(', ',
    NULLIF(trim(v_row.venue_name), ''),
    NULLIF(trim(v_row.venue_address), ''),
    NULLIF(trim(v_row.city), ''),
    NULLIF(trim(v_row.country), '')
  ));
  IF v_location = '' THEN
    v_location := COALESCE(NULLIF(trim(v_row.city), ''), 'Unknown');
  END IF;

  UPDATE external_events
  SET
    is_claimed = true,
    claimed_by_user_id = p_user_id,
    claimed_at = now(),
    updated_at = now()
  WHERE id = p_external_event_id;

  INSERT INTO events (
    creator_id,
    title,
    description,
    event_date,
    location,
    venue,
    city,
    country,
    latitude,
    longitude,
    category,
    image_url,
    price_gbp,
    price_ngn,
    current_attendees,
    status
  ) VALUES (
    p_user_id,
    v_row.title,
    format('Claimed from external listing. Headliner: %s', v_row.artist_name),
    v_row.event_date,
    v_location,
    v_row.venue_name,
    v_row.city,
    v_row.country,
    v_row.latitude,
    v_row.longitude,
    v_category,
    v_row.image_url,
    NULL,
    NULL,
    0,
    'active'
  )
  RETURNING id INTO v_new_event_id;

  RETURN v_new_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_external_event(UUID, UUID) TO authenticated;

-- Personalized events: SoundBridge + unclaimed external, tier ordering (local SB → local external → farther SB → farther external).
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
  relevance_score INTEGER,
  is_external BOOLEAN,
  ticket_url TEXT,
  artist_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF v_user_latitude IS NULL OR v_user_longitude IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH sb AS (
    SELECT
      e.id,
      e.title::text AS title,
      e.description::text AS description,
      e.event_date,
      e.location::text AS location,
      e.venue::text AS venue,
      e.city::text AS city,
      e.category::text AS category,
      e.price_gbp,
      e.price_ngn,
      e.max_attendees,
      e.current_attendees,
      e.image_url::text AS image_url,
      e.created_at,
      ROUND((
        6371 * acos(
          cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(v_user_longitude)) +
          sin(radians(v_user_latitude)) * sin(radians(e.latitude))
        )
      )::numeric, 1) AS distance_km,
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
                   WHEN 'Conference' THEN 'Conference'
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
      )::INTEGER AS relevance_score,
      false AS is_external,
      NULL::text AS ticket_url,
      NULL::text AS artist_name,
      CASE
        WHEN (
          6371 * acos(
            cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
            cos(radians(e.longitude) - radians(v_user_longitude)) +
            sin(radians(v_user_latitude)) * sin(radians(e.latitude))
          )
        ) <= 20 THEN 1
        ELSE 3
      END AS priority_tier
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
            WHEN 'Conference' THEN 'Conference'
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
  ),
  ex AS (
    SELECT
      ee.id,
      ee.title::text AS title,
      NULL::text AS description,
      ee.event_date,
      (ee.venue_name || ', ' || ee.city)::text AS location,
      ee.venue_name::text AS venue,
      ee.city::text AS city,
      COALESCE(ee.genre, 'Other')::text AS category,
      NULL::decimal AS price_gbp,
      NULL::decimal AS price_ngn,
      NULL::integer AS max_attendees,
      NULL::integer AS current_attendees,
      ee.image_url::text AS image_url,
      ee.created_at,
      ROUND((
        6371 * acos(
          cos(radians(v_user_latitude)) * cos(radians(ee.latitude)) *
          cos(radians(ee.longitude) - radians(v_user_longitude)) +
          sin(radians(v_user_latitude)) * sin(radians(ee.latitude))
        )
      )::numeric, 1) AS distance_km,
      (
        10 +
        CASE
          WHEN v_preferred_genres IS NOT NULL
               AND array_length(v_preferred_genres, 1) > 0
               AND (
                 CASE COALESCE(ee.genre, 'Other')::text
                   WHEN 'Gospel' THEN 'Gospel Concert'
                   WHEN 'Jazz' THEN 'Jazz Room'
                   WHEN 'Classical' THEN 'Instrumental'
                   WHEN 'Carnival' THEN 'Carnival'
                   WHEN 'Christian' THEN 'Gospel Concert'
                   WHEN 'Conference' THEN 'Conference'
                   WHEN 'Hip-Hop' THEN 'Music Concert'
                   WHEN 'Afrobeat' THEN 'Music Concert'
                   WHEN 'Rock' THEN 'Music Concert'
                   WHEN 'Pop' THEN 'Music Concert'
                   WHEN 'Secular' THEN 'Music Concert'
                   WHEN 'Other' THEN 'Other'
                   ELSE COALESCE(ee.genre, 'Other')::text
                 END
               ) = ANY(v_preferred_genres) THEN 50
          ELSE 0
        END +
        CASE
          WHEN v_user_latitude IS NOT NULL AND ee.latitude IS NOT NULL THEN
            GREATEST(0, 30 - ROUND((
              6371 * acos(
                cos(radians(v_user_latitude)) * cos(radians(ee.latitude)) *
                cos(radians(ee.longitude) - radians(v_user_longitude)) +
                sin(radians(v_user_latitude)) * sin(radians(ee.latitude))
              )
            )::numeric))::INTEGER
          ELSE 0
        END +
        GREATEST(0, 20 - EXTRACT(DAY FROM (ee.event_date - NOW())))::INTEGER
      )::INTEGER AS relevance_score,
      true AS is_external,
      ee.ticket_url::text AS ticket_url,
      ee.artist_name::text AS artist_name,
      CASE
        WHEN (
          6371 * acos(
            cos(radians(v_user_latitude)) * cos(radians(ee.latitude)) *
            cos(radians(ee.longitude) - radians(v_user_longitude)) +
            sin(radians(v_user_latitude)) * sin(radians(ee.latitude))
          )
        ) <= 20 THEN 2
        ELSE 4
      END AS priority_tier
    FROM external_events ee
    WHERE ee.event_date >= NOW()
      AND ee.is_claimed = false
      AND ee.latitude IS NOT NULL
      AND ee.longitude IS NOT NULL
      AND (
        6371 * acos(
          cos(radians(v_user_latitude)) * cos(radians(ee.latitude)) *
          cos(radians(ee.longitude) - radians(v_user_longitude)) +
          sin(radians(v_user_latitude)) * sin(radians(ee.latitude))
        )
      ) <= v_max_radius_km
      AND (
        v_preferred_genres IS NULL
        OR array_length(v_preferred_genres, 1) IS NULL
        OR (
          CASE COALESCE(ee.genre, 'Other')::text
            WHEN 'Gospel' THEN 'Gospel Concert'
            WHEN 'Jazz' THEN 'Jazz Room'
            WHEN 'Classical' THEN 'Instrumental'
            WHEN 'Carnival' THEN 'Carnival'
            WHEN 'Christian' THEN 'Gospel Concert'
            WHEN 'Conference' THEN 'Conference'
            WHEN 'Hip-Hop' THEN 'Music Concert'
            WHEN 'Afrobeat' THEN 'Music Concert'
            WHEN 'Rock' THEN 'Music Concert'
            WHEN 'Pop' THEN 'Music Concert'
            WHEN 'Secular' THEN 'Music Concert'
            WHEN 'Other' THEN 'Other'
            ELSE COALESCE(ee.genre, 'Other')::text
          END
        ) = ANY(v_preferred_genres)
      )
  ),
  merged AS (
    SELECT * FROM sb
    UNION ALL
    SELECT * FROM ex
  )
  SELECT
    merged.id,
    merged.title,
    merged.description,
    merged.event_date,
    merged.location,
    merged.venue,
    merged.city,
    merged.category,
    merged.price_gbp,
    merged.price_ngn,
    merged.max_attendees,
    merged.current_attendees,
    merged.image_url,
    merged.created_at,
    merged.distance_km,
    merged.relevance_score,
    merged.is_external,
    merged.ticket_url,
    merged.artist_name
  FROM merged
  ORDER BY merged.priority_tier ASC, merged.event_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_personalized_events(UUID, INTEGER, INTEGER) TO authenticated;
