-- Admin Dashboard API Queries
-- These are the specific SQL queries used by the dashboard APIs

-- 1. OVERVIEW API QUERIES (/api/admin/overview)

-- Get pending review queue items
SELECT * FROM admin_review_queue WHERE status = 'pending';

-- Get urgent items
SELECT * FROM admin_review_queue 
WHERE priority = 'urgent' AND status IN ('pending', 'assigned');

-- Get DMCA requests
SELECT * FROM admin_review_queue 
WHERE queue_type = 'dmca' AND status IN ('pending', 'assigned', 'in_review');

-- Get content reports
SELECT * FROM admin_review_queue 
WHERE queue_type = 'content_report' AND status IN ('pending', 'assigned', 'in_review');

-- Get total users
SELECT COUNT(*) FROM profiles;

-- Get active users (logged in within last 30 days)
SELECT COUNT(*) FROM profiles 
WHERE last_login_at >= NOW() - INTERVAL '30 days';

-- Get new users this week
SELECT COUNT(*) FROM profiles 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Get total tracks
SELECT COUNT(*) FROM audio_tracks 
WHERE deleted_at IS NULL;

-- Get total events
SELECT COUNT(*) FROM events 
WHERE deleted_at IS NULL;

-- Get total messages
SELECT COUNT(*) FROM messages;

-- Get revenue from ticket purchases
SELECT SUM(amount_paid) FROM ticket_purchases 
WHERE status = 'completed';

-- 2. USERS API QUERIES (/api/admin/users)

-- Get users with pagination and filtering
SELECT 
  id,
  username,
  display_name,
  email,
  role,
  avatar_url,
  created_at,
  updated_at,
  last_login_at,
  is_active,
  followers_count,
  following_count,
  banned_at,
  ban_reason
