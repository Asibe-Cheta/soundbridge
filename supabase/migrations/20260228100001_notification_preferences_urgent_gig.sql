-- Urgent Gig notification toggles (w.md Phase D3; mobile alignment)
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS urgent_gig_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS urgent_gig_action_buttons_enabled BOOLEAN DEFAULT true;
