-- SoundBridge Database Schema
-- Comprehensive SQL migration script for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE user_role AS ENUM ('creator', 'listener');
CREATE TYPE event_category AS ENUM ('Christian', 'Secular', 'Carnival', 'Gospel', 'Hip-Hop', 'Afrobeat', 'Jazz', 'Classical', 'Rock', 'Pop', 'Other');
CREATE TYPE attendee_status AS ENUM ('attending', 'interested', 'not_going');
CREATE TYPE message_type AS ENUM ('text', 'audio', 'file', 'collaboration');

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    role user_role NOT NULL DEFAULT 'listener',
    location VARCHAR(255),
    country VARCHAR(50) CHECK (country IN ('UK', 'Nigeria')),
    social_links JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUDIO_TRACKS TABLE
CREATE TABLE audio_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    cover_art_url TEXT,
    duration INTEGER, -- in seconds
    genre VARCHAR(100),
    tags TEXT[],
    play_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EVENTS TABLE
CREATE TABLE events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    location VARCHAR(255) NOT NULL,
    venue VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    category event_category NOT NULL,
    price_gbp DECIMAL(10, 2),
    price_ngn DECIMAL(10, 2),
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FOLLOWS TABLE (creator following system)
CREATE TABLE follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- 5. EVENT_ATTENDEES TABLE (RSVP system)
CREATE TABLE event_attendees (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status attendee_status NOT NULL DEFAULT 'interested',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

-- 6. MESSAGES TABLE (collaboration system)
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER_PREFERENCES TABLE (notification system)
CREATE TABLE user_preferences (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    notification_radius_km INTEGER DEFAULT 50,
    event_categories JSONB DEFAULT '[]',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COPYRIGHT_PROTECTION TABLE (copyright checking system)
CREATE TABLE copyright_protection (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, flagged, blocked
    check_type VARCHAR(50) NOT NULL, -- automated, manual, community_report
    fingerprint_hash TEXT, -- Audio fingerprint for comparison
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00 confidence in match
    matched_track_info JSONB, -- Information about matched copyrighted content
    reviewer_id UUID REFERENCES profiles(id), -- Admin who reviewed (if manual)
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. COPYRIGHT_VIOLATIONS TABLE (tracking violations)
CREATE TABLE copyright_violations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL, -- 'copyright_infringement', 'trademark', 'rights_holder_complaint'
    description TEXT NOT NULL,
    evidence_urls TEXT[], -- URLs to evidence (screenshots, links, etc.)
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, under_review, resolved, dismissed
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. COPYRIGHT_WHITELIST TABLE (known safe content)
CREATE TABLE copyright_whitelist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fingerprint_hash TEXT UNIQUE NOT NULL,
    track_title VARCHAR(255),
    artist_name VARCHAR(255),
    rights_holder VARCHAR(255),
    license_type VARCHAR(100), -- 'public_domain', 'creative_commons', 'licensed'
    license_details JSONB,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. COPYRIGHT_BLACKLIST TABLE (known copyrighted content)
CREATE TABLE copyright_blacklist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fingerprint_hash TEXT UNIQUE NOT NULL,
    track_title VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    rights_holder VARCHAR(255),
    release_date DATE,
    country_of_origin VARCHAR(50),
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    added_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. DMCA_REQUESTS TABLE (DMCA compliance)
CREATE TABLE dmca_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    requester_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_phone VARCHAR(50),
    rights_holder VARCHAR(255) NOT NULL,
    infringement_description TEXT NOT NULL,
    original_work_description TEXT NOT NULL,
    good_faith_statement BOOLEAN NOT NULL,
    accuracy_statement BOOLEAN NOT NULL,
    authority_statement BOOLEAN NOT NULL,
    contact_address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, resolved, dismissed
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. COPYRIGHT_SETTINGS TABLE (platform copyright configuration)
CREATE TABLE copyright_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. COMMENTS TABLE (user comments on tracks and events)
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL, -- Track or event ID
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event')),
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threaded comments
    likes_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. LIKES TABLE (user likes on tracks, events, and comments)
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL, -- Track, event, or comment ID
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event', 'comment')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);

-- 16. SHARES TABLE (user shares/reposts of content)
CREATE TABLE shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL, -- Track or event ID
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event')),
    share_type VARCHAR(20) NOT NULL DEFAULT 'repost' CHECK (share_type IN ('repost', 'external_share')),
    external_platform VARCHAR(50), -- 'twitter', 'facebook', 'instagram', etc.
    external_url TEXT,
    caption TEXT, -- User's caption when sharing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. BOOKMARKS TABLE (user bookmarks/saves)
CREATE TABLE bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL, -- Track or event ID
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);

-- 18. PLAYLISTS TABLE (user playlists)
CREATE TABLE playlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    cover_image_url TEXT,
    tracks_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- in seconds
    followers_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. PLAYLIST_TRACKS TABLE (tracks in playlists)
CREATE TABLE playlist_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, track_id)
);

