-- ============================================================================
-- UNIFIED EVENT CATEGORIES MIGRATION
-- Date: October 16, 2025
-- Purpose: Align mobile and web teams on realistic event categories
-- Strategy: Option 1 - Separate event_category and music_genre fields
-- ============================================================================

-- ============================================================================
-- PHASE 1: BACKUP EXISTING DATA
-- ============================================================================

-- Backup events table
CREATE TABLE IF NOT EXISTS events_category_backup AS 
SELECT id, category, created_at FROM events;

-- Backup user preferences
CREATE TABLE IF NOT EXISTS user_event_preferences_backup AS 
SELECT * FROM user_event_preferences;

-- ============================================================================
-- PHASE 2: ADD NEW FIELDS TO EVENTS TABLE
-- ============================================================================

-- Add event_category field (the primary event type)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_category VARCHAR(100);

-- Add music_genre field (optional, for music events)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS music_genre VARCHAR(100);

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_events_event_category ON events(event_category);
CREATE INDEX IF NOT EXISTS idx_events_music_genre ON events(music_genre);

-- ============================================================================
-- PHASE 3: MIGRATE EXISTING DATA
-- ============================================================================

-- Map old music genre categories to 'concerts_live_music' event category
-- AND preserve the music genre information
UPDATE events 
SET 
    event_category = 'concerts_live_music',
    music_genre = category
WHERE category IN ('Gospel', 'Afrobeat', 'Jazz', 'Classical', 'Rock', 'Pop', 'Hip-Hop', 'R&B', 'Reggae', 'Soul', 'Blues', 'Electronic', 'Country');

-- Map 'Christian' to 'religious_spiritual' event category
UPDATE events 
SET event_category = 'religious_spiritual'
WHERE category = 'Christian';

-- Map 'Carnival' to 'festivals_carnivals' event category
UPDATE events 
SET event_category = 'festivals_carnivals'
WHERE category = 'Carnival';

-- Map 'Secular' and 'Other' to 'other_events'
UPDATE events 
SET event_category = 'other_events'
WHERE category IN ('Secular', 'Other');

-- Handle any remaining NULL values
UPDATE events 
SET event_category = 'other_events'
WHERE event_category IS NULL;

-- ============================================================================
-- PHASE 4: UPDATE USER EVENT PREFERENCES
-- ============================================================================

-- The user_event_preferences table uses JSONB array for categories
-- We need to map old category values to new event_category IDs

-- Step 1: Create a temporary function to map categories
CREATE OR REPLACE FUNCTION map_old_to_new_categories(old_categories JSONB)
RETURNS JSONB AS $$
DECLARE
    new_categories JSONB := '[]'::jsonb;
    old_cat TEXT;
    new_cat TEXT;
BEGIN
    -- Loop through old categories
    FOR old_cat IN SELECT jsonb_array_elements_text(old_categories)
    LOOP
        -- Map to new categories
        CASE 
            WHEN old_cat IN ('Gospel', 'Afrobeat', 'Jazz', 'Classical', 'Rock', 'Pop', 'Hip-Hop', 'R&B', 'Reggae', 'Soul', 'Blues', 'Electronic', 'Country') THEN
                new_cat := 'concerts_live_music';
            WHEN old_cat = 'Christian' THEN
                new_cat := 'religious_spiritual';
            WHEN old_cat = 'Carnival' THEN
                new_cat := 'festivals_carnivals';
            WHEN old_cat IN ('Secular', 'Other') THEN
                new_cat := 'other_events';
            -- Handle if already using new categories
            WHEN old_cat IN ('concerts_live_music', 'festivals_carnivals', 'comedy_entertainment', 'parties_celebrations', 
                            'networking_meetups', 'religious_spiritual', 'conferences_seminars', 'workshops_training',
                            'business_entrepreneurship', 'arts_exhibitions', 'theater_performances', 'sports_fitness',
                            'food_dining', 'charity_fundraising', 'other_events') THEN
                new_cat := old_cat;
            ELSE
                new_cat := 'other_events';
        END CASE;
        
        -- Add to new array if not already present (avoid duplicates)
        IF NOT new_categories ? new_cat THEN
            new_categories := new_categories || jsonb_build_array(new_cat);
        END IF;
    END LOOP;
    
    RETURN new_categories;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Update user preferences with mapped categories
UPDATE user_event_preferences
SET event_categories = map_old_to_new_categories(event_categories)
WHERE event_categories IS NOT NULL;

-- Step 3: Drop the temporary function (cleanup)
DROP FUNCTION IF EXISTS map_old_to_new_categories(JSONB);

