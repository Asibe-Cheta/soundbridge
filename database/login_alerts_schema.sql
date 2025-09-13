-- Login Alerts Database Schema
-- Run this in your Supabase SQL Editor

-- Create user_login_sessions table to track login sessions
CREATE TABLE IF NOT EXISTS user_login_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    device_info TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create user_login_alerts_preferences table
CREATE TABLE IF NOT EXISTS user_login_alerts_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_alerts_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create login_events table to track login attempts
CREATE TABLE IF NOT EXISTS login_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login', 'suspicious_activity')),
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    device_info TEXT,
    success BOOLEAN DEFAULT true,
    failure_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_login_sessions_user_id ON user_login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_sessions_active ON user_login_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_login_sessions_expires ON user_login_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_type ON login_events(event_type);
CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events(created_at);

-- Create RLS (Row Level Security) policies
ALTER TABLE user_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_alerts_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

-- Policies for user_login_sessions
CREATE POLICY "Users can view their own login sessions" ON user_login_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own login sessions" ON user_login_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own login sessions" ON user_login_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_login_alerts_preferences
CREATE POLICY "Users can view their own login alert preferences" ON user_login_alerts_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login alert preferences" ON user_login_alerts_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own login alert preferences" ON user_login_alerts_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for login_events
CREATE POLICY "Users can view their own login events" ON login_events
    FOR SELECT USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_login_alerts_preferences
CREATE TRIGGER update_user_login_alerts_preferences_updated_at 
    BEFORE UPDATE ON user_login_alerts_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_login_sessions 
    WHERE expires_at < NOW() OR is_active = false;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's active sessions count
CREATE OR REPLACE FUNCTION get_user_active_sessions_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM user_login_sessions 
        WHERE user_id = user_uuid 
        AND is_active = true 
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to terminate user session
CREATE OR REPLACE FUNCTION terminate_user_session(session_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_login_sessions 
    SET is_active = false, expires_at = NOW()
    WHERE id = session_uuid AND user_id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Insert default login alerts preferences for existing users
INSERT INTO user_login_alerts_preferences (user_id, login_alerts_enabled, email_notifications, push_notifications)
SELECT id, true, true, true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_login_alerts_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Create a view for easy access to user login sessions with formatted data
CREATE OR REPLACE VIEW user_login_sessions_view AS
SELECT 
    uls.id,
    uls.user_id,
    uls.ip_address,
    uls.user_agent,
    uls.location,
    uls.device_info,
    uls.is_active,
    uls.created_at,
    uls.last_activity,
    uls.expires_at,
    CASE 
        WHEN uls.created_at > NOW() - INTERVAL '1 hour' THEN 'Just now'
        WHEN uls.created_at > NOW() - INTERVAL '1 day' THEN EXTRACT(EPOCH FROM (NOW() - uls.created_at))::INTEGER || ' minutes ago'
        ELSE uls.created_at::DATE::TEXT
    END as time_ago,
    CASE 
        WHEN uls.is_active AND uls.expires_at > NOW() THEN true
        ELSE false
    END as is_current
FROM user_login_sessions uls
ORDER BY uls.created_at DESC;
