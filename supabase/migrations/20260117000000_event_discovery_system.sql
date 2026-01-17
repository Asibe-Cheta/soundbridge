-- Event Discovery System - Core Tables & Functions
-- Date: January 17, 2026
-- Purpose: Personalized event discovery (location + preferences + behavior)

-- -----------------------------------------------------
-- Profiles: store user coordinates for proximity filtering
-- -----------------------------------------------------
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- -----------------------------------------------------
-- Notification preferences: ensure required columns exist
-- -----------------------------------------------------
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS preferred_event_genres TEXT[] DEFAULT '{}';

ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS event_notifications_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS notification_start_hour INTEGER DEFAULT 8;

ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS notification_end_hour INTEGER DEFAULT 22;

-- -----------------------------------------------------
-- Layer 3: User genre behavior tracking
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS user_genre_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  play_count INTEGER DEFAULT 0,
  total_listen_time_seconds INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, genre)
);

CREATE INDEX IF NOT EXISTS idx_user_genre_behavior_user_id ON user_genre_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_genre_behavior_genre ON user_genre_behavior(genre);

-- -----------------------------------------------------
-- Layer 5: Scheduled notifications
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'two_weeks', 'one_week', '24_hours', 'event_day'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, processing, sent, failed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending
ON scheduled_notifications(scheduled_for)
WHERE status = 'pending';

-- -----------------------------------------------------
-- Layer 1: Find users to notify for a new event
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION notify_users_for_new_event(
  p_event_id UUID,
  p_event_category TEXT,
  p_event_latitude DECIMAL,
  p_event_longitude DECIMAL,
  p_notification_radius_km INTEGER DEFAULT 25
)
RETURNS TABLE(user_id UUID, distance_km DECIMAL) AS $$
DECLARE
  v_mapped_category TEXT;
BEGIN
  v_mapped_category := CASE p_event_category
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
    ELSE p_event_category
  END;

  RETURN QUERY
  SELECT
    p.id as user_id,
    (
      6371 * acos(
        cos(radians(p_event_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_event_longitude)) +
        sin(radians(p_event_latitude)) * sin(radians(p.latitude))
      )
    )::numeric as distance_km
  FROM profiles p
  JOIN user_notification_preferences np ON np.user_id = p.id
  WHERE
    p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND np.event_notifications_enabled = TRUE
    AND (
      np.preferred_event_genres IS NULL
      OR array_length(np.preferred_event_genres, 1) = 0
      OR v_mapped_category = ANY(np.preferred_event_genres)
    )
    AND (
      6371 * acos(
        cos(radians(p_event_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_event_longitude)) +
        sin(radians(p_event_latitude)) * sin(radians(p.latitude))
      )
    )::numeric <= p_notification_radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION notify_users_for_new_event(UUID, TEXT, DECIMAL, DECIMAL, INTEGER) TO authenticated;

-- -----------------------------------------------------
-- Layer 2-4: Personalized event discovery
-- -----------------------------------------------------
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
  v_max_radius_km INTEGER := 50;
BEGIN
  SELECT latitude, longitude, preferred_event_distance
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
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.venue,
    e.city,
    e.category::text,
    e.price_gbp,
    e.price_ngn,
    e.max_attendees,
    e.current_attendees,
    e.image_url,
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
    END as distance_km,
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
          )::numeric))
        ELSE 0
      END +
      GREATEST(0, 20 - EXTRACT(DAY FROM (e.event_date - NOW())))::INTEGER +
      CASE
        WHEN EXISTS (
          SELECT 1 FROM user_genre_behavior ugb
          WHERE ugb.user_id = p_user_id
          AND ugb.genre = e.category::text
          AND ugb.play_count >= 10
        ) THEN 40
        ELSE 0
      END +
      CASE
        WHEN EXISTS (
          SELECT 1 FROM ticket_purchases tp
          WHERE tp.user_id = p_user_id
          AND tp.payment_status = 'succeeded'
        ) THEN 25
        ELSE 0
      END +
      CASE
        WHEN EXISTS (
          SELECT 1 FROM ticket_purchases tp
          JOIN events prev_e ON prev_e.id = tp.event_id
          WHERE tp.user_id = p_user_id
          AND tp.payment_status = 'succeeded'
          AND prev_e.category = e.category
        ) THEN 35
        ELSE 0
      END
    ) as relevance_score
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
  ORDER BY
    relevance_score DESC,
    e.event_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_personalized_events(UUID, INTEGER, INTEGER) TO authenticated;

