-- Web Notifications Table Schema
-- For in-app notifications system (Phase 1 of Express Interest feature)
-- This table stores notifications that users see when they're active on the web app

-- Create web_notifications table
CREATE TABLE IF NOT EXISTS web_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification details
  type TEXT NOT NULL, -- 'interest_received', 'interest_accepted', 'interest_rejected', 'opportunity_match'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional metadata (opportunity_id, interest_id, etc.)
  
  -- Status
  read BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_web_notifications_user_id ON web_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_web_notifications_read ON web_notifications(read);
CREATE INDEX IF NOT EXISTS idx_web_notifications_created_at ON web_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_notifications_user_read ON web_notifications(user_id, read);

-- Enable Row Level Security
ALTER TABLE web_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON web_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON web_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- System/service role can insert notifications
-- Note: This will be done via service role client in API routes
CREATE POLICY "Service role can insert notifications"
  ON web_notifications
  FOR INSERT
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON web_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE web_notifications IS 'In-app notifications for web users. Used for Express Interest feature notifications.';
COMMENT ON COLUMN web_notifications.type IS 'Type of notification: interest_received, interest_accepted, interest_rejected, opportunity_match';
COMMENT ON COLUMN web_notifications.data IS 'JSON object containing additional metadata like opportunity_id, interest_id, etc.';

