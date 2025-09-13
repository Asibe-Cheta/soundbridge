-- Privacy Settings Database Schema
-- Run this in your Supabase SQL Editor

-- Create user_privacy_settings table to store user privacy preferences
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'followers')),
    show_email BOOLEAN DEFAULT false,
    show_phone BOOLEAN DEFAULT false,
    allow_messages BOOLEAN DEFAULT true,
    allow_comments BOOLEAN DEFAULT true,
    show_online_status BOOLEAN DEFAULT true,
    show_listening_activity BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_visibility ON user_privacy_settings(profile_visibility);

-- Enable RLS (Row Level Security)
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own privacy settings" ON user_privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" ON user_privacy_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON user_privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_privacy_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_privacy_settings
CREATE TRIGGER update_user_privacy_settings_updated_at 
    BEFORE UPDATE ON user_privacy_settings 
    FOR EACH ROW EXECUTE FUNCTION update_privacy_settings_updated_at();

-- Insert default privacy settings for existing users
INSERT INTO user_privacy_settings (user_id, profile_visibility, show_email, show_phone, allow_messages, allow_comments, show_online_status, show_listening_activity)
SELECT id, 'public', false, false, true, true, true, true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_privacy_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Create a view for easy access to user privacy settings
CREATE OR REPLACE VIEW user_privacy_settings_view AS
SELECT 
    ups.id,
    ups.user_id,
    ups.profile_visibility,
    ups.show_email,
    ups.show_phone,
    ups.allow_messages,
    ups.allow_comments,
    ups.show_online_status,
    ups.show_listening_activity,
    ups.created_at,
    ups.updated_at,
    CASE 
        WHEN ups.profile_visibility = 'public' THEN 'Public - Anyone can view your profile'
        WHEN ups.profile_visibility = 'followers' THEN 'Followers Only - Only your followers can view your profile'
        WHEN ups.profile_visibility = 'private' THEN 'Private - Only you can view your profile'
        ELSE 'Unknown'
    END as visibility_description
FROM user_privacy_settings ups
ORDER BY ups.updated_at DESC;
