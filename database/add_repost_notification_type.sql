-- ============================================================
-- ADD 'REPOST' TO NOTIFICATION TYPES
-- ============================================================
-- Date: December 20, 2025
-- Purpose: Enable repost notifications
-- 
-- This migration updates the notifications table to allow 'repost' type.
-- ============================================================

-- Check if using CHECK constraint (older schema)
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_type_check'
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications 
    DROP CONSTRAINT notifications_type_check;
    
    -- Add new constraint with 'repost' included
    ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('follow', 'like', 'comment', 'share', 'repost', 'collaboration', 'collaboration_request', 'event', 'system', 'post_reaction', 'post_comment', 'comment_reply', 'connection_request', 'connection_accepted'));
    
    RAISE NOTICE 'Updated notifications_type_check constraint to include repost';
  ELSE
    RAISE NOTICE 'notifications_type_check constraint not found - may be using enum type or different constraint name';
  END IF;
END $$;

-- If using notification_logs table (newer system)
DO $$ 
BEGIN
  -- Check if notification_logs table exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'notification_logs'
  ) THEN
    -- Drop existing constraint if it exists
    IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'notification_logs_notification_type_check'
      AND table_name = 'notification_logs'
    ) THEN
      ALTER TABLE notification_logs 
      DROP CONSTRAINT notification_logs_notification_type_check;
      
      -- Add new constraint with 'repost' included
      ALTER TABLE notification_logs
      ADD CONSTRAINT notification_logs_notification_type_check 
      CHECK (notification_type IN ('follow', 'like', 'comment', 'share', 'repost', 'collaboration', 'collaboration_request', 'event', 'system', 'post_reaction', 'post_comment', 'comment_reply', 'connection_request', 'connection_accepted'));
      
      RAISE NOTICE 'Updated notification_logs_notification_type_check constraint to include repost';
    ELSE
      RAISE NOTICE 'notification_logs_notification_type_check constraint not found';
    END IF;
  ELSE
    RAISE NOTICE 'notification_logs table does not exist';
  END IF;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to verify:
-- 
-- -- Check notifications table constraint
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name LIKE '%notification%type%';
-- 
-- -- Try inserting a test notification (then delete it)
-- INSERT INTO notifications (user_id, type, title, message)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'repost', 'Test', 'Test')
-- ON CONFLICT DO NOTHING;
-- 
-- DELETE FROM notifications WHERE type = 'repost' AND title = 'Test';

-- ============================================================
-- NOTES
-- ============================================================
-- - This script is idempotent (safe to run multiple times)
-- - Handles both notifications and notification_logs tables
-- - Includes all known notification types for completeness

