-- =====================================================
-- FIX: Posts RLS Policies (Feed Posts Not Showing)
-- =====================================================
-- Date: December 18, 2025
-- Issue: Feed posts not showing after audio_tracks RLS fix
-- Purpose: Ensure posts RLS policies work correctly
-- Related: user_roles RLS infinite recursion fix
-- =====================================================

-- =====================================================
-- STEP 1: Ensure is_admin_user() Function Exists
-- =====================================================
-- This function was created in the audio_tracks fix
-- We'll reuse it for posts admin access

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO anon;

-- =====================================================
-- STEP 2: Drop Existing Posts Policies
-- =====================================================
-- We'll recreate them to ensure they're correct

DROP POLICY IF EXISTS "Users can view connection posts" ON posts;
DROP POLICY IF EXISTS "Admins can view all posts" ON posts;
DROP POLICY IF EXISTS "view_posts" ON posts;
DROP POLICY IF EXISTS "view_posts_simple" ON posts;
DROP POLICY IF EXISTS "view_posts_with_admin_check" ON posts;
DROP POLICY IF EXISTS "view_posts_with_admin_function" ON posts;

-- =====================================================
-- STEP 3: Create Fixed Posts SELECT Policy
-- =====================================================
-- This policy allows:
-- 1. Users to see their own posts
-- 2. Users to see public posts
-- 3. Users to see posts from connections
-- 4. Admins to see all posts (using safe function)

CREATE POLICY "Users can view connection posts"
ON posts FOR SELECT
USING (
  deleted_at IS NULL AND (
    -- User's own posts
    user_id = auth.uid()
    OR
    -- Public posts
    visibility = 'public'
    OR
    -- Posts from connections
    user_id IN (
      SELECT connected_user_id 
      FROM connections 
      WHERE user_id = auth.uid() 
        AND status = 'connected'
      UNION
      SELECT user_id 
      FROM connections 
      WHERE connected_user_id = auth.uid() 
        AND status = 'connected'
    )
    OR
    -- Admins can see all posts (using safe function)
    is_admin_user() = true
  )
);

-- =====================================================
-- STEP 4: Ensure Other Posts Policies Are Correct
-- =====================================================

-- INSERT policy (should already be correct)
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
CREATE POLICY "Users can insert own posts"
ON posts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE policy (ensure it has WITH CHECK clause)
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (user_id = auth.uid() OR is_admin_user() = true)
WITH CHECK (user_id = auth.uid() OR is_admin_user() = true);

-- DELETE policy
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (user_id = auth.uid() OR is_admin_user() = true);

-- =====================================================
-- STEP 5: Fix Post Attachments Policies
-- =====================================================
-- These reference posts, so they need to work correctly

DROP POLICY IF EXISTS "Users can view attachments" ON post_attachments;
CREATE POLICY "Users can view attachments"
ON post_attachments FOR SELECT
USING (
  post_id IN (
    SELECT id FROM posts 
    WHERE deleted_at IS NULL 
      AND (
        user_id = auth.uid()
        OR visibility = 'public'
        OR user_id IN (
          SELECT connected_user_id FROM connections 
          WHERE user_id = auth.uid() AND status = 'connected'
          UNION
          SELECT user_id FROM connections 
          WHERE connected_user_id = auth.uid() AND status = 'connected'
        )
        OR is_admin_user() = true
      )
  )
);

-- =====================================================
-- STEP 6: Fix Post Comments Policies
-- =====================================================
-- Comments should be visible if the post is visible

DROP POLICY IF EXISTS "Users can view comments" ON post_comments;
CREATE POLICY "Users can view comments"
ON post_comments FOR SELECT
USING (
  post_id IN (
    SELECT id FROM posts 
    WHERE deleted_at IS NULL 
      AND (
        user_id = auth.uid()
        OR visibility = 'public'
        OR user_id IN (
          SELECT connected_user_id FROM connections 
          WHERE user_id = auth.uid() AND status = 'connected'
          UNION
          SELECT user_id FROM connections 
          WHERE connected_user_id = auth.uid() AND status = 'connected'
        )
        OR is_admin_user() = true
      )
  )
);

-- =====================================================
-- STEP 7: Verify Connections Table RLS
-- =====================================================
-- Ensure connections table RLS doesn't cause issues
-- If connections table has RLS that references user_roles,
-- we need to fix that too

-- Check if connections table has problematic policies
DO $$
DECLARE
  has_circular_ref BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'connections'
    AND qual LIKE '%user_roles%'
  ) INTO has_circular_ref;
  
  IF has_circular_ref THEN
    RAISE NOTICE '⚠️ Connections table has policies referencing user_roles';
    RAISE NOTICE '   This may cause circular dependency with posts policy';
    RAISE NOTICE '   Consider fixing connections RLS policies separately';
  ELSE
    RAISE NOTICE '✅ Connections table policies look OK';
  END IF;
END $$;

-- =====================================================
-- STEP 8: Verification
-- =====================================================

DO $$
DECLARE
  posts_count INTEGER;
  policies_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  -- Count posts
  SELECT COUNT(*) INTO posts_count
  FROM posts
  WHERE deleted_at IS NULL;
  
  -- Count policies
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'posts';
  
  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_admin_user'
  ) INTO function_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ POSTS RLS POLICIES FIXED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- Active posts: %', posts_count;
  RAISE NOTICE '- RLS policies on posts: %', policies_count;
  RAISE NOTICE '- is_admin_user() function: %', 
    CASE WHEN function_exists THEN '✅ Exists' ELSE '❌ Missing' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Testing:';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 1: Query public posts';
  RAISE NOTICE 'SELECT COUNT(*) FROM posts WHERE visibility = ''public'' AND deleted_at IS NULL;';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 2: Query your posts';
  RAISE NOTICE 'SELECT COUNT(*) FROM posts WHERE user_id = auth.uid() AND deleted_at IS NULL;';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 3: Query feed (simulates mobile app)';
  RAISE NOTICE 'SELECT * FROM posts WHERE deleted_at IS NULL AND (visibility = ''public'' OR user_id = auth.uid()) ORDER BY created_at DESC LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
END $$;