-- 20. COLLABORATIONS TABLE (artist collaborations)
CREATE TABLE collaborations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    initiator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    collaborator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    project_title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL CHECK (project_type IN ('recording', 'live_performance', 'music_video', 'remix', 'feature', 'production')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
    deadline TIMESTAMPTZ,
    compensation_type VARCHAR(20) CHECK (compensation_type IN ('fixed', 'percentage', 'revenue_share', 'none')),
    compensation_amount DECIMAL(10, 2),
    compensation_currency VARCHAR(3) DEFAULT 'GBP',
    requirements TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. COLLABORATION_TRACKS TABLE (tracks created through collaborations)
CREATE TABLE collaboration_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. NOTIFICATIONS TABLE (user notifications)
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'share', 'collaboration', 'collaboration_request', 'event', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id UUID, -- ID of related content (track, event, comment, etc.)
    related_type VARCHAR(20), -- Type of related content
    action_url TEXT, -- URL to navigate to when notification is clicked
    metadata JSONB, -- Additional data for the notification
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ, -- When the notification was read
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. USER_FEED TABLE (personalized user feed)
CREATE TABLE user_feed (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event', 'comment', 'share')),
    source_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Who generated this feed item
    feed_type VARCHAR(20) NOT NULL CHECK (feed_type IN ('upload', 'share', 'comment', 'follow', 'collaboration')),
    relevance_score DECIMAL(3,2) DEFAULT 1.00, -- Algorithm relevance score
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. SOCIAL_ANALYTICS TABLE (social engagement analytics)
CREATE TABLE social_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    followers_gained INTEGER DEFAULT 0,
    followers_lost INTEGER DEFAULT 0,
    total_followers INTEGER NOT NULL,
    likes_received INTEGER DEFAULT 0,
    comments_received INTEGER DEFAULT 0,
    shares_received INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- MFA Settings Table
CREATE TABLE IF NOT EXISTS mfa_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    methods TEXT[] DEFAULT '{}',
    secret TEXT,
    backup_codes TEXT[] DEFAULT '{}',
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'creator', 'listener')),
    permissions TEXT[] DEFAULT '{}',
    scope TEXT DEFAULT 'personal' CHECK (scope IN ('global', 'organization', 'personal')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    identifier TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    reset_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_country ON profiles(country);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

CREATE INDEX idx_audio_tracks_creator_id ON audio_tracks(creator_id);
CREATE INDEX idx_audio_tracks_genre ON audio_tracks(genre);
CREATE INDEX idx_audio_tracks_is_public ON audio_tracks(is_public);
CREATE INDEX idx_audio_tracks_created_at ON audio_tracks(created_at);
CREATE INDEX idx_audio_tracks_play_count ON audio_tracks(play_count DESC);
CREATE INDEX idx_audio_tracks_like_count ON audio_tracks(like_count DESC);

CREATE INDEX idx_events_creator_id ON events(creator_id);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_location ON events(location);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_coordinates ON events(latitude, longitude);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at);

CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(status);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- Copyright protection indexes
CREATE INDEX idx_copyright_protection_track_id ON copyright_protection(track_id);
CREATE INDEX idx_copyright_protection_creator_id ON copyright_protection(creator_id);
CREATE INDEX idx_copyright_protection_status ON copyright_protection(status);
CREATE INDEX idx_copyright_protection_fingerprint ON copyright_protection(fingerprint_hash);
CREATE INDEX idx_copyright_protection_created_at ON copyright_protection(created_at);

CREATE INDEX idx_copyright_violations_track_id ON copyright_violations(track_id);
CREATE INDEX idx_copyright_violations_reporter_id ON copyright_violations(reporter_id);
CREATE INDEX idx_copyright_violations_status ON copyright_violations(status);
CREATE INDEX idx_copyright_violations_created_at ON copyright_violations(created_at);

CREATE INDEX idx_copyright_whitelist_fingerprint ON copyright_whitelist(fingerprint_hash);
CREATE INDEX idx_copyright_whitelist_artist ON copyright_whitelist(artist_name);

CREATE INDEX idx_copyright_blacklist_fingerprint ON copyright_blacklist(fingerprint_hash);
CREATE INDEX idx_copyright_blacklist_artist ON copyright_blacklist(artist_name);
CREATE INDEX idx_copyright_blacklist_title ON copyright_blacklist(track_title);

