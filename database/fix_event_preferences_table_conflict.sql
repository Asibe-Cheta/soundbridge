-- Fix Event Preferences Table Conflict
-- There's a naming conflict: user_event_preferences already exists for notifications
-- This script checks and handles the conflict
-- Date: December 2024

-- Step 1: Check if user_event_preferences table exists and what columns it has
DO $$
DECLARE
    table_exists BOOLEAN;
    has_event_type_id BOOLEAN;
    has_notification_columns BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_event_preferences'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Check what columns exist
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_event_preferences' 
            AND column_name = 'event_type_id'
        ) INTO has_event_type_id;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_event_preferences' 
            AND column_name = 'push_notifications_enabled'
        ) INTO has_notification_columns;
        
        -- If it's the notification preferences table (has push_notifications_enabled)
        IF has_notification_columns AND NOT has_event_type_id THEN
            RAISE NOTICE 'Table user_event_preferences exists but is for notifications, not event types';
            RAISE NOTICE 'Renaming notification table to user_notification_preferences...';
            
            -- Rename the existing notification preferences table
            ALTER TABLE IF EXISTS user_event_preferences RENAME TO user_notification_preferences;
            
            -- Rename indexes (handle errors gracefully)
            BEGIN
                ALTER INDEX IF EXISTS idx_user_event_prefs_user_id RENAME TO idx_user_notification_prefs_user_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Index idx_user_event_prefs_user_id does not exist or already renamed';
            END;
            
            BEGIN
                ALTER INDEX IF EXISTS idx_user_event_prefs_push_enabled RENAME TO idx_user_notification_prefs_push_enabled;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Index idx_user_event_prefs_push_enabled does not exist or already renamed';
            END;
            
            BEGIN
                ALTER INDEX IF EXISTS idx_user_event_prefs_latitude RENAME TO idx_user_notification_prefs_latitude;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Index idx_user_event_prefs_latitude does not exist or already renamed';
            END;
            
            BEGIN
                ALTER INDEX IF EXISTS idx_user_event_prefs_longitude RENAME TO idx_user_notification_prefs_longitude;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Index idx_user_event_prefs_longitude does not exist or already renamed';
            END;
            
            RAISE NOTICE 'Notification preferences table renamed successfully';
        END IF;
    END IF;
END $$;

-- Step 2: Ensure event_types table exists first
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

-- Step 3: Now create the event preferences table (for event types)
-- Drop existing table if it has wrong structure (notification table)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_event_preferences' 
        AND column_name = 'push_notifications_enabled'
    ) THEN
        -- This is the notification table, should have been renamed above
        -- But if it wasn't, we'll drop it (data will be lost - user should backup first)
        RAISE WARNING 'Dropping notification preferences table - data will be lost!';
        DROP TABLE IF EXISTS user_event_preferences CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_event_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    preference_strength INTEGER DEFAULT 1 CHECK (preference_strength >= 1 AND preference_strength <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_type_id)
);

-- Step 4: Add event_type_id column if table exists but column is missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_event_preferences' 
        AND column_name = 'event_type_id'
    ) THEN
        -- Check if table has notification columns (wrong table)
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_event_preferences' 
            AND column_name = 'push_notifications_enabled'
        ) THEN
            RAISE EXCEPTION 'Table user_event_preferences exists but is for notifications. Please run the rename script first.';
        ELSE
            -- Table exists but missing event_type_id - add it
            ALTER TABLE user_event_preferences 
            ADD COLUMN event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE;
            
            -- Make it NOT NULL if there's no data
            -- First check if table has data
            IF (SELECT COUNT(*) FROM user_event_preferences) = 0 THEN
                ALTER TABLE user_event_preferences 
                ALTER COLUMN event_type_id SET NOT NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_user_id ON user_event_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_event_type_id ON user_event_preferences(event_type_id);
CREATE INDEX IF NOT EXISTS idx_user_event_prefs_created_at ON user_event_preferences(created_at DESC);

-- Step 6: Verify
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_event_preferences' 
        AND column_name = 'event_type_id'
    ) THEN
        RAISE EXCEPTION 'Column event_type_id does not exist after migration';
    END IF;
    
    RAISE NOTICE '✅ Migration complete: event_type_id column verified';
END $$;

SELECT 'Migration complete: user_event_preferences table ready for event types' AS status;
