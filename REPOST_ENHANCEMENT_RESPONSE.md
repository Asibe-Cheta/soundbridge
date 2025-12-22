# Response to Mobile Team: Repost Feature Enhancement Tickets

## Date: December 19, 2025
## From: Web Team
## Topic: Review and Implementation Plan for Repost Enhancements

---

## Executive Summary

Thank you for the detailed enhancement tickets! We've reviewed all 4 tickets and are providing feedback, feasibility assessment, and implementation guidance. **All tickets are feasible and well-scoped.**

**Priority Assessment:**
- ✅ **Ticket 1 (Toggle Behavior):** High priority - Agreed
- ✅ **Ticket 2 (user_reposted field):** High priority - Agreed  
- ✅ **Ticket 3 (Notifications):** Medium priority - Agreed
- ⚠️ **Ticket 4 (Restrictions):** Low priority - Needs product decision

**Estimated Total Effort:** 8-11 hours (matches your estimate)

---

## Ticket 1: Add DELETE Endpoint for Un-Reposting (Toggle Behavior)

### Status: ✅ APPROVED - High Priority

### Feedback

**Excellent proposal!** Option A (separate `post_reposts` table) is the **recommended approach** for the following reasons:

1. ✅ **Better UX:** Matches user expectations (toggle like reactions)
2. ✅ **Data integrity:** Tracks repost relationships explicitly
3. ✅ **Performance:** Easy to query "has user reposted?"
4. ✅ **Scalability:** Can add features like "who reposted" list

### Implementation Notes

#### 1. Database Schema (Refined)

Your proposed schema is solid. Here's a refined version with some improvements:

```sql
-- Create post_reposts table
CREATE TABLE IF NOT EXISTS post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repost_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One repost per user per post
  UNIQUE(post_id, user_id),
  
  -- Ensure repost_post_id is unique (one repost post can only be linked once)
  UNIQUE(repost_post_id),
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (repost_post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id ON post_reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_user_id ON post_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_repost_post_id ON post_reposts(repost_post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_user ON post_reposts(post_id, user_id); -- Composite for "has user reposted?" queries

-- RLS Policies
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;

-- Users can view all reposts (for "who reposted" features)
CREATE POLICY "post_reposts_select_policy" ON post_reposts
  FOR SELECT USING (true);

-- Users can create their own reposts
CREATE POLICY "post_reposts_insert_policy" ON post_reposts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reposts
CREATE POLICY "post_reposts_delete_policy" ON post_reposts
  FOR DELETE USING (auth.uid() = user_id);
```

**Key Changes:**
- Added `UNIQUE(repost_post_id)` to ensure one repost post is only linked once
- Added composite index `(post_id, user_id)` for faster "has user reposted?" queries

#### 2. Migration Strategy

**Important:** We need to backfill existing reposts before deploying the new endpoint.

```sql
-- Backfill existing reposts into post_reposts table
-- This runs AFTER the table is created
INSERT INTO post_reposts (post_id, user_id, repost_post_id)
SELECT 
  reposted_from_id as post_id,
  user_id,
  id as repost_post_id
FROM posts
WHERE reposted_from_id IS NOT NULL
  AND deleted_at IS NULL
ON CONFLICT (post_id, user_id) DO NOTHING; -- Handle duplicates gracefully
```

**Migration Order:**
1. Create `post_reposts` table
2. Backfill existing reposts
3. Deploy new API endpoints
4. Update frontend to use new endpoints

#### 3. API Implementation (DELETE Endpoint)

Here's the implementation for the DELETE endpoint:

```typescript
// apps/web/app/api/posts/[id]/repost/route.ts

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('🗑️ Delete Repost API called for post:', postId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Find user's repost record
    const { data: repostRecord, error: findError } = await supabase
      .from('post_reposts')
      .select('id, repost_post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (findError || !repostRecord) {
      return NextResponse.json(
        { success: false, error: 'Repost not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const repostPostId = repostRecord.repost_post_id;

    // Delete repost post and record in transaction
    // Note: CASCADE will handle post_reposts deletion, but we'll do it explicitly for clarity
    const { error: deleteRepostError } = await supabase
      .from('posts')
      .delete()
      .eq('id', repostPostId)
      .eq('user_id', user.id); // Ensure user owns the repost

    if (deleteRepostError) {
      console.error('❌ Error deleting repost post:', deleteRepostError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete repost', details: deleteRepostError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Delete repost record (CASCADE should handle this, but explicit for safety)
    const { error: deleteRecordError } = await supabase
      .from('post_reposts')
      .delete()
      .eq('id', repostRecord.id);

    // Decrement shares_count on original post (background operation)
    supabase
      .from('posts')
      .select('shares_count')
      .eq('id', postId)
      .single()
      .then(({ data }) => {
        if (data && data.shares_count > 0) {
          return supabase
            .from('posts')
            .update({ shares_count: Math.max(0, (data.shares_count || 0) - 1) })
            .eq('id', postId);
        }
      })
      .catch(() => {}); // Ignore errors in background operation

    console.log('✅ Repost deleted successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          repost_post_id: repostPostId,
          message: 'Repost removed successfully',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error deleting repost:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
```

#### 4. Modify POST Endpoint

Update the POST endpoint to check for existing reposts and create the `post_reposts` record:

```typescript
// In POST /api/posts/[id]/repost

// After creating the new repost post...

// Check if user already reposted (prevent duplicates)
const { data: existingRepost } = await supabase
  .from('post_reposts')
  .select('id')
  .eq('post_id', params.id)
  .eq('user_id', user.id)
  .maybeSingle();

if (existingRepost) {
  // User already reposted - return error
  return NextResponse.json(
    {
      success: false,
      error: 'You have already reposted this post',
      repost_post_id: existingRepost.repost_post_id,
    },
    { status: 409, headers: corsHeaders } // 409 Conflict
  );
}

// Create repost record in post_reposts table
const { error: repostRecordError } = await supabase
  .from('post_reposts')
  .insert({
    post_id: params.id,
    user_id: user.id,
    repost_post_id: newPost.id,
  });

if (repostRecordError) {
  console.error('❌ Error creating repost record:', repostRecordError);
  // Don't fail the request - repost post is already created
  // But log the error for monitoring
}
```

### Testing Checklist (Enhanced)

- [ ] POST repost → Creates repost post + record in `post_reposts`
- [ ] POST repost again → Returns 409 Conflict error
- [ ] DELETE repost → Removes repost post + record
- [ ] DELETE repost (not reposted) → Returns 404
- [ ] DELETE repost → Decrements `shares_count` correctly
- [ ] DELETE repost → Record removed from `post_reposts`
- [ ] Original post deleted → Cascade deletes reposts (test CASCADE)
- [ ] RLS policies working correctly
- [ ] Backfill migration works correctly
- [ ] Concurrent reposts handled (race condition test)

### Acceptance Criteria

✅ All criteria from your ticket, plus:
- ✅ 409 Conflict returned for duplicate reposts
- ✅ Backfill migration completed successfully
- ✅ No data loss during migration
- ✅ Performance: DELETE endpoint < 200ms

---

## Ticket 2: Add `user_reposted` Field to Post API Responses

### Status: ✅ APPROVED - High Priority

### Feedback

**Perfect proposal!** This is essential for good UX. The implementation is straightforward.

### Implementation Notes

#### 1. SQL Query Enhancement

Here's the optimized query for including `user_reposted`:

```sql
-- In feed/post queries
SELECT 
  posts.*,
  -- ... other fields
  
  -- Repost count (from post_reposts table)
  COALESCE(
    (SELECT COUNT(*)::int
     FROM post_reposts
     WHERE post_reposts.post_id = posts.id),
    0
  ) as shares_count,
  
  -- User reposted status
  EXISTS(
    SELECT 1
    FROM post_reposts
    WHERE post_reposts.post_id = posts.id
      AND post_reposts.user_id = $currentUserId
  ) as user_reposted,
  
  -- User's repost post ID (optional, useful for DELETE)
  (
    SELECT repost_post_id
    FROM post_reposts
    WHERE post_reposts.post_id = posts.id
      AND post_reposts.user_id = $currentUserId
    LIMIT 1
  ) as user_repost_id

FROM posts
WHERE ...
```

