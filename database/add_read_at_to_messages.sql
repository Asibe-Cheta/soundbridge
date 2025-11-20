-- ================================================
-- Add read_at column to messages table
-- ================================================

-- Check if the column already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'read_at'
    ) THEN
        -- Add the read_at column
        ALTER TABLE messages 
        ADD COLUMN read_at TIMESTAMPTZ;
        
        RAISE NOTICE '✅ Added read_at column to messages table';
    ELSE
        RAISE NOTICE 'ℹ️ read_at column already exists';
    END IF;
END $$;

-- ================================================
-- Verify the column was added
-- ================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'messages'
    AND column_name = 'read_at';

