-- Notification Preferences Schema for SoundBridge
-- This schema handles user notification preferences and settings

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Location Settings
    location_radius INTEGER DEFAULT 10 CHECK (location_radius > 0 AND location_radius <= 100),
    
    -- Event Categories (stored as JSON array)
    event_categories JSONB DEFAULT '["christian", "gospel", "afrobeats"]'::jsonb,
    
    -- Notification Timing
    notification_timing VARCHAR(20) DEFAULT '1-day' CHECK (notification_timing IN ('immediate', '1-day', '3-days', '1-week')),
    
    -- Delivery Methods (stored as JSON array)
    delivery_methods JSONB DEFAULT '["push", "email"]'::jsonb,
    
    -- Quiet Hours
    quiet_hours_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    
    -- Creator Activity
    creator_activity_enabled BOOLEAN DEFAULT true,
    
    -- Social Notifications (stored as JSON object)
    social_notifications JSONB DEFAULT '{
        "follows": true,
        "messages": true,
        "collaborations": true,
        "likes": false,
        "shares": false
    }'::jsonb,
    
    -- Collaboration Requests (stored as JSON object)
    collaboration_requests JSONB DEFAULT '{
        "newRequests": true,
        "requestUpdates": true,
        "requestReminders": true,
        "deliveryMethods": ["push", "email"]
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one preference record per user
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at ON notification_preferences(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Create function to get or create notification preferences for a user
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(p_user_id UUID)
RETURNS notification_preferences AS $$
DECLARE
    result notification_preferences;
BEGIN
    -- Try to get existing preferences
    SELECT * INTO result FROM notification_preferences WHERE user_id = p_user_id;
    
    -- If no preferences exist, create default ones
    IF NOT FOUND THEN
        INSERT INTO notification_preferences (user_id)
        VALUES (p_user_id)
        RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
    p_user_id UUID,
    p_location_radius INTEGER DEFAULT NULL,
    p_event_categories JSONB DEFAULT NULL,
    p_notification_timing VARCHAR(20) DEFAULT NULL,
    p_delivery_methods JSONB DEFAULT NULL,
    p_quiet_hours_enabled BOOLEAN DEFAULT NULL,
    p_quiet_hours_start TIME DEFAULT NULL,
    p_quiet_hours_end TIME DEFAULT NULL,
    p_creator_activity_enabled BOOLEAN DEFAULT NULL,
    p_social_notifications JSONB DEFAULT NULL,
    p_collaboration_requests JSONB DEFAULT NULL
)
RETURNS notification_preferences AS $$
DECLARE
    result notification_preferences;
BEGIN
    -- Update the preferences, only updating non-null values
    UPDATE notification_preferences SET
        location_radius = COALESCE(p_location_radius, location_radius),
        event_categories = COALESCE(p_event_categories, event_categories),
        notification_timing = COALESCE(p_notification_timing, notification_timing),
        delivery_methods = COALESCE(p_delivery_methods, delivery_methods),
        quiet_hours_enabled = COALESCE(p_quiet_hours_enabled, quiet_hours_enabled),
        quiet_hours_start = COALESCE(p_quiet_hours_start, quiet_hours_start),
        quiet_hours_end = COALESCE(p_quiet_hours_end, quiet_hours_end),
        creator_activity_enabled = COALESCE(p_creator_activity_enabled, creator_activity_enabled),
        social_notifications = COALESCE(p_social_notifications, social_notifications),
        collaboration_requests = COALESCE(p_collaboration_requests, collaboration_requests),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO result;
    
    -- If no row was updated, create a new one
    IF NOT FOUND THEN
        INSERT INTO notification_preferences (
            user_id,
            location_radius,
            event_categories,
            notification_timing,
            delivery_methods,
            quiet_hours_enabled,
            quiet_hours_start,
            quiet_hours_end,
            creator_activity_enabled,
            social_notifications,
            collaboration_requests
        ) VALUES (
            p_user_id,
            COALESCE(p_location_radius, 10),
            COALESCE(p_event_categories, '["christian", "gospel", "afrobeats"]'::jsonb),
            COALESCE(p_notification_timing, '1-day'),
            COALESCE(p_delivery_methods, '["push", "email"]'::jsonb),
            COALESCE(p_quiet_hours_enabled, true),
            COALESCE(p_quiet_hours_start, '22:00'),
            COALESCE(p_quiet_hours_end, '08:00'),
            COALESCE(p_creator_activity_enabled, true),
            COALESCE(p_social_notifications, '{"follows": true, "messages": true, "collaborations": true, "likes": false, "shares": false}'::jsonb),
            COALESCE(p_collaboration_requests, '{"newRequests": true, "requestUpdates": true, "requestReminders": true, "deliveryMethods": ["push", "email"]}'::jsonb)
        )
        RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences(UUID, INTEGER, JSONB, VARCHAR(20), JSONB, BOOLEAN, TIME, TIME, BOOLEAN, JSONB, JSONB) TO authenticated;

-- Insert default notification preferences for existing users (if any)
-- This is a one-time operation that can be run after the schema is created
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;
