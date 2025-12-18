-- ============================================================
-- FIX BOOKMARKS TABLE RLS POLICIES
-- ============================================================
-- Date: December 18, 2025
-- Issue: Missing RLS policies causing 42501 errors
-- Error: "new row violates row-level security policy for table 'bookmarks'"
-- 
-- Run this in Supabase SQL Editor to fix the issue
-- ============================================================

-- Step 1: Check current policies (for verification)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bookmarks';

-- Step 2: Ensure table exists and RLS is enabled
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('track', 'event', 'post')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, content_id, content_type)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Bookmarks are viewable by everyone" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON bookmarks;

-- Step 4: Create RLS policies

-- Policy 1: Allow users to INSERT their own bookmarks
CREATE POLICY "Users can create their own bookmarks"
ON bookmarks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow users to SELECT their own bookmarks
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

-- Step 5: Verify policies were created
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN 'Allow user to save bookmarks'
    WHEN cmd = 'SELECT' THEN 'Allow user to view saved items'
    WHEN cmd = 'DELETE' THEN 'Allow user to unsave bookmarks'
  END as description
FROM pg_policies 
WHERE tablename = 'bookmarks'
ORDER BY cmd;

-- Expected Output:
-- policyname                             | cmd    | description
-- ---------------------------------------|--------|----------------------------------
-- Users can create their own bookmarks   | INSERT | Allow user to save bookmarks
-- Users can view their own bookmarks     | SELECT | Allow user to view saved items
-- Users can delete their own bookmarks   | DELETE | Allow user to unsave bookmarks

