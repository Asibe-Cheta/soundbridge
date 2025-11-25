-- Extend Bookmarks Table for Posts
-- Create bookmarks table if it doesn't exist, or extend it to support 'post' content type
-- Date: November 25, 2025

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);

-- Drop the existing CHECK constraint if it exists
ALTER TABLE bookmarks 
  DROP CONSTRAINT IF EXISTS bookmarks_content_type_check;

-- Add new CHECK constraint that includes 'post'
ALTER TABLE bookmarks 
  ADD CONSTRAINT bookmarks_content_type_check 
  CHECK (content_type IN ('track', 'event', 'post'));

-- Enable RLS if not already enabled
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (idempotent - drop and recreate)
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Bookmarks are viewable by everyone" ON bookmarks;
  DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON bookmarks;
  DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

  -- Policy for SELECT: Users can view all bookmarks
  CREATE POLICY "Bookmarks are viewable by everyone" 
    ON bookmarks FOR SELECT 
    USING (true);

  -- Policy for INSERT: Users can only insert their own bookmarks
  CREATE POLICY "Users can insert their own bookmarks" 
    ON bookmarks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

  -- Policy for DELETE: Users can only delete their own bookmarks
  CREATE POLICY "Users can delete their own bookmarks" 
    ON bookmarks FOR DELETE 
    USING (auth.uid() = user_id);
END $$;

-- Add comment
COMMENT ON COLUMN bookmarks.content_type IS 'Content type: track, event, or post';

