-- Scheduled Notifications - Add delivery metadata columns
-- Date: January 17, 2026

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS body TEXT;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS expo_receipt_id TEXT;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS error TEXT;