-- ============================================================================
-- PHASE 5: UPDATE EVENT NOTIFICATIONS MATCHING FUNCTION
-- ============================================================================

-- Update the match_users_for_event function to use new event_category field
DROP FUNCTION IF EXISTS match_users_for_event(UUID, DECIMAL, DECIMAL);

CREATE OR REPLACE FUNCTION match_users_for_event(
    p_event_id UUID,
    p_event_lat DECIMAL,
    p_event_lon DECIMAL
)
RETURNS TABLE (
    user_id UUID,
    distance_km DECIMAL,
    match_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH event_data AS (
        SELECT 
            e.id,
            e.event_category,  -- Use new event_category field
            e.music_genre,     -- Optional music genre
            e.event_date
        FROM events e
        WHERE e.id = p_event_id
    ),
    eligible_users AS (
        SELECT DISTINCT
            uep.user_id,
            uep.event_categories,
            uep.max_distance_km,
            uep.custom_latitude,
            uep.custom_longitude,
            uep.max_notifications_per_week,
            uep.quiet_hours_start,
            uep.quiet_hours_end,
            uep.featured_only,
            calculate_distance_km(
                uep.custom_latitude,
                uep.custom_longitude,
                p_event_lat,
                p_event_lon
            ) AS dist_km
        FROM user_event_preferences uep
        CROSS JOIN event_data ed
        WHERE 
            uep.notifications_enabled = true
            AND uep.is_active = true
            -- Match event category
            AND (
                uep.event_categories IS NULL 
                OR uep.event_categories = '[]'::jsonb
                OR uep.event_categories ? ed.event_category
            )
            -- Distance check
            AND (
                uep.max_distance_km IS NULL
                OR calculate_distance_km(
                    uep.custom_latitude,
                    uep.custom_longitude,
                    p_event_lat,
                    p_event_lon
                ) <= uep.max_distance_km
            )
            -- Quiet hours check
            AND NOT is_in_quiet_hours(uep.quiet_hours_start, uep.quiet_hours_end)
            -- Weekly limit check
            AND (
                SELECT COUNT(*)
                FROM event_notifications en
                WHERE en.user_id = uep.user_id
                AND en.created_at >= NOW() - INTERVAL '7 days'
            ) < COALESCE(uep.max_notifications_per_week, 10)
    )
    SELECT 
        eu.user_id,
        eu.dist_km,
        CASE 
            WHEN eu.dist_km IS NOT NULL THEN 
                'Matched by category and location (' || ROUND(eu.dist_km, 1) || ' km away)'
            ELSE 
                'Matched by category'
        END AS match_reason
    FROM eligible_users eu
    ORDER BY eu.dist_km ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 6: CREATE UNIFIED CATEGORIES REFERENCE TABLE (OPTIONAL)
-- ============================================================================

-- This table stores the official list of event categories for reference
CREATE TABLE IF NOT EXISTS event_category_definitions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert unified categories
INSERT INTO event_category_definitions (id, name, description, icon, sort_order) VALUES
-- Entertainment Events
('concerts_live_music', 'Concerts & Live Music', 'Music concerts, live performances, band shows', 'musical-notes', 1),
('festivals_carnivals', 'Festivals & Carnivals', 'Cultural festivals, street carnivals, celebrations', 'flag', 2),
('comedy_entertainment', 'Comedy & Entertainment', 'Stand-up comedy, comedy shows, entertainment nights', 'happy', 3),

-- Social Events
('parties_celebrations', 'Parties & Celebrations', 'Birthday parties, celebrations, social gatherings', 'gift', 4),
('networking_meetups', 'Networking & Meetups', 'Professional networking, social meetups, community gatherings', 'people', 5),

-- Religious & Spiritual
('religious_spiritual', 'Religious & Spiritual', 'Church services, worship events, spiritual gatherings', 'heart', 6),

-- Professional & Educational
('conferences_seminars', 'Conferences & Seminars', 'Professional conferences, industry seminars, summits', 'document-text', 7),
('workshops_training', 'Workshops & Training', 'Educational workshops, skill training, learning sessions', 'school', 8),
('business_entrepreneurship', 'Business & Entrepreneurship', 'Business events, startup pitches, entrepreneur meetups', 'briefcase', 9),

-- Arts & Culture
('arts_exhibitions', 'Arts & Exhibitions', 'Art galleries, exhibitions, creative showcases', 'color-palette', 10),
('theater_performances', 'Theater & Performances', 'Theater shows, stage performances, dramatic arts', 'film', 11),

-- Special Interest
('sports_fitness', 'Sports & Fitness', 'Sports events, fitness activities, athletic competitions', 'fitness', 12),
('food_dining', 'Food & Dining', 'Food festivals, dining experiences, culinary events', 'restaurant', 13),
('charity_fundraising', 'Charity & Fundraising', 'Charity events, fundraisers, community service', 'heart-circle', 14),

-- Catch-all
('other_events', 'Other Events', 'Other event types not listed above', 'ellipsis-horizontal', 15)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- PHASE 7: MUSIC GENRES REFERENCE TABLE (OPTIONAL)
-- ============================================================================

-- This table stores the official list of music genres for music events
CREATE TABLE IF NOT EXISTS music_genre_definitions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert music genres
INSERT INTO music_genre_definitions (id, name, description, sort_order) VALUES
('gospel', 'Gospel', 'Gospel music events', 1),
('afrobeat', 'Afrobeat', 'Afrobeat music events', 2),
('jazz', 'Jazz', 'Jazz music events', 3),
('hip_hop', 'Hip-Hop', 'Hip-Hop music events', 4),
('classical', 'Classical', 'Classical music events', 5),
('rock', 'Rock', 'Rock music events', 6),
('pop', 'Pop', 'Pop music events', 7),
('r_b', 'R&B', 'R&B music events', 8),
('reggae', 'Reggae', 'Reggae music events', 9),
('soul', 'Soul', 'Soul music events', 10),
('blues', 'Blues', 'Blues music events', 11),
('electronic', 'Electronic', 'Electronic/EDM music events', 12),
('country', 'Country', 'Country music events', 13),
('other', 'Other', 'Other music genres', 14)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- PHASE 8: ADD CHECK CONSTRAINTS (OPTIONAL)
-- ============================================================================

-- Ensure event_category uses valid values
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_category_check;
ALTER TABLE events ADD CONSTRAINT events_event_category_check 
CHECK (
    event_category IN (
        'concerts_live_music', 'festivals_carnivals', 'comedy_entertainment',
        'parties_celebrations', 'networking_meetups', 'religious_spiritual',
        'conferences_seminars', 'workshops_training', 'business_entrepreneurship',
        'arts_exhibitions', 'theater_performances', 'sports_fitness',
        'food_dining', 'charity_fundraising', 'other_events'
    )
);

-- ============================================================================
-- PHASE 9: VERIFICATION QUERIES
-- ============================================================================

-- Check migration results
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'MIGRATION VERIFICATION';
    RAISE NOTICE '============================================================================';
    
    RAISE NOTICE 'Total events: %', (SELECT COUNT(*) FROM events);
    RAISE NOTICE 'Events with event_category: %', (SELECT COUNT(*) FROM events WHERE event_category IS NOT NULL);
    RAISE NOTICE 'Events with music_genre: %', (SELECT COUNT(*) FROM events WHERE music_genre IS NOT NULL);
    
    RAISE NOTICE '';
    RAISE NOTICE 'Event category breakdown:';
    -- This will show counts per category
END $$;

-- Show category distribution
SELECT 
    event_category,
    COUNT(*) as event_count,
    COUNT(DISTINCT music_genre) as unique_music_genres
FROM events
GROUP BY event_category
ORDER BY event_count DESC;

-- Show user preferences update
SELECT 
    COUNT(*) as total_users,
    COUNT(DISTINCT event_categories) as unique_preference_sets
FROM user_event_preferences;

-- ============================================================================
-- PHASE 10: GRANT PERMISSIONS
-- ============================================================================

-- Grant access to new tables
GRANT SELECT ON event_category_definitions TO authenticated, anon;
GRANT SELECT ON music_genre_definitions TO authenticated, anon;

-- ============================================================================
-- ROLLBACK SCRIPT (In case of issues)
-- ============================================================================

-- If you need to rollback, run this:
/*
-- Restore events from backup
UPDATE events e
SET category = b.category
FROM events_category_backup b
WHERE e.id = b.id;

-- Restore user preferences from backup
DELETE FROM user_event_preferences;
INSERT INTO user_event_preferences SELECT * FROM user_event_preferences_backup;

-- Drop new fields
ALTER TABLE events DROP COLUMN IF EXISTS event_category;
ALTER TABLE events DROP COLUMN IF EXISTS music_genre;

-- Drop new tables
DROP TABLE IF EXISTS event_category_definitions;
DROP TABLE IF EXISTS music_genre_definitions;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

