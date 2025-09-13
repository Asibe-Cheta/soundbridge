-- Simple Privacy Settings Migration
-- Run this in your Supabase SQL Editor

-- Step 1: Create the user_privacy_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'followers')),
    show_email BOOLEAN DEFAULT false,
    show_phone BOOLEAN DEFAULT false,
    allow_messages TEXT DEFAULT 'everyone' CHECK (allow_messages IN ('everyone', 'followers', 'creators_only', 'none')),
    allow_comments TEXT DEFAULT 'everyone' CHECK (allow_comments IN ('everyone', 'followers', 'none')),
    show_online_status BOOLEAN DEFAULT true,
    show_listening_activity BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_visibility ON user_privacy_settings(profile_visibility);

-- Step 3: Enable RLS (Row Level Security)
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own privacy settings" ON user_privacy_settings;
DROP POLICY IF EXISTS "Users can insert their own privacy settings" ON user_privacy_settings;
DROP POLICY IF EXISTS "Users can update their own privacy settings" ON user_privacy_settings;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view their own privacy settings" ON user_privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" ON user_privacy_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON user_privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 6: Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_privacy_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Create trigger (drop existing one first to avoid conflicts)
DROP TRIGGER IF EXISTS update_user_privacy_settings_updated_at ON user_privacy_settings;
CREATE TRIGGER update_user_privacy_settings_updated_at 
    BEFORE UPDATE ON user_privacy_settings 
    FOR EACH ROW EXECUTE FUNCTION update_privacy_settings_updated_at();

-- Step 8: Insert default privacy settings for existing users
INSERT INTO user_privacy_settings (user_id, profile_visibility, show_email, show_phone, allow_messages, allow_comments, show_online_status, show_listening_activity)
SELECT id, 'public', false, false, 'everyone', 'everyone', true, true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_privacy_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Step 9: Create or replace the view for easy access to user privacy settings
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
    END as visibility_description,
    CASE 
        WHEN ups.allow_messages = 'everyone' THEN 'Everyone can message you'
        WHEN ups.allow_messages = 'followers' THEN 'Only followers can message you'
        WHEN ups.allow_messages = 'creators_only' THEN 'Only creators can message you'
        WHEN ups.allow_messages = 'none' THEN 'No direct messages allowed'
        ELSE 'Unknown'
    END as messaging_description,
    CASE 
        WHEN ups.allow_comments = 'everyone' THEN 'Everyone can comment on your content'
        WHEN ups.allow_comments = 'followers' THEN 'Only followers can comment on your content'
        WHEN ups.allow_comments = 'none' THEN 'No comments allowed on your content'
        ELSE 'Unknown'
    END as comments_description
FROM user_privacy_settings ups
ORDER BY ups.updated_at DESC;
