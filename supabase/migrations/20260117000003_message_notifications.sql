-- Message Notifications - Required columns
-- Date: January 17, 2026

ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS message_notifications_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS data JSONB;
