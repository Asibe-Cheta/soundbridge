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
    like_count INTEGER DEFAULT 0,
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

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

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