-- Google Calendar nudge tracking + notification timing preferences
-- See GOOGLE_CALENDAR_NUDGE.MD, MOBILE_TEAM_GOOGLE_CALENDAR_NUDGE_WEB_HANDOFF.MD

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calendar_nudge_shown_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_nudge_last_shown_at timestamptz;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS preferred_notification_times text[] DEFAULT ARRAY['any_time']::text[],
  ADD COLUMN IF NOT EXISTS event_planning_window text DEFAULT 'any_time',
  ADD COLUMN IF NOT EXISTS active_event_months integer[] DEFAULT ARRAY[]::integer[];

COMMENT ON COLUMN public.profiles.calendar_nudge_shown_count IS
  'How many times the Google Calendar connect nudge banner has been shown (max 2).';
COMMENT ON COLUMN public.profiles.calendar_nudge_last_shown_at IS
  'Last time the Google Calendar connect nudge banner was displayed.';

COMMENT ON COLUMN public.notification_preferences.preferred_notification_times IS
  'morning | afternoon | evening | any_time — when to deliver event notifications.';
COMMENT ON COLUMN public.notification_preferences.event_planning_window IS
  'last_minute | few_weeks | one_to_three_months | any_time — how far ahead user plans events.';
COMMENT ON COLUMN public.notification_preferences.active_event_months IS
  'Months 1-12 when user attends events; empty = year-round.';