**Performance Note:** The `EXISTS` subquery is efficient because of the composite index `(post_id, user_id)`.

#### 2. Supabase Query (TypeScript)

```typescript
// In data-service.ts or feed route

// Get current user ID
const currentUserId = user?.id;

// Query posts with repost info
const { data: posts, error } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles!posts_user_id_fkey(*),
    reposted_from:posts!posts_reposted_from_id_fkey(*),
    reposts:post_reposts!post_reposts_post_id_fkey(count),
    user_repost:post_reposts!post_reposts_post_id_fkey(
      id,
      repost_post_id
    )
  `)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(limit);

// Transform response
const transformedPosts = posts?.map(post => ({
  ...post,
  shares_count: post.reposts?.[0]?.count || 0,
  user_reposted: !!post.user_repost?.[0],
  user_repost_id: post.user_repost?.[0]?.repost_post_id || null,
}));
```

**Alternative (More Efficient):**
```typescript
// Use RPC function for better performance
const { data: posts } = await supabase.rpc('get_posts_with_repost_status', {
  current_user_id: currentUserId,
  limit_count: limit,
  offset_count: offset,
});
```

#### 3. Database Function (Optional, for Performance)

If performance becomes an issue, create a database function:

```sql
CREATE OR REPLACE FUNCTION get_posts_with_repost_status(
  current_user_id UUID,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  -- All post fields
  id UUID,
  user_id UUID,
  content TEXT,
  -- ... other fields
  shares_count INT,
  user_reposted BOOLEAN,
  user_repost_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.*,
    COALESCE(pr_count.count, 0)::INT as shares_count,
    COALESCE(pr_user.user_reposted, false) as user_reposted,
    pr_user.repost_post_id as user_repost_id
  FROM posts p
  LEFT JOIN (
    SELECT post_id, COUNT(*) as count
    FROM post_reposts
    GROUP BY post_id
  ) pr_count ON pr_count.post_id = p.id
  LEFT JOIN (
    SELECT post_id, true as user_reposted, repost_post_id
    FROM post_reposts
    WHERE user_id = current_user_id
  ) pr_user ON pr_user.post_id = p.id
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
```

### Affected Endpoints

Update these endpoints:

1. ✅ `GET /api/posts/feed` - Add `user_reposted` field
2. ✅ `GET /api/posts/[id]` - Add `user_reposted` field
3. ✅ `GET /api/users/[id]/posts` - Add `user_reposted` field
4. ✅ `POST /api/posts/[id]/repost` - Return updated post with `user_reposted: true`
5. ✅ `DELETE /api/posts/[id]/repost` - Return updated post with `user_reposted: false`

### Example Response

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post-123",
        "content": "My new track!",
        "shares_count": 5,
        "user_reposted": true,
        "user_repost_id": "post-456",
        "user_reaction": "fire",
        "reactions": {
          "support": 2,
          "love": 1,
          "fire": 3,
          "congrats": 0
        }
      }
    ]
  }
}
```

### Testing Checklist

- [ ] Feed shows `user_reposted` correctly for all posts
- [ ] Post detail shows `user_reposted` correctly
- [ ] After reposting, `user_reposted` becomes `true`
- [ ] After un-reposting, `user_reposted` becomes `false`
- [ ] `user_repost_id` matches actual repost post ID
- [ ] Performance: Query completes in < 100ms
- [ ] Unauthenticated users: `user_reposted` is always `false`

### Acceptance Criteria

✅ All criteria from your ticket, plus:
- ✅ Query performance < 100ms (with indexes)
- ✅ Handles unauthenticated users gracefully
- ✅ `user_repost_id` is null when not reposted

---

## Ticket 3: Send Notifications When Posts Are Reposted

### Status: ✅ APPROVED - Medium Priority

### Feedback

**Great addition!** This will improve engagement. The notification system already exists, so this is straightforward to implement.

### Implementation Notes

#### 1. Notification Type

The notifications table already exists. We need to add `'repost'` to the type enum:

```sql
-- Check current notification types
-- From database_schema.sql, the type enum is:
-- ('follow', 'like', 'comment', 'share', 'collaboration', 'collaboration_request', 'event', 'system')

-- Add 'repost' to the enum (if using CHECK constraint)
-- Or update the CHECK constraint to include 'repost'
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('follow', 'like', 'comment', 'share', 'repost', 'collaboration', 'collaboration_request', 'event', 'system'));
```

**Note:** If using `notification_logs` table (newer system), update that instead.

#### 2. Notification Helper Function

Add to `apps/web/src/lib/post-notifications.ts`:

```typescript
/**
 * Notify post author when someone reposts their post
 */
export async function notifyPostRepost(
  postAuthorId: string,
  reposterName: string,
  postId: string,
  repostId: string
) {
  // Don't notify if user reposted their own post
  // (This check should be done in the API endpoint before calling this)

  return createPostNotification({
    userId: postAuthorId,
    type: 'repost', // Add to CreatePostNotificationParams type
    title: 'New Repost',
    message: `${reposterName} reposted your post`,
    relatedId: postId,
    actionUrl: `/post/${postId}`,
    metadata: {
      post_id: postId,
      repost_id: repostId,
    },
  });
}
```

**Update the type:**
```typescript
interface CreatePostNotificationParams {
  userId: string;
  type: 'post_reaction' | 'post_comment' | 'comment_reply' | 'connection_request' | 'connection_accepted' | 'repost'; // Add 'repost'
  title: string;
  message: string;
  relatedId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}
```

#### 3. Add to Repost Endpoint

```typescript
// In POST /api/posts/[id]/repost route
// After creating repost successfully...

// Send notification to original author (if not own post)
if (originalPost.user_id !== user.id) {
  // Get user profile for display name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .single();

  const userName = userProfile?.display_name || userProfile?.username || 'Someone';
  
  // Send notification (non-blocking)
  notifyPostRepost(
    originalPost.user_id,
    userName,
    originalPost.id,
    newPost.id
  ).catch((err) => {
    console.error('Failed to send repost notification:', err);
    // Don't fail the request if notification fails
  });
}
```

#### 4. Push Notifications (Optional)

If push notifications are implemented:

```typescript
// In notifyPostRepost function or repost endpoint
import { sendPushNotification } from '@/src/lib/push-notifications'; // If exists

// Send push notification
await sendPushNotification({
  user_id: postAuthorId,
  title: 'New Repost',
  body: `${reposterName} reposted your post`,
  data: {
    type: 'repost',
    post_id: postId,
    repost_id: repostId,
  },
}).catch(() => {}); // Don't fail if push fails
```

### Example Notification

```json
{
  "id": "notif-123",
  "user_id": "original-author-uuid",
  "type": "repost",
  "title": "New Repost",
  "message": "Jane Smith reposted your post",
  "related_id": "post-123",
  "action_url": "/post/post-123",
  "metadata": {
    "post_id": "post-123",
    "repost_id": "post-456"
  },
  "is_read": false,
  "created_at": "2025-12-19T21:00:00Z"
}
```

### Testing Checklist

- [ ] Repost sends notification to original author
- [ ] No notification sent when reposting own post
- [ ] Notification includes correct sender info
- [ ] Notification includes post and repost IDs
- [ ] Tapping notification navigates to post correctly
- [ ] Push notification sent (if enabled)
- [ ] Notification marked as read when viewed
- [ ] Notification appears in notification list
- [ ] Multiple reposts create multiple notifications (expected behavior)

### Acceptance Criteria

✅ All criteria from your ticket, plus:
- ✅ Notification uses correct type (`'repost'`)
- ✅ Notification deep links to original post (not repost)
- ✅ Notification failure doesn't break repost functionality
- ✅ Similar format to existing reaction notifications

---

## Ticket 4: Add Backend Validation for Repost Restrictions

### Status: ⚠️ DEFERRED - Needs Product Decision

### Feedback

**Good thinking!** However, we need product/UX team input before implementing restrictions. The current behavior (no restrictions) matches LinkedIn/Twitter, which may be intentional.

### Questions for Product Team

1. **Should users be able to repost their own posts?**
   - **Current:** Allowed
   - **LinkedIn/Twitter:** Allowed (called "quote tweet" on Twitter)
   - **Use case:** Resharing old content, amplifying own posts

2. **Should users be able to repost reposts?**
   - **Current:** Allowed (chain reposting)
   - **LinkedIn/Twitter:** Allowed
   - **Use case:** Amplifying someone's repost

3. **Should private posts be repostable?**
   - **Current:** Repost inherits visibility (private stays private)
   - **Alternative:** Only public posts can be reposted
   - **Consideration:** Privacy concerns

### Recommendation

**For MVP:** Keep current behavior (no restrictions)

**Rationale:**
- Matches industry standards (LinkedIn, Twitter)
- More flexible for users
- Can add restrictions later based on user feedback
- Easier to restrict later than to remove restrictions

**For Future:** Implement restrictions only if:
- User feedback indicates problems
- Product team decides restrictions are needed
- Analytics show abuse patterns

### Implementation (If Approved)

If restrictions are approved, here's the implementation:

```typescript
// In POST /api/posts/[id]/repost route
// Add validation checks

// Option A: Prevent reposting own posts
if (originalPost.user_id === user.id) {
  return NextResponse.json(
    { success: false, error: 'You cannot repost your own posts' },
    { status: 403, headers: corsHeaders }
  );
}

// Option B: Prevent chain reposting
if (originalPost.reposted_from_id) {
  return NextResponse.json(
    {
      success: false,
      error: 'You can only repost original posts, not reposts',
      original_post_id: originalPost.reposted_from_id,
    },
    { status: 403, headers: corsHeaders }
  );
}

// Option C: Restrict private post reposts
if (originalPost.visibility === 'connections') {
  // Check if user is connected to post author
  const { data: connection } = await supabase
    .from('connections')
    .select('id')
    .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .single();

  if (!connection) {
    return NextResponse.json(
      { success: false, error: 'You can only repost public posts or posts from your connections' },
      { status: 403, headers: corsHeaders }
    );
  }
}
```

### Testing Checklist (If Implemented)

- [ ] Own posts cannot be reposted (if restricted)
- [ ] Reposts cannot be reposted (if restricted)
- [ ] Private posts cannot be reposted (if restricted)
- [ ] Error messages are user-friendly
- [ ] Mobile app handles 403 errors gracefully
- [ ] Error messages guide users (e.g., "View original post")

### Acceptance Criteria

- ✅ Product team approves restrictions
- ✅ Clear error messages for each restriction
- ✅ Mobile app handles restrictions gracefully
- ✅ Restrictions don't break existing functionality

---

## Implementation Timeline

### Phase 1: High Priority (Week 1)

**Ticket 1: Toggle Behavior**
- Day 1-2: Database migration + backfill
- Day 3-4: DELETE endpoint implementation
- Day 5: POST endpoint modification + testing

**Ticket 2: user_reposted Field**
- Day 1-2: Update all post queries
- Day 3: Testing + performance optimization

**Total:** ~6-8 hours

### Phase 2: Medium Priority (Week 2)

**Ticket 3: Notifications**
- Day 1: Add notification type + helper function
- Day 2: Integrate into repost endpoint + testing

**Total:** ~2-3 hours

### Phase 3: Low Priority (Future)

**Ticket 4: Restrictions**
- TBD: After product decision

---

## Migration Plan

### Step 1: Database Migration

```sql
-- 1. Create post_reposts table
-- 2. Add indexes
-- 3. Add RLS policies
-- 4. Backfill existing reposts
```

### Step 2: API Updates

```typescript
// 1. Update POST endpoint to create post_reposts record
// 2. Add DELETE endpoint
// 3. Update all post queries to include user_reposted
```

### Step 3: Notification Updates

```typescript
// 1. Add 'repost' to notification types
// 2. Add notifyPostRepost function
// 3. Integrate into repost endpoint
```

### Step 4: Testing

- [ ] Unit tests for all endpoints
- [ ] Integration tests for repost flow
- [ ] Performance tests
- [ ] Migration verification

### Step 5: Deployment

1. Deploy database migration (during low-traffic period)
2. Deploy API changes
3. Monitor for errors
4. Verify notifications working

---

## Risk Assessment

### Low Risk
- ✅ Ticket 2 (user_reposted field) - Read-only addition
- ✅ Ticket 3 (Notifications) - Non-breaking addition

### Medium Risk
- ⚠️ Ticket 1 (Toggle behavior) - Requires migration + data backfill
  - **Mitigation:** Test migration on staging first
  - **Rollback plan:** Keep old behavior if issues arise

### High Risk
- ❌ None identified

---

## Additional Considerations

### 1. Performance

**Concern:** Adding `user_reposted` to all post queries may impact performance.

**Solution:**
- Use efficient EXISTS subquery (already optimized)
- Add composite index `(post_id, user_id)` on `post_reposts`
- Consider database function for complex queries
- Monitor query performance after deployment

### 2. Data Consistency

**Concern:** What if `post_reposts` record exists but repost post is deleted?

**Solution:**
- Use CASCADE DELETE on `repost_post_id` foreign key
- Add cleanup job to remove orphaned records (if needed)

### 3. Backward Compatibility

**Concern:** Mobile app may not be updated immediately.

**Solution:**
- API remains backward compatible (old behavior still works)
- New fields are optional (won't break old clients)
- Gradual rollout recommended

### 4. Analytics

**Consideration:** Track repost metrics separately.

**Suggestion:**
- Use `post_reposts` table for analytics
- Query: "How many reposts per post?"
- Query: "Who reposted this post?" (future feature)

---

## Questions for Mobile Team

1. **Timeline:** When do you need these features deployed?
2. **Priority:** Any changes to priority order?
3. **Testing:** Can you help test on staging before production?
4. **Rollout:** Prefer gradual rollout or all-at-once?

---

## Summary

### Approved Tickets

✅ **Ticket 1:** Toggle behavior - **APPROVED** (High Priority)
✅ **Ticket 2:** user_reposted field - **APPROVED** (High Priority)  
✅ **Ticket 3:** Notifications - **APPROVED** (Medium Priority)
⚠️ **Ticket 4:** Restrictions - **DEFERRED** (Needs product decision)

### Next Steps

1. **Web Team:**
   - Create database migration
   - Implement Ticket 1 & 2 (High Priority)
   - Implement Ticket 3 (Medium Priority)
   - Deploy to staging for testing

2. **Mobile Team:**
   - Prepare UI changes for toggle behavior
   - Update repost button to use `user_reposted` field
   - Test on staging environment

3. **Product Team:**
   - Review Ticket 4 (restrictions)
   - Make decision on repost restrictions

### Estimated Completion

- **High Priority (Tickets 1 & 2):** 1 week
- **Medium Priority (Ticket 3):** +3 days
- **Total:** ~1.5 weeks

---

**We're ready to start implementation! Let us know if you have any questions or need clarification.** 🚀

---

## Appendix: Code References

### Files to Modify

1. **Database:**
   - `supabase/migrations/20251220000000_add_post_reposts_table.sql` (new)
   - `supabase/migrations/20251220000001_backfill_post_reposts.sql` (new)

2. **API:**
   - `apps/web/app/api/posts/[id]/repost/route.ts` (modify POST, add DELETE)
   - `apps/web/app/api/posts/feed/route.ts` (add user_reposted)
   - `apps/web/app/api/posts/[id]/route.ts` (add user_reposted)
   - `apps/web/app/api/users/[id]/posts/route.ts` (add user_reposted)

3. **Services:**
   - `apps/web/src/lib/post-notifications.ts` (add notifyPostRepost)
   - `apps/web/src/lib/data-service.ts` (update queries)

4. **Types:**
   - `apps/web/src/lib/types/post.ts` (add user_reposted, user_repost_id)

---

**Thank you for the detailed tickets! Looking forward to implementing these enhancements.** 🙏

