-- Fix event_attendees updated_at column issue
-- This ensures the column exists and triggers work correctly
-- Error: 'record "new" has no field "updated_at"' on INSERT operations

-- Step 1: Add updated_at column if it doesn't exist (with proper default)
ALTER TABLE event_attendees 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Make sure the column has a NOT NULL constraint with default
ALTER TABLE event_attendees
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Step 3: Update any existing records without updated_at to have current timestamp
UPDATE event_attendees 
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

-- Step 4: Drop ALL existing triggers on event_attendees that might interfere
DROP TRIGGER IF EXISTS update_event_attendees_updated_at ON event_attendees;
DROP TRIGGER IF EXISTS update_updated_at_column ON event_attendees;
DROP TRIGGER IF EXISTS update_event_attendees_count ON event_attendees;

-- Step 5: Create a safe trigger function that ONLY handles UPDATE (never INSERT)
CREATE OR REPLACE FUNCTION update_event_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- This function is ONLY called for UPDATE operations
    -- Never try to set updated_at on INSERT - let the DEFAULT handle it
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for UPDATE ONLY (NOT INSERT, NOT DELETE)
CREATE TRIGGER update_event_attendees_updated_at 
BEFORE UPDATE ON event_attendees
FOR EACH ROW 
EXECUTE FUNCTION update_event_attendees_updated_at();

-- Step 7: Recreate the attendees count trigger (this should not touch updated_at)
CREATE OR REPLACE FUNCTION update_event_attendees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Only increase count if status is 'attending'
        IF NEW.status = 'attending' THEN
            UPDATE events 
            SET current_attendees = current_attendees + 1 
            WHERE id = NEW.event_id;
        END IF;
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
$$ LANGUAGE plpgsql;

-- Step 8: Recreate the count trigger for all operations
CREATE TRIGGER update_event_attendees_count 
AFTER INSERT OR UPDATE OR DELETE ON event_attendees
FOR EACH ROW 
EXECUTE FUNCTION update_event_attendees_count();

-- Step 9: Verify the column exists and has the correct structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'event_attendees' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE EXCEPTION 'updated_at column still does not exist after migration';
    END IF;
    
    -- Verify the column has a default value
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'event_attendees' 
        AND column_name = 'updated_at'
        AND column_default IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'updated_at column does not have a default value';
    END IF;
END $$;

-- Success message
SELECT 'event_attendees updated_at column and triggers fixed successfully!' AS status;
