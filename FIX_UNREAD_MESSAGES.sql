-- ================================================
-- Fix Unread Messages for Asibe Cheta
-- ================================================

-- STEP 1: Check current unread messages for Asibe Cheta
SELECT 
  id,
  sender_id,
  recipient_id,
  content,
  is_read,
  read_at,
  created_at
FROM messages
WHERE recipient_id = (SELECT id FROM profiles WHERE username = 'userbd8a455d' LIMIT 1)
  AND is_read = false
ORDER BY created_at DESC;

-- ================================================
-- STEP 2: Mark all messages TO Asibe Cheta as read
-- Run this to fix the unread count
-- ================================================

UPDATE messages
SET 
  is_read = true,
  read_at = NOW()
WHERE recipient_id = (SELECT id FROM profiles WHERE username = 'userbd8a455d' LIMIT 1)
  AND is_read = false;

-- ================================================
-- STEP 3: Verify - Check unread count after fix
-- ================================================

SELECT COUNT(*) as unread_count
FROM messages
WHERE recipient_id = (SELECT id FROM profiles WHERE username = 'userbd8a455d' LIMIT 1)
  AND is_read = false;

-- Should return: unread_count = 0

-- ================================================
-- ALTERNATIVE: If you know your user ID directly
-- ================================================

-- Check your user ID first:
-- SELECT id, username, display_name FROM profiles WHERE display_name = 'Asibe Cheta';

-- Then use the ID directly (replace YOUR_USER_ID):
/*
UPDATE messages
SET 
  is_read = true,
  read_at = NOW()
WHERE recipient_id = 'YOUR_USER_ID'
  AND is_read = false;
*/

-- ================================================
-- STEP 4: Check the message details
-- ================================================

SELECT 
  m.id,
  m.content,
  m.is_read,
  m.read_at,
  sender.username as sender_username,
  sender.display_name as sender_name,
  recipient.username as recipient_username,
  recipient.display_name as recipient_name
FROM messages m
LEFT JOIN profiles sender ON m.sender_id = sender.id
LEFT JOIN profiles recipient ON m.recipient_id = recipient.id
WHERE recipient.username = 'userbd8a455d'
ORDER BY m.created_at DESC
LIMIT 10;

