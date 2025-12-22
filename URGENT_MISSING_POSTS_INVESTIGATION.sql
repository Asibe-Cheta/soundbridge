-- ============================================================================
-- 🚨 URGENT: Missing Posts Investigation
-- ============================================================================
-- Date: December 22, 2025
-- Issue: Feed API returning 0 posts even though posts exist
-- Mobile Team Reporter: Critical production issue
--
-- Run these queries in Supabase SQL Editor to diagnose the issue
-- ============================================================================

-- ============================================================================
-- 1. CHECK IF POSTS EXIST IN DATABASE
-- ============================================================================

SELECT 
  COUNT(*) as total_posts,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_posts,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted_posts
FROM posts;

-- Expected: Should show posts exist with deleted_at = NULL

-- ============================================================================
-- 2. CHECK POST VISIBILITY DISTRIBUTION
-- ============================================================================

SELECT 
  visibility,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM posts
WHERE deleted_at IS NULL
GROUP BY visibility
ORDER BY count DESC;

-- Expected: Shows breakdown of 'public' vs 'connections' posts
-- 🚨 THIS IS LIKELY THE ISSUE: Default visibility is 'connections', not 'public'

-- ============================================================================
-- 3. CHECK RECENT POSTS WITH DETAILS
-- ============================================================================

SELECT 
  id,
  user_id,
  LEFT(content, 100) as content_preview,
  visibility,
  post_type,
  created_at,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '🔴 SOFT DELETED'
    WHEN visibility = 'public' THEN '✅ PUBLIC'
    WHEN visibility = 'connections' THEN '⚠️ CONNECTIONS ONLY'
    ELSE '❓ UNKNOWN'
  END as status
FROM posts
ORDER BY created_at DESC
LIMIT 20;

-- Expected: Recent posts should be active (deleted_at = NULL)

-- ============================================================================
-- 4. CHECK POSTS FROM SPECIFIC MOBILE USERS
-- ============================================================================

SELECT 
  p.id,
  p.user_id,
  prof.display_name,
  prof.username,
  LEFT(p.content, 80) as content_preview,
  p.visibility,
  p.post_type,
  p.created_at,
  p.deleted_at,
  CASE 
    WHEN p.deleted_at IS NOT NULL THEN '❌ DELETED'
    WHEN p.visibility = 'public' THEN '✅ VISIBLE IN FEED'
    WHEN p.visibility = 'connections' THEN '⚠️ ONLY CONNECTIONS SEE IT'
  END as feed_visibility_status
FROM posts p
LEFT JOIN profiles prof ON p.user_id = prof.id
WHERE p.user_id IN (
  'a39e95f8-2433-4064-bacb-3006fbec304c',  -- asibecheta2@gmail.com
  'c9119aff-cfdf-4fbc-9d7d-6178f1f02bba',  -- bervicweb@gmail.com
  '295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce',  -- bervicdigital@gmail.com
  'fdbf70f0-ceda-45f4-bb31-156f69e5fc12',  -- bervicgroup@gmail.com
  '812c973d-c345-4ce4-9aeb-1ea74e6008f7'   -- asibejustice@gmail.com
)
ORDER BY p.created_at DESC;

-- Expected: Shows posts from these 5 mobile users

-- ============================================================================
-- 5. CHECK RLS POLICIES ON POSTS TABLE
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'posts'
ORDER BY policyname;

-- Expected: Should show RLS policy that allows viewing public OR connection posts

-- ============================================================================
-- 6. CHECK IF CONNECTIONS TABLE EXISTS AND HAS DATA
-- ============================================================================

SELECT 
  COUNT(*) as total_connections,
  COUNT(DISTINCT user_id) as unique_users_with_connections,
  COUNT(DISTINCT connected_user_id) as unique_connected_users
FROM connections
WHERE status = 'connected';

-- Expected: Shows if users have connections

-- ============================================================================
-- 7. TEST WHAT THE FEED API QUERY RETURNS
-- ============================================================================

-- This simulates what the current broken feed API is querying
-- (Only fetching 'public' posts)
SELECT 
  COUNT(*) as posts_returned_by_current_api
FROM posts
WHERE deleted_at IS NULL
  AND visibility = 'public';  -- 🚨 THIS IS THE PROBLEM!

-- Expected: Returns 0 (because all posts have visibility = 'connections')

-- ============================================================================
-- 8. TEST WHAT THE FEED API *SHOULD* QUERY
-- ============================================================================

-- This is what the feed should query (both public AND connections)
SELECT 
  COUNT(*) as posts_that_should_be_returned
FROM posts
WHERE deleted_at IS NULL
  AND visibility IN ('public', 'connections');

-- Expected: Returns the actual number of posts

-- ============================================================================
-- 9. CHECK POST TYPE DISTRIBUTION
-- ============================================================================

SELECT 
  post_type,
  COUNT(*) as count
FROM posts
WHERE deleted_at IS NULL
GROUP BY post_type
ORDER BY count DESC;

-- Shows breakdown of post types

-- ============================================================================
-- 10. CHECK IF POSTS HAVE REQUIRED FIELDS
-- ============================================================================

SELECT 
  COUNT(*) as total_posts,
  COUNT(CASE WHEN content IS NULL OR content = '' THEN 1 END) as posts_without_content,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as posts_without_user_id,
  COUNT(CASE WHEN visibility IS NULL THEN 1 END) as posts_without_visibility
FROM posts
WHERE deleted_at IS NULL;

-- Expected: All posts should have required fields

-- ============================================================================
-- 💡 ROOT CAUSE ANALYSIS
-- ============================================================================

/*
🚨 **ROOT CAUSE IDENTIFIED:**

The feed API endpoint is querying:
  .eq('visibility', 'public')

But the posts table schema has:
  visibility VARCHAR(20) NOT NULL DEFAULT 'connections'

So when mobile users create posts WITHOUT explicitly setting visibility,
they get visibility = 'connections' (the default).

The feed API is ONLY fetching 'public' posts, so it returns 0 results!

📝 **SOLUTION:**

Option 1 (Recommended): Let RLS handle visibility
  - Remove the explicit .eq('visibility', 'public') filter
  - Let the RLS policy determine what posts users can see
  - RLS policy already correctly handles public + connection posts

Option 2: Update API to query both visibility types
  - Change .eq('visibility', 'public') to .in('visibility', ['public', 'connections'])
  - Then filter out connection posts based on user connections
  - More complex and slower than Option 1

Option 3: Change all existing posts to 'public'
  - Quick fix: UPDATE posts SET visibility = 'public' WHERE deleted_at IS NULL
  - Not recommended: Violates user privacy expectations
  - Only do this if posts were MEANT to be public

✅ **RECOMMENDED FIX:** Option 1 (see FIX_FEED_API_VISIBILITY.md)
*/

-- ============================================================================
-- 🔧 TEMPORARY FIX (if needed for immediate resolution)
-- ============================================================================

-- ⚠️ ONLY RUN THIS IF YOU WANT TO MAKE ALL POSTS PUBLIC
-- This is NOT recommended unless posts were meant to be public
-- 
-- UPDATE posts 
-- SET visibility = 'public' 
-- WHERE deleted_at IS NULL 
--   AND visibility = 'connections';
--
-- This will make all posts visible to everyone (not just connections)

-- ============================================================================
-- END OF INVESTIGATION
-- ============================================================================

-- Run queries 1-8 to understand the current state
-- Then apply the fix in FIX_FEED_API_VISIBILITY.md