FROM profiles
WHERE 
  ($1 = '' OR username ILIKE '%' || $1 || '%' OR display_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
  AND ($2 = '' OR role = $2)
  AND ($3 = '' OR 
    ($3 = 'active' AND last_login_at >= NOW() - INTERVAL '30 days') OR
    ($3 = 'inactive' AND last_login_at < NOW() - INTERVAL '30 days')
  )
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- Get user count for pagination
SELECT COUNT(*) FROM profiles
WHERE 
  ($1 = '' OR username ILIKE '%' || $1 || '%' OR display_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
  AND ($2 = '' OR role = $2)
  AND ($3 = '' OR 
    ($3 = 'active' AND last_login_at >= NOW() - INTERVAL '30 days') OR
    ($3 = 'inactive' AND last_login_at < NOW() - INTERVAL '30 days')
  );

-- Get role distribution
SELECT role, COUNT(*) as count 
FROM profiles 
WHERE role IS NOT NULL 
GROUP BY role;

-- 3. USER DETAILS API QUERIES (/api/admin/users/[userId])

-- Get detailed user information
SELECT 
  id,
  username,
  display_name,
  email,
  avatar_url,
  bio,
  role,
  created_at,
  updated_at,
  last_login_at,
  is_active,
  followers_count,
  following_count,
  banned_at,
  ban_reason
FROM profiles
WHERE id = $1;

-- Get user's track count
SELECT COUNT(*) FROM audio_tracks 
WHERE creator_id = $1 AND deleted_at IS NULL;

-- Get user's event count
SELECT COUNT(*) FROM events 
WHERE organizer_id = $1 AND deleted_at IS NULL;

-- Get user's message count
SELECT COUNT(*) FROM messages 
WHERE sender_id = $1;

-- Get user's recent tracks
SELECT id, title, created_at, play_count, likes_count
FROM audio_tracks
WHERE creator_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- Get user's recent events
SELECT id, title, event_date, current_attendees, max_attendees
FROM events
WHERE organizer_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- Get reports against user
SELECT * FROM admin_review_queue
WHERE 
  (reference_data->>'reported_user_id' = $1) OR 
  (reference_data->>'complainant_id' = $1)
ORDER BY created_at DESC;

-- 4. ANALYTICS API QUERIES (/api/admin/analytics)

-- Get user growth data (time series)
SELECT created_at
FROM profiles
WHERE created_at >= $1
ORDER BY created_at ASC;

-- Get track uploads data (time series)
SELECT created_at
FROM audio_tracks
WHERE created_at >= $1 AND deleted_at IS NULL
ORDER BY created_at ASC;

-- Get event creation data (time series)
SELECT created_at
FROM events
WHERE created_at >= $1 AND deleted_at IS NULL
ORDER BY created_at ASC;

-- Get message activity data (time series)
SELECT created_at
FROM messages
WHERE created_at >= $1
ORDER BY created_at ASC;

-- Get revenue data (time series)
SELECT created_at, amount_paid
FROM ticket_purchases
WHERE created_at >= $1 AND status = 'completed'
ORDER BY created_at ASC;

-- Get subscription revenue (time series)
SELECT created_at, amount_paid
FROM user_subscriptions
WHERE created_at >= $1 AND status = 'active'
ORDER BY created_at ASC;

-- Get top creators by followers
SELECT id, username, display_name, followers_count, avatar_url
FROM profiles
WHERE followers_count IS NOT NULL
ORDER BY followers_count DESC
LIMIT 10;

-- Get most popular tracks
SELECT 
  at.id,
  at.title,
  at.play_count,
  at.likes_count,
  p.username,
  p.display_name
FROM audio_tracks at
JOIN profiles p ON at.creator_id = p.id
WHERE at.deleted_at IS NULL
ORDER BY at.play_count DESC
LIMIT 10;

-- Get most popular events
SELECT 
  e.id,
  e.title,
  e.current_attendees,
  e.max_attendees,
  p.username,
  p.display_name
FROM events e
JOIN profiles p ON e.organizer_id = p.id
WHERE e.deleted_at IS NULL
ORDER BY e.current_attendees DESC
LIMIT 10;

-- 5. SETTINGS API QUERIES (/api/admin/settings)

-- Get system settings
SELECT * FROM admin_settings WHERE id = 1;

-- Update system settings
INSERT INTO admin_settings (id, maintenance_mode, auto_moderation, email_notifications, ...)
VALUES (1, $1, $2, $3, ...)
ON CONFLICT (id) DO UPDATE SET
  maintenance_mode = EXCLUDED.maintenance_mode,
  auto_moderation = EXCLUDED.auto_moderation,
  email_notifications = EXCLUDED.email_notifications,
  updated_at = NOW();

-- Get database statistics
SELECT * FROM get_database_stats();

-- 6. USER ACTION QUERIES

-- Ban user
UPDATE profiles 
SET 
  is_active = false,
  banned_at = NOW(),
  ban_reason = $2
WHERE id = $1;

-- Unban user
UPDATE profiles 
SET 
  is_active = true,
  banned_at = NULL,
  ban_reason = NULL
WHERE id = $1;

-- Update user role
UPDATE profiles 
SET role = $2 
WHERE id = $1;

-- Update user status
UPDATE profiles 
SET is_active = $2 
WHERE id = $1;

-- 7. ADMIN ACCESS QUERIES

-- Check if user is admin
SELECT EXISTS(
  SELECT 1 FROM user_roles 
  WHERE user_id = $1 
  AND role IN ('admin', 'super_admin')
);

-- Get user roles
SELECT role FROM user_roles 
WHERE user_id = $1;

-- Grant admin role
INSERT INTO user_roles (user_id, role, granted_by)
VALUES ($1, 'admin', $2);

-- 8. PERFORMANCE OPTIMIZATION QUERIES

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_last_login_at ON profiles(last_login_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audio_tracks_creator_id ON audio_tracks(creator_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audio_tracks_created_at ON audio_tracks(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_purchases_created_at ON ticket_purchases(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_purchases_status ON ticket_purchases(status);
