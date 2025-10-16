-- Event Push Notifications Schema for SoundBridge
-- Complete database schema for mobile push notifications on featured events
-- Date: October 16, 2025

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. USER PUSH TOKENS TABLE
-- ==========================================
-- Stores Expo push tokens for mobile devices
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
    device_name TEXT,
    device_id TEXT,
    app_version TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one token per device
    UNIQUE(user_id, device_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON user_push_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON user_push_tokens(push_token);

-- ==========================================
-- 2. USER EVENT PREFERENCES TABLE
-- ==========================================
-- Stores user preferences for event notifications
CREATE TABLE IF NOT EXISTS user_event_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Notification settings
    push_notifications_enabled BOOLEAN DEFAULT true,
    email_notifications_enabled BOOLEAN DEFAULT false,
    
    -- Location preferences (in kilometers)
    notification_radius_km INTEGER DEFAULT 25 CHECK (notification_radius_km IN (5, 10, 25, 50, 100, 200)),
    use_device_location BOOLEAN DEFAULT true,
    custom_latitude DECIMAL(10, 8),
    custom_longitude DECIMAL(11, 8),
    custom_location_name TEXT,
    
    -- Event category preferences (array of category names matching event_category enum)
    event_categories TEXT[] DEFAULT ARRAY['Christian', 'Gospel', 'Afrobeat']::TEXT[],
    
    -- Timing preferences
    notification_advance_days INTEGER DEFAULT 7 CHECK (notification_advance_days IN (1, 3, 7, 14, 30)),
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    quiet_hours_enabled BOOLEAN DEFAULT true,
    
    -- Frequency control
    max_notifications_per_week INTEGER DEFAULT 3 CHECK (max_notifications_per_week BETWEEN 1 AND 10),
    last_notification_sent_at TIMESTAMPTZ,
    notifications_sent_this_week INTEGER DEFAULT 0,
    week_start_date DATE DEFAULT CURRENT_DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_user_id ON user_event_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_push_enabled ON user_event_preferences(push_notifications_enabled) WHERE push_notifications_enabled = true;
-- Note: PostGIS spatial index would require geometry column, using standard indexes instead
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_latitude ON user_event_preferences(custom_latitude) WHERE custom_latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_longitude ON user_event_preferences(custom_longitude) WHERE custom_longitude IS NOT NULL;

-- ==========================================
-- 3. EVENT NOTIFICATIONS TABLE
-- ==========================================
-- Tracks all event notifications (queued, sent, delivered)
CREATE TABLE IF NOT EXISTS event_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification details
    notification_type VARCHAR(50) DEFAULT 'event_announcement' CHECK (notification_type IN ('event_announcement', 'event_reminder', 'event_update', 'event_cancellation')),
    notification_style VARCHAR(50) DEFAULT 'standard' CHECK (notification_style IN ('organizer_focus', 'event_type_focus', 'catchphrase', 'standard')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'cancelled')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMPTZ,
    
    -- Expo push notification tracking
    push_notification_id TEXT, -- Expo push notification receipt ID
    expo_ticket_id TEXT, -- Expo push ticket ID
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one notification per user per event per type
    UNIQUE(user_id, event_id, notification_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_notifs_user_id ON event_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_event_notifs_event_id ON event_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifs_status ON event_notifications(status);
CREATE INDEX IF NOT EXISTS idx_event_notifs_scheduled ON event_notifications(scheduled_for) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_event_notifs_type ON event_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_event_notifs_created ON event_notifications(created_at DESC);

-- ==========================================
-- 4. UPDATE EVENTS TABLE
-- ==========================================
-- Add notification-related columns to existing events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_catchphrase TEXT,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0;

-- Index for featured events
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_events_notification_sent ON events(notification_sent);

-- ==========================================
-- 5. HELPER FUNCTIONS
-- ==========================================

-- Function to reset weekly notification count
CREATE OR REPLACE FUNCTION reset_weekly_notification_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a week has passed since week_start_date
    IF NEW.week_start_date < CURRENT_DATE - INTERVAL '7 days' THEN
        NEW.notifications_sent_this_week := 0;
        NEW.week_start_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for weekly reset
DROP TRIGGER IF EXISTS trg_reset_weekly_notifications ON user_event_preferences;
CREATE TRIGGER trg_reset_weekly_notifications
BEFORE UPDATE ON user_event_preferences
FOR EACH ROW
EXECUTE FUNCTION reset_weekly_notification_count();

-- Function to check if user is within quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(
    p_quiet_hours_enabled BOOLEAN,
    p_quiet_hours_start TIME,
    p_quiet_hours_end TIME,
    p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
    check_time TIME;
BEGIN
    IF NOT p_quiet_hours_enabled THEN
        RETURN false;
    END IF;
    
    check_time := (p_check_time AT TIME ZONE 'UTC')::TIME;
    
    -- Handle quiet hours that span midnight
    IF p_quiet_hours_start > p_quiet_hours_end THEN
        RETURN check_time >= p_quiet_hours_start OR check_time <= p_quiet_hours_end;
    ELSE
        RETURN check_time >= p_quiet_hours_start AND check_time <= p_quiet_hours_end;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate distance between two points in kilometers using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Handle NULL values
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Convert degrees to radians
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    
    -- Haversine formula
    a := sin(dLat/2) * sin(dLat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon/2) * sin(dLon/2);
    
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    -- Distance in kilometers
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get matching users for an event
CREATE OR REPLACE FUNCTION get_matching_users_for_event(
    p_event_id UUID
)
RETURNS TABLE (
    user_id UUID,
    push_token TEXT,
    notification_radius_km INTEGER,
    event_categories TEXT[],
    max_notifications_per_week INTEGER,
    notifications_sent_this_week INTEGER,
    quiet_hours_enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uep.user_id,
        upt.push_token,
        uep.notification_radius_km,
        uep.event_categories,
        uep.max_notifications_per_week,
        uep.notifications_sent_this_week,
        uep.quiet_hours_enabled,
        uep.quiet_hours_start,
        uep.quiet_hours_end
    FROM user_event_preferences uep
    INNER JOIN user_push_tokens upt ON uep.user_id = upt.user_id
    INNER JOIN events e ON e.id = p_event_id
    WHERE 
        -- User has push notifications enabled
        uep.push_notifications_enabled = true
        -- Push token is active
        AND upt.is_active = true
        -- Event category matches user preferences
        AND e.category = ANY(uep.event_categories)
        -- User hasn't exceeded weekly notification limit
        AND uep.notifications_sent_this_week < uep.max_notifications_per_week
        -- Calculate distance if event has location
        AND (
            e.latitude IS NULL 
            OR e.longitude IS NULL 
            OR uep.custom_latitude IS NULL 
            OR uep.custom_longitude IS NULL
            OR calculate_distance_km(
                e.latitude, 
                e.longitude, 
                uep.custom_latitude, 
                uep.custom_longitude
            ) <= uep.notification_radius_km
        );
END;
$$ LANGUAGE plpgsql;

-- Function to increment notification count
CREATE OR REPLACE FUNCTION increment_user_notification_count(
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE user_event_preferences
    SET 
        notifications_sent_this_week = notifications_sent_this_week + 1,
        last_notification_sent_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update notification status
CREATE OR REPLACE FUNCTION update_notification_status(
    p_notification_id UUID,
    p_status VARCHAR(20),
    p_expo_ticket_id TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE event_notifications
    SET 
        status = p_status,
        sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
        delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
        expo_ticket_id = COALESCE(p_expo_ticket_id, expo_ticket_id),
        error_message = COALESCE(p_error_message, error_message),
        retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END,
        updated_at = NOW()
    WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

-- Push Tokens RLS Policies
CREATE POLICY "Users can view their own push tokens" ON user_push_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens" ON user_push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens" ON user_push_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens" ON user_push_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Event Preferences RLS Policies
CREATE POLICY "Users can view their own event preferences" ON user_event_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own event preferences" ON user_event_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event preferences" ON user_event_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event preferences" ON user_event_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Event Notifications RLS Policies
CREATE POLICY "Users can view their own event notifications" ON event_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own event notifications" ON event_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all notifications (for backend processing)
CREATE POLICY "Service role can manage all event notifications" ON event_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- 7. GRANT PERMISSIONS
-- ==========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_event_preferences TO authenticated;
GRANT SELECT, UPDATE ON event_notifications TO authenticated;
GRANT ALL ON event_notifications TO service_role;

GRANT EXECUTE ON FUNCTION get_matching_users_for_event(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION increment_user_notification_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_notification_status(UUID, VARCHAR, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION is_in_quiet_hours(BOOLEAN, TIME, TIME, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_distance_km(DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO service_role;

-- ==========================================
-- 8. CREATE DEFAULT PREFERENCES FOR EXISTING USERS
-- ==========================================

-- Insert default event preferences for existing users
INSERT INTO user_event_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_event_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ==========================================
-- 9. ANALYTICS VIEWS
-- ==========================================

-- View for notification analytics
CREATE OR REPLACE VIEW event_notification_analytics AS
SELECT 
    e.id AS event_id,
    e.title AS event_title,
    e.category AS event_category,
    e.is_featured,
    COUNT(en.id) AS total_notifications,
    COUNT(CASE WHEN en.status = 'sent' THEN 1 END) AS sent_count,
    COUNT(CASE WHEN en.status = 'delivered' THEN 1 END) AS delivered_count,
    COUNT(CASE WHEN en.clicked THEN 1 END) AS clicked_count,
    ROUND(
        (COUNT(CASE WHEN en.clicked THEN 1 END)::DECIMAL / NULLIF(COUNT(CASE WHEN en.status = 'delivered' THEN 1 END), 0)) * 100, 
        2
    ) AS click_through_rate,
    en.notification_style,
    COUNT(DISTINCT en.user_id) AS unique_users_notified
FROM events e
LEFT JOIN event_notifications en ON e.id = en.event_id
WHERE e.is_featured = true
GROUP BY e.id, e.title, e.category, e.is_featured, en.notification_style;

-- View for user notification engagement
CREATE OR REPLACE VIEW user_notification_engagement AS
SELECT 
    uep.user_id,
    p.username,
    p.display_name,
    uep.push_notifications_enabled,
    uep.notification_radius_km,
    uep.event_categories,
    uep.max_notifications_per_week,
    uep.notifications_sent_this_week,
    COUNT(en.id) AS total_notifications_received,
    COUNT(CASE WHEN en.clicked THEN 1 END) AS notifications_clicked,
    ROUND(
        (COUNT(CASE WHEN en.clicked THEN 1 END)::DECIMAL / NULLIF(COUNT(en.id), 0)) * 100, 
        2
    ) AS engagement_rate
FROM user_event_preferences uep
LEFT JOIN profiles p ON uep.user_id = p.id
LEFT JOIN event_notifications en ON uep.user_id = en.user_id
GROUP BY uep.user_id, p.username, p.display_name, uep.push_notifications_enabled, 
         uep.notification_radius_km, uep.event_categories, uep.max_notifications_per_week, 
         uep.notifications_sent_this_week;

-- ==========================================
-- SCHEMA COMPLETE
-- ==========================================

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Event Push Notifications schema created successfully!';
    RAISE NOTICE '📊 Tables: user_push_tokens, user_event_preferences, event_notifications';
    RAISE NOTICE '🔧 Functions: get_matching_users_for_event, increment_user_notification_count, update_notification_status';
    RAISE NOTICE '📈 Views: event_notification_analytics, user_notification_engagement';
    RAISE NOTICE '🔒 RLS policies enabled for all tables';
END $$;


