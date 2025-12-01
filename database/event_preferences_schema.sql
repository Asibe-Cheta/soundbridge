-- ============================================
-- EVENT PREFERENCES SYSTEM - COMPLETE IMPLEMENTATION
-- ============================================
-- Comprehensive event preferences system for SoundBridge
-- Supports user event preferences, personalized discovery, and onboarding integration
-- Date: December 2024
-- Based on: WEB_TEAM_EVENT_PREFERENCES_REQUEST.md
-- ============================================

-- Step 1: Create event_types table
-- ============================================
CREATE TABLE IF NOT EXISTS event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('music', 'podcast', 'professional', 'general')),
    description TEXT,
    icon_emoji VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create user_event_preferences junction table
-- ============================================
CREATE TABLE IF NOT EXISTS user_event_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    preference_strength INTEGER DEFAULT 1 CHECK (preference_strength >= 1 AND preference_strength <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_type_id)
);

-- Step 3: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_event_types_category ON event_types(category);
CREATE INDEX IF NOT EXISTS idx_event_types_active ON event_types(is_active);
CREATE INDEX IF NOT EXISTS idx_event_types_sort_order ON event_types(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_user_id ON user_event_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_event_type_id ON user_event_preferences(event_type_id);
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_created_at ON user_event_preferences(created_at DESC);

-- Step 4: Pre-populate event types
-- ============================================

-- Music Creator Events (category: 'music')
INSERT INTO event_types (name, category, description, icon_emoji, sort_order) VALUES
('Live Concerts & Performances', 'music', 'Concert performances and live shows', '🎤', 1),
('Open Mic Nights', 'music', 'Open mic nights and jam sessions', '🎙️', 2),
('Music Workshops & Masterclasses', 'music', 'Educational music workshops and masterclasses', '🎓', 3),
('Industry Networking Events', 'music', 'Music industry networking and meetups', '🤝', 4),
('Music Festivals', 'music', 'Music festivals and multi-day events', '🎪', 5),
('Listening Parties & Album Releases', 'music', 'Album launch parties and listening sessions', '🎧', 6),
('Studio Recording Sessions', 'music', 'Recording studio sessions and collaborations', '🎚️', 7),
('Artist Showcases & Talent Shows', 'music', 'Talent showcases and artist competitions', '✨', 8),
('Music Competitions & Battles', 'music', 'Music competitions, battles, and contests', '🏆', 9),
('Songwriting Camps & Retreats', 'music', 'Songwriting workshops and creative retreats', '🎼', 10)
ON CONFLICT (name) DO NOTHING;

-- Podcast Creator Events (category: 'podcast')
INSERT INTO event_types (name, category, description, icon_emoji, sort_order) VALUES
('Podcast Conferences & Expos', 'podcast', 'Podcast industry conferences and exhibitions', '🎙️', 1),
('Live Recording Sessions', 'podcast', 'Live podcast recording events', '🎤', 2),
('Podcaster Networking Meetups', 'podcast', 'Networking events for podcast creators', '🤝', 3),
('Podcasting Workshops & Training', 'podcast', 'Educational workshops on podcasting', '🎓', 4),
('Sponsor & Monetization Pitching Events', 'podcast', 'Events for pitching to sponsors and monetization', '💼', 5),
('Audio Equipment Demos & Showcases', 'podcast', 'Audio equipment demonstrations and showcases', '🎧', 6),
('Digital Media Festivals', 'podcast', 'Digital media and podcast festivals', '📱', 7),
('Podcast Awards & Competitions', 'podcast', 'Podcast awards ceremonies and competitions', '🏆', 8),
('Content Creator Summits', 'podcast', 'Summits for content creators and podcasters', '🎬', 9),
('Storytelling & Interview Masterclasses', 'podcast', 'Masterclasses on storytelling and interviewing', '💡', 10)
ON CONFLICT (name) DO NOTHING;

-- Industry Professional Events (category: 'professional')
INSERT INTO event_types (name, category, description, icon_emoji, sort_order) VALUES
('Live Concerts & Performances', 'professional', 'Concert performances and live shows', '🎤', 1),
('Industry Networking Events', 'professional', 'Music industry networking and meetups', '🤝', 2),
('Music Workshops & Masterclasses', 'professional', 'Educational music workshops and masterclasses', '🎓', 3),
('Studio Recording Sessions', 'professional', 'Recording studio sessions and collaborations', '🎚️', 4),
('Music Festivals', 'professional', 'Music festivals and multi-day events', '🎪', 5),
('Artist Showcases & Talent Shows', 'professional', 'Talent showcases and artist competitions', '✨', 6),
('Music Competitions & Battles', 'professional', 'Music competitions, battles, and contests', '🏆', 7),
('A&R & Talent Scouting Events', 'professional', 'A&R events and talent scouting sessions', '👂', 8),
('Music Business Conferences', 'professional', 'Music business and industry conferences', '💼', 9),
('Production & Engineering Workshops', 'professional', 'Audio production and engineering workshops', '🎛️', 10)
ON CONFLICT (name) DO NOTHING;

-- Music Lover Events (category: 'general')
INSERT INTO event_types (name, category, description, icon_emoji, sort_order) VALUES
('Live Concerts & Shows', 'general', 'Concert performances and live shows', '🎤', 1),
('Music Festivals', 'general', 'Music festivals and multi-day events', '🎪', 2),
('Listening Parties & Album Launches', 'general', 'Album launch parties and listening sessions', '🎧', 3),
('Open Mic Nights', 'general', 'Open mic nights (as audience)', '🎙️', 4),
('Artist Meet & Greets', 'general', 'Artist meet and greet sessions', '✨', 5),
('Music Competitions & Showcases', 'general', 'Music competitions and showcases', '🏆', 6),
('Club Nights & DJ Sets', 'general', 'Club nights and DJ performances', '🎵', 7),
('Classical Performances & Recitals', 'general', 'Classical music performances and recitals', '🎼', 8)
ON CONFLICT (name) DO NOTHING;

-- Step 5: Add RLS policies
-- ============================================

-- Enable RLS on event_types (public read access)
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active event types
CREATE POLICY "Public can read active event types"
ON event_types
FOR SELECT
USING (is_active = true);

-- Enable RLS on user_event_preferences
ALTER TABLE user_event_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own preferences
CREATE POLICY "Users can read their own event preferences"
ON user_event_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert their own event preferences"
ON user_event_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own event preferences"
ON user_event_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete their own event preferences"
ON user_event_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Step 6: Add comments for documentation
-- ============================================
COMMENT ON TABLE event_types IS 'Master list of all event types users can select during onboarding';
COMMENT ON TABLE user_event_preferences IS 'Junction table linking users to their selected event types (unlimited selections, minimum 2 required)';
COMMENT ON COLUMN event_types.category IS 'Event category: music, podcast, professional, or general';
COMMENT ON COLUMN user_event_preferences.preference_strength IS 'Preference strength (1-5) for future ML recommendations';

-- Step 7: Optional - Add event_type_id to events table for better matching
-- ============================================
-- Note: This is optional. The events table currently uses a category enum.
-- To enable better event matching with user preferences, you can add:
-- ALTER TABLE events ADD COLUMN event_type_id UUID REFERENCES event_types(id);
-- 
-- For now, the /api/events/by-preferences endpoint works with category matching.
-- Adding event_type_id later will enable more precise matching.
