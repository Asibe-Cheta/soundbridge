-- Onboarding: Event Organiser user type and profile columns
-- @see WEB_TEAM_ONBOARDING_ENHANCEMENTS.MD

-- Add preferred_event_types (array of event type IDs: concerts, club_nights, etc.)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_event_types JSONB DEFAULT '[]'::jsonb;

-- Add event_reach (local | regional | national | international)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS event_reach VARCHAR(20);

COMMENT ON COLUMN profiles.preferred_event_types IS 'Event organiser onboarding: selected event type IDs (e.g. concerts, workshops)';
COMMENT ON COLUMN profiles.event_reach IS 'Event organiser onboarding: reach scope - local, regional, national, international';