CREATE INDEX idx_dmca_requests_track_id ON dmca_requests(track_id);
CREATE INDEX idx_dmca_requests_status ON dmca_requests(status);
CREATE INDEX idx_dmca_requests_created_at ON dmca_requests(created_at);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_mfa_settings_user_id ON mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits(reset_time);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_attendees_updated_at BEFORE UPDATE ON event_attendees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Copyright protection triggers
CREATE TRIGGER update_copyright_protection_updated_at BEFORE UPDATE ON copyright_protection
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copyright_violations_updated_at BEFORE UPDATE ON copyright_violations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dmca_requests_updated_at BEFORE UPDATE ON dmca_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mfa_settings_updated_at BEFORE UPDATE ON mfa_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update current_attendees count
CREATE OR REPLACE FUNCTION update_event_attendees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events 
        SET current_attendees = current_attendees + 1 
        WHERE id = NEW.event_id AND NEW.status = 'attending';
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Decrease count if status changed from attending to something else
        IF OLD.status = 'attending' AND NEW.status != 'attending' THEN
            UPDATE events 
            SET current_attendees = current_attendees - 1 
            WHERE id = NEW.event_id;
        -- Increase count if status changed to attending
        ELSIF OLD.status != 'attending' AND NEW.status = 'attending' THEN
            UPDATE events 
            SET current_attendees = current_attendees + 1 
            WHERE id = NEW.event_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events 
        SET current_attendees = current_attendees - 1 
        WHERE id = OLD.event_id AND OLD.status = 'attending';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply attendees count trigger
CREATE TRIGGER update_event_attendees_count 
    AFTER INSERT OR UPDATE OR DELETE ON event_attendees
    FOR EACH ROW EXECUTE FUNCTION update_event_attendees_count();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Audio tracks policies
CREATE POLICY "Anyone can view public audio tracks" ON audio_tracks
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own audio tracks" ON audio_tracks
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert their own audio tracks" ON audio_tracks
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own audio tracks" ON audio_tracks
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own audio tracks" ON audio_tracks
    FOR DELETE USING (auth.uid() = creator_id);

-- Events policies
CREATE POLICY "Anyone can view events" ON events
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own events" ON events
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE USING (auth.uid() = creator_id);

-- Follows policies
CREATE POLICY "Users can view all follows" ON follows
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own follows" ON follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows" ON follows
    FOR DELETE USING (auth.uid() = follower_id);

-- Event attendees policies
CREATE POLICY "Anyone can view event attendees" ON event_attendees
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own attendance" ON event_attendees
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance" ON event_attendees
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attendance" ON event_attendees
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages they sent or received" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert messages they send" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they sent" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete messages they sent" ON messages
    FOR DELETE USING (auth.uid() = sender_id);

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- MFA Settings Policies
CREATE POLICY "Users can view own MFA settings" ON mfa_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own MFA settings" ON mfa_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own MFA settings" ON mfa_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Roles Policies
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Rate Limits Policies (system only)
CREATE POLICY "System can manage rate limits" ON rate_limits FOR ALL USING (false);

-- Audit Logs Policies
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Create functions for common operations

