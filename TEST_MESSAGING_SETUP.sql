-- ================================================
-- SoundBridge Messaging System - Test Setup
-- ================================================

-- STEP 1: Check if profiles table exists and see its columns
-- Run this first to see what columns are available

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ================================================
-- STEP 2: Check if messages table exists
-- ================================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'messages' AND table_schema = 'public') as column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'messages';

-- ================================================
-- STEP 3: If messages table doesn't exist, create it
-- ================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'file', 'collaboration', 'system')),
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  attachment_url TEXT,
  attachment_type VARCHAR(100),
  attachment_name VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view messages where they are sender or recipient
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- RLS Policy: Users can insert messages as sender
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- RLS Policy: Users can update messages they received (mark as read)
DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;
CREATE POLICY "Users can mark messages as read"
  ON messages
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access to messages" ON messages;
CREATE POLICY "Service role full access to messages"
  ON messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- STEP 4: Verify messages table was created
-- ================================================

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- ================================================
-- STEP 5: Get user IDs for testing (using correct columns)
-- This query will work regardless of what columns profiles has
-- ================================================

SELECT 
  id,
  username,
  display_name,
  role
FROM profiles 
LIMIT 5;

-- ================================================
-- STEP 6: Create test messages
-- REPLACE THE USER IDs BELOW WITH ACTUAL IDs FROM STEP 5
-- ================================================

-- Example (replace with your actual user IDs):
/*
INSERT INTO messages (sender_id, recipient_id, content, message_type, is_read)
VALUES 
  -- Message 1: User A sends to User B
  (
    'USER_A_ID_HERE',  -- Replace with actual user ID
    'USER_B_ID_HERE',  -- Replace with actual user ID
    'Hey! This is a test message. How are you?',
    'text',
    false
  ),
  -- Message 2: User B replies to User A
  (
    'USER_B_ID_HERE',  -- Replace with actual user ID
    'USER_A_ID_HERE',  -- Replace with actual user ID
    'Hi! I''m doing great, thanks for asking! 😊',
    'text',
    false
  ),
  -- Message 3: User A sends another message
  (
    'USER_A_ID_HERE',  -- Replace with actual user ID
    'USER_B_ID_HERE',  -- Replace with actual user ID
    'Would you like to collaborate on a track?',
    'text',
    false
  );
*/

-- ================================================
-- STEP 7: Verify test messages were created
-- ================================================

SELECT 
  m.id,
  m.content,
  m.message_type,
  m.is_read,
  m.created_at,
  sender.username as sender_username,
  sender.display_name as sender_name,
  recipient.username as recipient_username,
  recipient.display_name as recipient_name
FROM messages m
LEFT JOIN profiles sender ON m.sender_id = sender.id
LEFT JOIN profiles recipient ON m.recipient_id = recipient.id
ORDER BY m.created_at DESC
LIMIT 10;

-- ================================================
-- STEP 8: Check unread message count for a user
-- REPLACE USER_ID_HERE with actual user ID
-- ================================================

/*
SELECT COUNT(*) as unread_count
FROM messages
WHERE recipient_id = 'USER_ID_HERE'
  AND is_read = FALSE;
*/

-- ================================================
-- SUCCESS! 
-- Your messaging system is now set up and ready to test
-- ================================================

