-- ================================================
-- Fix Unread Messages - Works for ANY User
-- ================================================

-- STEP 1: Check current unread messages for a specific user
-- Replace 'YOUR_USERNAME' or 'YOUR_USER_ID' with actual values
SELECT 
  id,
  sender_id,
  recipient_id,
  content,
  is_read,
  created_at
FROM messages
WHERE recipient_id = (SELECT id FROM profiles WHERE username = 'userbd8a455d' LIMIT 1)
  AND is_read = false
ORDER BY created_at DESC;

-- ================================================
-- STEP 2: Mark messages as read (without read_at if column doesn't exist)
-- Run this to fix the unread count
-- ================================================

UPDATE messages
SET is_read = true
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
-- UNIVERSAL FIX: Mark ALL unread messages as read for ANY user
-- ================================================

-- Option 1: By username
/*
UPDATE messages
SET is_read = true
WHERE recipient_id = (SELECT id FROM profiles WHERE username = 'YOUR_USERNAME' LIMIT 1)
  AND is_read = false;
*/

-- Option 2: By user ID (if you know it)
/*
UPDATE messages
SET is_read = true
WHERE recipient_id = 'YOUR_USER_ID'
  AND is_read = false;
*/

-- Option 3: By display name
/*
UPDATE messages
SET is_read = true
WHERE recipient_id = (SELECT id FROM profiles WHERE display_name = 'Your Display Name' LIMIT 1)
  AND is_read = false;
*/

-- ================================================
-- STEP 4: Check message details for any user
-- ================================================

SELECT 
  m.id,
  m.content,
  m.is_read,
  m.created_at,
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

-- ================================================
-- BONUS: Check unread counts for ALL users
-- ================================================

SELECT 
  p.username,
  p.display_name,
  COUNT(*) as unread_count
FROM messages m
JOIN profiles p ON m.recipient_id = p.id
WHERE m.is_read = false
GROUP BY p.id, p.username, p.display_name
ORDER BY unread_count DESC;

