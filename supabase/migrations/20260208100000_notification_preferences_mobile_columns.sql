-- Notification Preferences - Add columns required by mobile app
-- Ref: WEB_TEAM_NOTIFICATIONS_PREFERENCES.md (Feb 8, 2026)
-- Fixes: "Could not find the 'enabled' column..." so mobile can persist preferences

-- Ensure notification_preferences exists (may have been created with different schema)
-- Add missing columns; mobile upserts with these names

-- Master toggle
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Schedule (integer hours 0-23; mobile uses these for active window)
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS start_hour INTEGER DEFAULT 8;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS end_hour INTEGER DEFAULT 22;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Per-type toggles
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS event_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS message_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS tip_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS collaboration_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS wallet_notifications_enabled BOOLEAN DEFAULT true;

-- Location columns for proximity matching
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS location_city TEXT;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS location_state TEXT;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS location_country TEXT;

-- preferred_event_genres (TEXT[]) - mobile sends e.g. ['Music Concert', 'Gospel Concert']
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS preferred_event_genres TEXT[];

-- preferred_event_categories (keep if exists; doc says both exist)
-- ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS preferred_event_categories TEXT[];
-- (Often same table has one or the other; add only if missing. Check existing schema.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'preferred_event_categories'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN preferred_event_categories TEXT[];
  END IF;
END $$;

-- Timestamp
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for notification matching
CREATE INDEX IF NOT EXISTS idx_notification_preferences_events_enabled
ON notification_preferences(user_id, enabled, event_notifications_enabled)
WHERE enabled = true AND event_notifications_enabled = true;