-- -----------------------------------------------------
-- Layer 5: Scheduling reminders for upcoming events
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION schedule_event_notifications(
  p_event_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_event RECORD;
  v_user RECORD;
  v_scheduled_count INTEGER := 0;
BEGIN
  BEGIN
    SELECT * INTO v_event FROM events WHERE id = p_event_id;

    IF v_event IS NULL THEN
      RETURN 0;
    END IF;

    FOR v_user IN
      SELECT user_id, distance_km
      FROM notify_users_for_new_event(
        p_event_id,
        v_event.category::text,
        v_event.latitude,
        v_event.longitude,
        50
      )
    LOOP
      IF v_event.event_date > NOW() + INTERVAL '14 days' THEN
        INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
        VALUES (v_user.user_id, p_event_id, 'two_weeks', v_event.event_date - INTERVAL '14 days')
        ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;
        v_scheduled_count := v_scheduled_count + 1;
      END IF;

      IF v_event.event_date > NOW() + INTERVAL '7 days' THEN
        INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
        VALUES (v_user.user_id, p_event_id, 'one_week', v_event.event_date - INTERVAL '7 days')
        ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;
        v_scheduled_count := v_scheduled_count + 1;
      END IF;

      IF v_event.event_date > NOW() + INTERVAL '1 day' THEN
        INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
        VALUES (v_user.user_id, p_event_id, '24_hours', v_event.event_date - INTERVAL '1 day')
        ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;
        v_scheduled_count := v_scheduled_count + 1;
      END IF;

      INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
      VALUES (v_user.user_id, p_event_id, 'event_day', DATE_TRUNC('day', v_event.event_date) + INTERVAL '9 hours')
      ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;
      v_scheduled_count := v_scheduled_count + 1;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- Never block event creation due to scheduling errors
    RETURN v_scheduled_count;
  END;

  RETURN v_scheduled_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_schedule_event_notifications()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM schedule_event_notifications(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Do not fail event creation if scheduling fails
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_event_insert_schedule_notifications ON events;
CREATE TRIGGER after_event_insert_schedule_notifications
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION trigger_schedule_event_notifications();

GRANT EXECUTE ON FUNCTION schedule_event_notifications(UUID) TO authenticated;

-- -----------------------------------------------------
-- Cron worker for pending notifications (placeholder)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_notification RECORD;
  v_processed_count INTEGER := 0;
BEGIN
  FOR v_notification IN
    SELECT sn.*, e.title as event_title, e.event_date, e.location, e.category,
           p.expo_push_token, np.notification_start_hour, np.notification_end_hour
    FROM scheduled_notifications sn
    JOIN events e ON e.id = sn.event_id
    JOIN profiles p ON p.id = sn.user_id
    LEFT JOIN user_notification_preferences np ON np.user_id = sn.user_id
    WHERE sn.status = 'pending'
    AND sn.scheduled_for <= NOW()
    AND EXTRACT(HOUR FROM NOW()) >= COALESCE(np.notification_start_hour, 8)
    AND EXTRACT(HOUR FROM NOW()) <= COALESCE(np.notification_end_hour, 22)
    LIMIT 100
  LOOP
    UPDATE scheduled_notifications
    SET status = 'processing'
    WHERE id = v_notification.id;

    -- TODO: integrate push notification service

    UPDATE scheduled_notifications
    SET status = 'sent', sent_at = NOW()
    WHERE id = v_notification.id;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION process_pending_notifications() TO authenticated;
