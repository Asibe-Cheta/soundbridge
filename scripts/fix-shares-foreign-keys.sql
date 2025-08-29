-- Fix foreign key constraints for shares table
-- This script adds proper foreign key constraints for content_id references

-- First, let's check if the shares table exists and its current structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'shares' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'shares';

-- Add foreign key constraints for content_id
-- Note: We can't add a direct foreign key constraint since content_id can reference either audio_tracks or events
-- Instead, we'll create a check constraint to ensure the content exists

-- Create a function to validate content_id references
CREATE OR REPLACE FUNCTION validate_content_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content_type = 'track' THEN
        IF NOT EXISTS (SELECT 1 FROM audio_tracks WHERE id = NEW.content_id) THEN
            RAISE EXCEPTION 'Content ID % does not exist in audio_tracks table', NEW.content_id;
        END IF;
    ELSIF NEW.content_type = 'event' THEN
        IF NOT EXISTS (SELECT 1 FROM events WHERE id = NEW.content_id) THEN
            RAISE EXCEPTION 'Content ID % does not exist in events table', NEW.content_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid content_type: %', NEW.content_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate content references
DROP TRIGGER IF EXISTS validate_content_reference_trigger ON shares;
CREATE TRIGGER validate_content_reference_trigger
    BEFORE INSERT OR UPDATE ON shares
    FOR EACH ROW
    EXECUTE FUNCTION validate_content_reference();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shares_content_id ON shares(content_id);
CREATE INDEX IF NOT EXISTS idx_shares_content_type ON shares(content_type);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);

-- Verify the trigger was created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'shares';
