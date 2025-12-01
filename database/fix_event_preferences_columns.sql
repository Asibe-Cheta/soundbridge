-- Fix Event Preferences Columns
-- Ensures event_type_id column exists in user_event_preferences table
-- Date: December 2024

-- Check if user_event_preferences table exists, if not create it
CREATE TABLE IF NOT EXISTS user_event_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    preference_strength INTEGER DEFAULT 1 CHECK (preference_strength >= 1 AND preference_strength <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_type_id)
);

-- Add event_type_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_event_preferences' 
        AND column_name = 'event_type_id'
    ) THEN
        ALTER TABLE user_event_preferences 
        ADD COLUMN event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE;
        
        -- If there's existing data with a different column name, migrate it
        -- (This is a safety check - adjust based on your actual column name if different)
    END IF;
END $$;

-- Ensure event_types table exists first
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_user_id ON user_event_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_event_type_id ON user_event_preferences(event_type_id);
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_created_at ON user_event_preferences(created_at DESC);

-- Verify the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_event_preferences' 
        AND column_name = 'event_type_id'
    ) THEN
        RAISE EXCEPTION 'Column event_type_id still does not exist after migration';
    END IF;
END $$;

SELECT 'Migration complete: event_type_id column verified' AS status;
