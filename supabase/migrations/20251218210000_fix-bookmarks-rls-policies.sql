-- Fix Bookmarks Table RLS Policies
-- Date: December 18, 2025
-- Issue: Missing RLS policies causing 42501 errors when users try to save bookmarks
-- Solution: Create proper RLS policies for INSERT, SELECT, and DELETE operations

-- Ensure table exists (should already exist, but safe to check)
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('track', 'event', 'post')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, content_id, content_type)
);

-- Enable RLS if not already enabled
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Bookmarks are viewable by everyone" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON bookmarks;

-- Policy 1: Allow users to INSERT their own bookmarks
CREATE POLICY "Users can create their own bookmarks"
ON bookmarks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow users to SELECT their own bookmarks
-- Note: Using auth.uid() = user_id for privacy (users can only see their own bookmarks)
-- If you need public bookmark counts, you can add a separate policy for that
CREATE POLICY "Users can view their own bookmarks"
ON bookmarks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3: Allow users to DELETE their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
ON bookmarks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE bookmarks IS 'User bookmarks/saved items for tracks, events, and posts';
COMMENT ON COLUMN bookmarks.content_type IS 'Content type: track, event, or post';