-- Function to get user's feed (audio tracks from followed creators)
CREATE OR REPLACE FUNCTION get_user_feed(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    creator_id UUID,
    creator_username VARCHAR(50),
    creator_display_name VARCHAR(100),
    file_url TEXT,
    cover_art_url TEXT,
    duration INTEGER,
    genre VARCHAR(100),
    play_count INTEGER,
    like_count INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.id,
        at.title,
        at.description,
        at.creator_id,
        p.username,
        p.display_name,
        at.file_url,
        at.cover_art_url,
        at.duration,
        at.genre,
        at.play_count,
        at.like_count,
        at.created_at
    FROM audio_tracks at
    JOIN profiles p ON at.creator_id = p.id
    WHERE at.is_public = true
    AND at.creator_id IN (
        SELECT following_id 
        FROM follows 
        WHERE follower_id = user_uuid
    )
    ORDER BY at.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nearby events
CREATE OR REPLACE FUNCTION get_nearby_events(
    user_lat DECIMAL(10, 8),
    user_lng DECIMAL(11, 8),
    radius_km INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    creator_id UUID,
    creator_username VARCHAR(50),
    creator_display_name VARCHAR(100),
    event_date TIMESTAMPTZ,
    location VARCHAR(255),
    venue VARCHAR(255),
    category event_category,
    price_gbp DECIMAL(10, 2),
    price_ngn DECIMAL(10, 2),
    current_attendees INTEGER,
    max_attendees INTEGER,
    image_url TEXT,
    distance_km DECIMAL(10, 2),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.creator_id,
        p.username,
        p.display_name,
        e.event_date,
        e.location,
        e.venue,
        e.category,
        e.price_gbp,
        e.price_ngn,
        e.current_attendees,
        e.max_attendees,
        e.image_url,
        (
            6371 * acos(
                cos(radians(user_lat)) * 
                cos(radians(e.latitude)) * 
                cos(radians(e.longitude) - radians(user_lng)) + 
                sin(radians(user_lat)) * 
                sin(radians(e.latitude))
            )
        ) AS distance_km,
        e.created_at
    FROM events e
    JOIN profiles p ON e.creator_id = p.id
    WHERE e.event_date > NOW()
    AND e.latitude IS NOT NULL 
    AND e.longitude IS NOT NULL
    AND (
        6371 * acos(
            cos(radians(user_lat)) * 
            cos(radians(e.latitude)) * 
            cos(radians(e.longitude) - radians(user_lng)) + 
            sin(radians(user_lat)) * 
            sin(radians(e.latitude))
        )
    ) <= radius_km
    ORDER BY distance_km ASC, e.event_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(track_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE audio_tracks 
    SET play_count = play_count + 1 
    WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment like count
CREATE OR REPLACE FUNCTION increment_like_count(track_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE audio_tracks 
    SET like_count = like_count + 1 
    WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement like count
CREATE OR REPLACE FUNCTION decrement_like_count(track_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE audio_tracks 
    SET like_count = GREATEST(like_count - 1, 0) 
    WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create default user preferences trigger
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_preferences_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_preferences();

-- Insert sample data (optional - for testing)
-- Uncomment the following lines if you want to insert sample data

/*
-- Sample profiles
INSERT INTO profiles (id, username, display_name, bio, role, country) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'john_doe', 'John Doe', 'Christian music creator from London', 'creator', 'UK'),
('550e8400-e29b-41d4-a716-446655440002', 'jane_smith', 'Jane Smith', 'Gospel singer from Lagos', 'creator', 'Nigeria'),
('550e8400-e29b-41d4-a716-446655440003', 'music_lover', 'Music Lover', 'Passionate about discovering new music', 'listener', 'UK');

-- Sample audio tracks
INSERT INTO audio_tracks (title, description, creator_id, file_url, genre, duration) VALUES
('Amazing Grace', 'Beautiful rendition of Amazing Grace', '550e8400-e29b-41d4-a716-446655440001', 'https://example.com/amazing-grace.mp3', 'Gospel', 240),
('Praise Song', 'Uplifting praise song', '550e8400-e29b-41d4-a716-446655440002', 'https://example.com/praise-song.mp3', 'Gospel', 180);

-- Sample events
INSERT INTO events (title, description, creator_id, event_date, location, venue, category, price_gbp) VALUES
('Gospel Night', 'An evening of gospel music', '550e8400-e29b-41d4-a716-446655440001', NOW() + INTERVAL '7 days', 'London', 'Royal Albert Hall', 'Gospel', 25.00),
('Afrobeat Festival', 'Celebrating African music', '550e8400-e29b-41d4-a716-446655440002', NOW() + INTERVAL '14 days', 'Lagos', 'National Theatre', 'Afrobeat', 5000.00);
*/ 

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_copyright_protection_updated_at BEFORE UPDATE ON copyright_protection FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_copyright_violations_updated_at BEFORE UPDATE ON copyright_violations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dmca_requests_updated_at BEFORE UPDATE ON dmca_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON collaborations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update like counts
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        IF NEW.content_type = 'track' THEN
            UPDATE audio_tracks SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
        ELSIF NEW.content_type = 'event' THEN
            UPDATE events SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
        ELSIF NEW.content_type = 'comment' THEN
            UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count
        IF OLD.content_type = 'track' THEN
            UPDATE audio_tracks SET likes_count = likes_count - 1 WHERE id = OLD.content_id;
        ELSIF OLD.content_type = 'event' THEN
            UPDATE events SET likes_count = likes_count - 1 WHERE id = OLD.content_id;
        ELSIF OLD.content_type = 'comment' THEN
            UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.content_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply like count trigger
CREATE TRIGGER update_like_counts AFTER INSERT OR DELETE ON likes FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comment count
        IF NEW.content_type = 'track' THEN
            UPDATE audio_tracks SET comments_count = comments_count + 1 WHERE id = NEW.content_id;
        ELSIF NEW.content_type = 'event' THEN
            UPDATE events SET comments_count = comments_count + 1 WHERE id = NEW.content_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comment count
        IF OLD.content_type = 'track' THEN
            UPDATE audio_tracks SET comments_count = comments_count - 1 WHERE id = OLD.content_id;
        ELSIF OLD.content_type = 'event' THEN
            UPDATE events SET comments_count = comments_count - 1 WHERE id = OLD.content_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply comment count trigger
CREATE TRIGGER update_comment_counts AFTER INSERT OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment following count for follower
        UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        -- Increment follower count for following
        UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement following count for follower
        UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
        -- Decrement follower count for following
        UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply follower count trigger
CREATE TRIGGER update_follower_counts AFTER INSERT OR DELETE ON follows FOR EACH ROW EXECUTE FUNCTION update_follower_count();

-- Function to update playlist track counts
CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment track count and update duration
        UPDATE playlists 
        SET tracks_count = tracks_count + 1,
            total_duration = total_duration + COALESCE((SELECT duration FROM audio_tracks WHERE id = NEW.track_id), 0)
        WHERE id = NEW.playlist_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement track count and update duration
        UPDATE playlists 
        SET tracks_count = tracks_count - 1,
            total_duration = total_duration - COALESCE((SELECT duration FROM audio_tracks WHERE id = OLD.track_id), 0)
        WHERE id = OLD.playlist_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply playlist track count trigger
CREATE TRIGGER update_playlist_track_counts AFTER INSERT OR DELETE ON playlist_tracks FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

-- Enable Row Level Security (RLS) for new tables
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for likes
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for shares
CREATE POLICY "Shares are viewable by everyone" ON shares FOR SELECT USING (true);
CREATE POLICY "Users can insert their own shares" ON shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shares" ON shares FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shares" ON shares FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for bookmarks
CREATE POLICY "Users can view their own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for playlists
CREATE POLICY "Public playlists are viewable by everyone" ON playlists FOR SELECT USING (is_public = true OR auth.uid() = creator_id);
CREATE POLICY "Users can insert their own playlists" ON playlists FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update their own playlists" ON playlists FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete their own playlists" ON playlists FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for playlist_tracks
CREATE POLICY "Playlist tracks are viewable by playlist owner" ON playlist_tracks FOR SELECT USING (
    EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND (is_public = true OR creator_id = auth.uid()))
);
CREATE POLICY "Users can manage tracks in their own playlists" ON playlist_tracks FOR ALL USING (
    EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND creator_id = auth.uid())
);

-- RLS Policies for collaborations
CREATE POLICY "Users can view collaborations they're involved in" ON collaborations FOR SELECT USING (
    auth.uid() = initiator_id OR auth.uid() = collaborator_id
);
CREATE POLICY "Users can insert collaborations" ON collaborations FOR INSERT WITH CHECK (auth.uid() = initiator_id);
CREATE POLICY "Users can update collaborations they're involved in" ON collaborations FOR UPDATE USING (
    auth.uid() = initiator_id OR auth.uid() = collaborator_id
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_feed
CREATE POLICY "Users can view their own feed" ON user_feed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert feed items" ON user_feed FOR INSERT WITH CHECK (true);

-- RLS Policies for social_analytics
CREATE POLICY "Users can view their own analytics" ON social_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert analytics" ON social_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update analytics" ON social_analytics FOR UPDATE USING (true);

-- Insert sample data for testing
INSERT INTO copyright_whitelist (fingerprint_hash, track_title, artist_name, rights_holder, license_type) VALUES
('sample_whitelist_hash_1', 'Sample Original Track', 'Original Artist', 'Original Rights Holder', 'public_domain'),
('sample_whitelist_hash_2', 'Creative Commons Track', 'CC Artist', 'CC Rights Holder', 'creative_commons');

INSERT INTO copyright_blacklist (fingerprint_hash, track_title, artist_name, rights_holder, violation_type) VALUES
('sample_blacklist_hash_1', 'Copyrighted Song', 'Famous Artist', 'Major Label', 'copyright_infringement'),
('sample_blacklist_hash_2', 'Protected Track', 'Popular Artist', 'Music Publisher', 'copyright_infringement');

INSERT INTO copyright_settings (setting_key, setting_value, description) VALUES
('automated_checking_enabled', 'true', 'Enable automated copyright checking'),
('confidence_threshold', '0.8', 'Minimum confidence score for copyright matches'),
('manual_review_threshold', '0.6', 'Confidence score threshold for manual review'),
('check_whitelist_first', 'true', 'Check whitelist before blacklist'),
('max_file_size_mb', '50', 'Maximum file size for copyright checking'); 