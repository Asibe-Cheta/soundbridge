-- Mobile nudge persistence + creator self-read policies + track notification queue
-- Date: 2026-04-30

-- 1) Nudge dismissal state columns (mobile blocker)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS nudge_event_30day_dismissed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS nudge_event_never_dismissed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS nudge_first_track_dismissed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS nudge_venue_search_dismissed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS nudge_gig_post_dismissed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS nudge_collaborator_dismissed BOOLEAN NOT NULL DEFAULT false;

-- 2) RLS: ensure creators can read their own events/tracks for nudge checks
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Creators can view own events'
  ) THEN
    CREATE POLICY "Creators can view own events"
      ON events
      FOR SELECT
      USING (creator_id = auth.uid() OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audio_tracks'
      AND policyname = 'Creators can view own audio tracks'
  ) THEN
    CREATE POLICY "Creators can view own audio tracks"
      ON audio_tracks
      FOR SELECT
      USING (creator_id = auth.uid() OR auth.role() = 'service_role');
  END IF;
END $$;

-- 3) Track push queue (same pattern as event_notifications)
CREATE TABLE IF NOT EXISTS track_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES audio_tracks(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'track_release',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  expo_ticket_id TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, track_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_track_notifications_status_scheduled
  ON track_notifications(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_track_notifications_user
  ON track_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_track_notifications_track
  ON track_notifications(track_id);

CREATE OR REPLACE FUNCTION trg_track_notifications_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_notifications_set_updated_at ON track_notifications;
CREATE TRIGGER trg_track_notifications_set_updated_at
BEFORE UPDATE ON track_notifications
FOR EACH ROW
EXECUTE FUNCTION trg_track_notifications_set_updated_at();

CREATE OR REPLACE FUNCTION get_matching_users_for_track(
  p_track_id UUID
)
RETURNS TABLE (
  user_id UUID,
  push_token TEXT,
  quiet_hours_enabled BOOLEAN,
  quiet_hours_start TIME,
  quiet_hours_end TIME
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_track_genre TEXT;
  v_track_creator UUID;
BEGIN
  SELECT
    at.genre,
    at.creator_id
  INTO
    v_track_genre,
    v_track_creator
  FROM audio_tracks at
  WHERE at.id = p_track_id;

  IF v_track_creator IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    COALESCE(upt.push_token, p.expo_push_token) AS push_token,
    COALESCE(np.quiet_hours_enabled, false) AS quiet_hours_enabled,
    COALESCE(np.quiet_hours_start, '22:00'::TIME) AS quiet_hours_start,
    COALESCE(np.quiet_hours_end, '08:00'::TIME) AS quiet_hours_end
  FROM profiles p
  LEFT JOIN user_notification_preferences np ON np.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT upt_src.push_token
    FROM user_push_tokens upt_src
    WHERE upt_src.user_id = p.id
      AND COALESCE(
        (to_jsonb(upt_src)->>'active')::BOOLEAN,
        (to_jsonb(upt_src)->>'is_active')::BOOLEAN,
        true
      ) = true
    ORDER BY upt_src.last_used_at DESC NULLS LAST
    LIMIT 1
  ) upt ON TRUE
  WHERE
    p.id <> v_track_creator
    AND COALESCE(np.event_notifications_enabled, true) = true
    AND COALESCE(upt.push_token, p.expo_push_token) IS NOT NULL
    AND (
      v_track_genre IS NULL
      OR np.preferred_event_genres IS NULL
      OR array_length(np.preferred_event_genres, 1) IS NULL
      OR EXISTS (
        SELECT 1
        FROM unnest(np.preferred_event_genres) AS pref
        WHERE
          LOWER(pref) = LOWER(v_track_genre)
          OR (LOWER(pref) = 'music concert' AND LOWER(v_track_genre) IN ('hip-hop', 'afrobeat', 'rock', 'pop', 'secular'))
          OR (LOWER(pref) = 'gospel concert' AND LOWER(v_track_genre) IN ('gospel', 'christian'))
      )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_matching_users_for_track(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_matching_users_for_track(UUID) TO service_role;
