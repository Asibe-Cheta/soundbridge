-- =====================================================
-- DIAGNOSTIC: Posts RLS Policy Investigation
-- =====================================================
-- Date: December 18, 2025
-- Purpose: Diagnose why feed posts are not showing
-- Related: user_roles RLS infinite recursion fix
-- =====================================================

-- =====================================================
-- STEP 1: Check Current RLS Policies on Posts Table
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_clause,
  with_check AS with_check_clause,
  CASE 
    WHEN qual LIKE '%user_roles%' THEN '⚠️ REFERENCES user_roles'
    WHEN qual LIKE '%connections%' THEN '⚠️ REFERENCES connections'
    ELSE '✅ No circular reference detected'
  END AS potential_issue
FROM pg_policies
WHERE tablename = 'posts'
ORDER BY cmd, policyname;

-- =====================================================
-- STEP 2: Check Connections Table RLS Policies
-- =====================================================
-- If posts policy queries connections, we need to check connections too

SELECT 
  tablename,
  policyname,
  cmd,
  qual AS using_clause,
  CASE 
    WHEN qual LIKE '%user_roles%' THEN '⚠️ REFERENCES user_roles'
    WHEN qual LIKE '%posts%' THEN '⚠️ REFERENCES posts (circular!)'
    ELSE '✅ No circular reference detected'
  END AS potential_issue
FROM pg_policies
WHERE tablename = 'connections'
ORDER BY cmd, policyname;

-- =====================================================
-- STEP 3: Test Direct Query (Should Work)
-- =====================================================
-- This will show if RLS is blocking the query

SELECT 
  COUNT(*) AS total_posts,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_posts,
  COUNT(*) FILTER (WHERE visibility = 'public' AND deleted_at IS NULL) AS public_posts,
  COUNT(*) FILTER (WHERE user_id = auth.uid() AND deleted_at IS NULL) AS my_posts
FROM posts;

-- =====================================================
-- STEP 4: Test Query Matching Feed Logic
-- =====================================================
-- This simulates what the mobile app feed query does

SELECT 
  id,
  content,
  user_id,
  visibility,
  created_at,
  deleted_at
FROM posts
WHERE deleted_at IS NULL
  AND (
    visibility = 'public'
    OR user_id = auth.uid()
    OR user_id IN (
      SELECT connected_user_id FROM connections 
      WHERE user_id = auth.uid() AND status = 'connected'
      UNION
      SELECT user_id FROM connections 
      WHERE connected_user_id = auth.uid() AND status = 'connected'
    )
  )
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 5: Check if is_admin_user() Function Exists
-- =====================================================
-- This function was created in the audio_tracks fix

SELECT 
  proname AS function_name,
  prosrc AS function_source,
  CASE 
    WHEN prosrc LIKE '%SECURITY DEFINER%' THEN '✅ SECURITY DEFINER (safe)'
    ELSE '⚠️ Not SECURITY DEFINER'
  END AS security_type
FROM pg_proc
WHERE proname = 'is_admin_user';

-- =====================================================
-- STEP 6: Check for Recent Policy Changes
-- =====================================================
-- Look for policies that might have been added recently

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%user_roles%' THEN '⚠️ May cause circular dependency'
    ELSE '✅ OK'
  END AS status
FROM pg_policies
WHERE tablename IN ('posts', 'post_reactions', 'post_comments', 'post_attachments')
  AND qual LIKE '%user_roles%'
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 7: Check Connections Table RLS Status
-- =====================================================

SELECT 
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '⚠️ RLS Disabled'
  END AS status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'connections';

-- =====================================================
-- STEP 8: Test Connections Query (Used by Posts Policy)
-- =====================================================
-- This tests if the connections query in posts policy works

SELECT 
  COUNT(*) AS connection_count,
  COUNT(DISTINCT connected_user_id) AS unique_connections
FROM connections
WHERE user_id = auth.uid() 
  AND status = 'connected';

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
DECLARE
  posts_count INTEGER;
  policies_count INTEGER;
  has_user_roles_ref BOOLEAN;
BEGIN
  -- Count posts
  SELECT COUNT(*) INTO posts_count
  FROM posts
  WHERE deleted_at IS NULL;
  
  -- Count policies
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'posts';
  
  -- Check for user_roles references
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'posts'
    AND qual LIKE '%user_roles%'
  ) INTO has_user_roles_ref;
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'POSTS RLS DIAGNOSTIC SUMMARY';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Active Posts: %', posts_count;
  RAISE NOTICE 'RLS Policies on posts: %', policies_count;
  RAISE NOTICE 'References user_roles: %', 
    CASE WHEN has_user_roles_ref THEN 'YES ⚠️' ELSE 'NO ✅' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  IF has_user_roles_ref THEN
    RAISE NOTICE '⚠️ Posts policies reference user_roles - may cause circular dependency';
    RAISE NOTICE '   → Run FIX_POSTS_RLS_POLICIES.sql to fix';
  ELSIF posts_count = 0 THEN
    RAISE NOTICE '⚠️ No posts found - check if posts exist in database';
    RAISE NOTICE '   → Run: SELECT * FROM posts;';
  ELSE
    RAISE NOTICE '✅ No obvious RLS issues detected';
    RAISE NOTICE '   → Check mobile app query logic';
    RAISE NOTICE '   → Check API endpoint logs';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
END $$;

