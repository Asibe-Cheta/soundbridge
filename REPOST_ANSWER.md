# Answers to Mobile Team: Repost Functionality

## Date: December 19, 2025
## From: Web Team
## Topic: Repost Feature Implementation Details

---

## Overview

This document provides comprehensive answers to all questions about the repost functionality in the web app. Use this as a reference for implementing reposts in the mobile app.

---

## 1. Database Schema for Reposts

### Answer: Reposts are stored as NEW POSTS, not in a separate table

**⚠️ IMPORTANT:** Reposts are **NOT** stored in a separate `post_reposts` table. Instead, reposting creates a **new post** in the `posts` table with a special field linking to the original post.

### Schema Structure

```sql
-- Reposts are stored in the existing posts table
-- with an additional field: reposted_from_id

-- Column added to posts table:
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS reposted_from_id UUID 
REFERENCES posts(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_posts_reposted_from_id 
ON posts(reposted_from_id) 
WHERE reposted_from_id IS NOT NULL;
```

### How It Works

1. **Original Post:**
   - `reposted_from_id` = `NULL`
   - Regular post in the feed

2. **Reposted Post:**
   - `reposted_from_id` = UUID of the original post
   - Appears as a **new post** in the feed
   - Shows "Reposted by [User]" indicator
   - Inherits visibility from original post
   - Copies attachments from original post (background operation)

### Key Points

- ✅ **No separate table** - reposts are posts
- ✅ **One-to-many relationship** - one original post can have many reposts
- ✅ **Cascade behavior** - if original post is deleted, `reposted_from_id` becomes NULL (post remains)
- ✅ **Indexed** - for fast queries to find all reposts of a post

### Migration Script

The migration script is located at:
- `supabase/migrations/20251219000000_add-reposted-from-id.sql`
- `database/add_reposted_from_id_column.sql`

---

## 2. API Endpoint for Reposting

### Endpoint Details

**URL:** `POST /api/posts/[id]/repost`

**⚠️ Note:** The dynamic segment is `[id]`, not `[postId]`

### Request Format

```http
POST /api/posts/{postId}/repost
Content-Type: application/json
Authorization: Required (cookie-based)

Request Body:
{
  "with_comment": false,  // true to add a comment, false for quick repost
  "comment": "Optional comment text"  // Required if with_comment is true
}
```

### Request Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `with_comment` | boolean | No (default: `false`) | Whether to repost with a user comment |
| `comment` | string | Yes (if `with_comment` is `true`) | Comment text (max 500 characters) |

### Response Format (Success - 200 OK)

```json
{
  "success": true,
  "data": {
    "id": "new-post-uuid",
    "content": "Reposted content or user comment",
    "user_id": "user-uuid",
    "created_at": "2025-12-19T12:00:00Z",
    "reposted_from_id": "original-post-uuid",
    "author": {
      "id": "user-uuid",
      "name": "User Name",
      "username": "username"
    }
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Comment is required when reposting with thoughts"
}
```
- Occurs when `with_comment: true` but no comment provided
- Occurs when comment exceeds 500 characters

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Post not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create repost",
  "details": "Error message details"
}
```

#### 504 Gateway Timeout
```json
{
  "success": false,
  "error": "Request timed out. Please try again."
}
```
- Occurs after 15-second timeout

### Example Requests

**Quick Repost (No Comment):**
```javascript
const response = await fetch(`/api/posts/${postId}/repost`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    with_comment: false
  })
});
```

**Repost with Comment:**
```javascript
const response = await fetch(`/api/posts/${postId}/repost`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    with_comment: true,
    comment: "This is amazing! 🔥"
  })
});
```

### Important Notes

- ⚠️ **Timeout:** API has a 15-second timeout - implement client-side timeout as well
- ⚠️ **Background Operations:** Attachments copying and `shares_count` increment happen in background (non-blocking)
- ⚠️ **Content:** If no comment provided, uses original post content or "Reposted" as fallback

---

## 3. Removing a Repost (Toggle Behavior)

### Answer: Reposts are NOT toggleable - they create permanent new posts

**⚠️ CRITICAL:** There is **NO DELETE endpoint** for reposts. Reposting creates a **new post**, not a relationship record.

### Why No Toggle?

Unlike reactions (which are toggleable), reposts create actual posts in the feed. To "un-repost", a user would need to:

1. **Delete the repost post itself** (if they have permission)
2. Use the standard post deletion endpoint: `DELETE /api/posts/[id]`

### Implementation Options

**Option 1: Allow users to delete their own repost posts**
```javascript
// User can delete their repost post
DELETE /api/posts/{repostPostId}
```

**Option 2: Track reposts separately (future enhancement)**
- This would require a separate `post_reposts` table
- Currently NOT implemented in web app

### Current Behavior

- ✅ Users can repost a post multiple times (each creates a new post)
- ❌ Users cannot "un-repost" (no toggle functionality)
- ✅ Users can delete their own repost posts (standard post deletion)

### Recommendation for Mobile

**For MVP:** Don't implement toggle behavior. Reposts are permanent.

**For Future:** If toggle behavior is desired, you would need to:
1. Track which posts are reposts of which original posts
2. Check if user already reposted before allowing another repost
3. Provide delete functionality for repost posts

---

## 4. Displaying Reposted Posts

### Answer: Reposts appear as new posts with a visual indicator

### Visual Layout

Reposts appear in the feed as **new posts** with a special header indicating they're reposts:

```
┌─────────────────────────────────────────┐
│ 🔁 Reposted by Jane Smith               │  ← Repost indicator
│    View original post                   │
├─────────────────────────────────────────┤
│ 👤 John Doe (Original Author)           │
│    Music Producer                       │
│    2h ago                               │
│                                         │
│ Just dropped my new track! 🎵          │
│                                         │
│ [Audio player if applicable]            │
│                                         │
│ 👍 Support  💬 Comment  🔁 Repost  ↗ Share│
│                                         │
│ 15 reactions  •  8 comments  •  3 reposts
└─────────────────────────────────────────┘
```

### Implementation Details

**Repost Indicator Component:**
```typescript
// Shown at top of post card if reposted_from_id exists
{post.reposted_from_id && (
  <div className="repost-indicator">
    <Repeat2 icon />
    <span>{post.author?.name} reposted</span>
    <Link href={`/post/${post.reposted_from_id}`}>
      View original post
    </Link>
  </div>
)}
```

### Key Points

- ✅ Reposts appear as **separate posts** in the feed
- ✅ Original post data is preserved (via `reposted_from_id` link)
- ✅ Repost shows original author info
- ✅ "View original post" button links to original post detail page
- ✅ Repost inherits visibility from original post
- ✅ Repost copies attachments from original (background operation)

### Feed Query Behavior

Reposts are included automatically in feed queries because they're just regular posts. The feed query doesn't need special handling - it fetches all posts (including reposts) and the UI displays the repost indicator when `reposted_from_id` is present.

---

## 5. Repost Count Display

### Answer: Uses `shares_count` field on the original post

### Field Names

**In Post Object:**
```typescript
interface Post {
  // ... other fields
  shares_count?: number;  // Total number of reposts/shares
  reposted_from_id?: string;  // If this post is a repost
  reposted_from?: Post;  // Original post data (if loaded)
}
```

### How It Works

1. **When a post is reposted:**
   - `shares_count` on the **original post** is incremented (background operation)
   - The new repost post has `reposted_from_id` set to the original post ID

2. **Displaying counts:**
   - Original post shows: `shares_count` (total reposts)
   - Repost post shows: Original post's `shares_count` (same value)

### Example

```typescript
// Original post
{
  id: "post-123",
  content: "My amazing track!",
  shares_count: 5,  // 5 users reposted this
  reposted_from_id: null
}

// Repost post
{
  id: "post-456",
  content: "My amazing track!",  // Same content
  shares_count: 5,  // Shows same count as original
  reposted_from_id: "post-123"  // Links to original
}
```

### User Repost Status

**⚠️ Currently NOT tracked:** There's no `user_reposted` field. To check if the current user has reposted, you would need to:

1. Query for posts where:
   - `reposted_from_id` = original post ID
   - `user_id` = current user ID

2. Or implement a separate tracking mechanism (not currently in web app)

### Summary Line Display

```typescript
// In interaction summary line
{shares_count > 0 && (
  <span>{shares_count} reposts</span>
)}
```

**Example:** `"15 reactions • 8 comments • 3 reposts"`

---

## 6. Who Can Repost?

### Answer: No restrictions found in current implementation

### Current Rules

Based on the API implementation:

- ✅ **Users can repost their own posts** (no restriction)
- ✅ **Users can repost reposts** (chain reposting allowed)
- ✅ **Private posts can be reposted** (inherits visibility from original)
- ✅ **No user role restrictions** (all authenticated users can repost)

### Visibility Inheritance

When reposting:
- Repost inherits `visibility` from the original post
- If original is `public`, repost is `public`
- If original is `connections`, repost is `connections`

### Business Logic

```typescript
// From API implementation
const postData = {
  user_id: user.id,
  content: newPostContent,
  visibility: originalPost.visibility,  // Inherits visibility
  post_type: 'update',
  reposted_from_id: originalPost.id
};
```

### Recommendations

**For Mobile App:**
- Consider adding UI restrictions (e.g., disable repost button for own posts)
- Consider preventing chain reposts (reposting a repost)
- These are UI-level restrictions, not API restrictions

---

## 7. Notifications

### Answer: No notification logic found in repost endpoint

### Current Status

**❌ Notifications are NOT sent** when someone reposts a post.

The repost API endpoint does not include any notification logic. This is different from reactions, which do send notifications.

### Comparison with Reactions

**Reactions (DO send notifications):**
```typescript
// From reactions API
if (post.user_id !== user.id) {
  notifyPostReaction(post.user_id, userName, postId, reaction_type);
}
```

**Reposts (DO NOT send notifications):**
- No notification code in repost endpoint
- Original author is not notified

### Future Enhancement

If notifications are desired, you would need to:

1. Add notification logic to repost endpoint
2. Send notification to original post author (if not own post)
3. Notification type: `"repost"` or `"share"`

### Recommendation

**For Mobile App:**
- Don't implement repost notifications initially
- Can be added later if needed
- Consider push notifications for mobile (not in web app)

---

## 8. Analytics/Tracking

### Answer: Uses `shares_count` field for tracking

### Current Implementation

**Field Used:** `shares_count` on the `posts` table

**How It's Updated:**
```typescript
// Background operation (non-blocking)
supabase
  .from('posts')
  .select('shares_count')
  .eq('id', originalPostId)
  .single()
  .then(({ data }) => {
    if (data) {
      return supabase
        .from('posts')
        .update({ shares_count: (data.shares_count || 0) + 1 })
        .eq('id', originalPostId);
    }
  });
```

### Analytics Data

- ✅ **Reposts count as engagement** (via `shares_count`)
- ❌ **No separate `repost_events` table**
- ✅ **Counted in post analytics** (via `shares_count` field)

### Database Schema

```sql
-- shares_count is a column on posts table
-- Type: INTEGER (nullable, defaults to 0)
-- Updated: Incremented when post is reposted
```

### Querying Analytics

```sql
-- Get posts with most reposts
SELECT id, content, shares_count
FROM posts
WHERE deleted_at IS NULL
ORDER BY shares_count DESC
LIMIT 10;
```

### Recommendation

**For Mobile App:**
- Track reposts using `shares_count` field
- Can query this field for analytics
- No additional tracking needed

---

## 9. Feed Query Changes

### Answer: No special handling needed - reposts are just posts

### How Feed Queries Work

Reposts are **automatically included** in feed queries because they're stored as regular posts. No special query logic is needed.

### Feed Query Structure

```typescript
// Standard feed query (includes reposts automatically)
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles!posts_user_id_fkey(*),
    reposted_from:posts!posts_reposted_from_id_fkey(*)
  `)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(20);
```

### Including Original Post Data

To show original post info in reposts, you can join:

```sql
SELECT 
  posts.*,
  original_posts.id as original_post_id,
  original_posts.content as original_content,
  original_author.display_name as original_author_name
FROM posts
LEFT JOIN posts original_posts ON posts.reposted_from_id = original_posts.id
LEFT JOIN profiles original_author ON original_posts.user_id = original_author.id
WHERE posts.deleted_at IS NULL
ORDER BY posts.created_at DESC;
```

### Filtering Options

**Include all posts (default):**
- No filter needed - reposts are included automatically

**Exclude reposts:**
```sql
WHERE reposted_from_id IS NULL
```

**Show only reposts:**
```sql
WHERE reposted_from_id IS NOT NULL
```

### API Endpoint

The feed endpoint (`GET /api/posts/feed`) includes reposts automatically. No special flags or parameters needed.

---

## 10. Repost Button State

### Answer: Default gray, loading spinner when reposting

### Visual States

#### 1. Default (Not Reposted)
```typescript
{
  icon: "repeat-outline" or "Repeat2",
  label: "Repost",
  color: "gray" or "textSecondary",
  background: "transparent"
}
```

#### 2. Loading (Reposting in Progress)
```typescript
{
  icon: "Loader2" (spinner),
  label: "Reposting...",
  color: "gray",
  background: "transparent",
  disabled: true
}
```

#### 3. Active (User Reposted)
**⚠️ Currently NOT implemented in web app**

Since reposts create new posts (not toggleable), there's no "reposted" state. However, you could implement:

```typescript
// Check if user has reposted this post
const userReposted = userReposts.some(
  repost => repost.reposted_from_id === post.id
);

{
  icon: "repeat" (filled),
  label: "Reposted",
  color: "#DC2626" (accent red),
  background: "rgba(220, 38, 38, 0.1)" (10% opacity),
  disabled: false  // Can repost again (creates another repost)
}
```

### Web App Implementation

**From PostCard.tsx:**
```typescript
<button
  onClick={() => setShowRepostMenu(!showRepostMenu)}
  disabled={isReposting}
  className={isReposting ? 'opacity-50 cursor-not-allowed' : ''}
>
  {isReposting ? (
    <>
      <Loader2 className="animate-spin" />
      <span>Reposting...</span>
    </>
  ) : (
    <>
      <Repeat2 />
      <span>Repost</span>
    </>
  )}
</button>
```

### Repost Menu

The web app shows a menu with two options:

1. **"Repost"** - Quick repost (no comment)
2. **"Repost with your thoughts"** - Opens modal to add comment

### Color Scheme

- **Default:** Gray (`text-gray-400` or `textSecondary`)
- **Hover:** Slightly lighter gray
- **Active (if implemented):** Accent red (`#DC2626`)
- **Loading:** Gray with spinner

### Recommendation for Mobile

**For MVP:**
- Default gray state
- Loading spinner when reposting
- Don't implement "reposted" state initially

**For Future:**
- Track user's reposts to show "reposted" state
- Use accent color for active state
- Consider preventing multiple reposts (UI-level restriction)

---

## Summary of Key Points

### Database
- ✅ Reposts are stored as **new posts** in `posts` table
- ✅ `reposted_from_id` field links to original post
- ✅ No separate `post_reposts` table

### API
- ✅ Endpoint: `POST /api/posts/[id]/repost`
- ✅ Request: `{ with_comment: boolean, comment?: string }`
- ✅ Response: New post object with `reposted_from_id`
- ❌ No DELETE endpoint (reposts are permanent)

### Business Logic
- ✅ Reposts create new posts (not toggleable)
- ✅ Inherits visibility from original post
- ✅ Copies attachments (background operation)
- ✅ Increments `shares_count` on original post
- ❌ No notifications sent
- ❌ No restrictions on who can repost

### UI/UX
- ✅ Reposts appear as new posts with "Reposted by [User]" indicator
- ✅ Shows original post author info
- ✅ "View original post" button
- ✅ Repost count via `shares_count` field
- ✅ Button: Default gray, loading spinner, no "reposted" state

---

## TypeScript Interface

```typescript
interface Post {
  id: string;
  user_id: string;
  content: string;
  visibility: 'connections' | 'public';
  post_type: 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event';
  reposted_from_id?: string;  // UUID of original post if this is a repost
  shares_count?: number;  // Total reposts/shares count
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  
  // Joined fields
  author?: PostAuthor;
  reposted_from?: Post;  // Original post data (if loaded)
  attachments?: PostAttachment[];
  reactions?: PostReactions;
  comment_count?: number;
}

interface RepostRequest {
  with_comment: boolean;
  comment?: string;  // Required if with_comment is true, max 500 chars
}

interface RepostResponse {
  success: boolean;
  data?: {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    reposted_from_id: string;
    author: {
      id: string;
      name: string;
      username: string;
    };
  };
  error?: string;
  details?: string;
}
```

---

## Implementation Checklist for Mobile

### Database
- [ ] Ensure `reposted_from_id` column exists in `posts` table
- [ ] Run migration if needed: `20251219000000_add-reposted-from-id.sql`

### API Integration
- [ ] Implement `POST /api/posts/[id]/repost` endpoint call
- [ ] Handle request body: `{ with_comment, comment? }`
- [ ] Handle all error responses (400, 401, 404, 500, 504)
- [ ] Implement timeout handling (15 seconds)

### UI Components
- [ ] Repost button with default state
- [ ] Loading spinner during repost
- [ ] Repost menu (quick repost vs. repost with comment)
- [ ] Repost modal for adding comment
- [ ] Repost indicator for reposted posts
- [ ] "View original post" button/link

### State Management
- [ ] Track `isReposting` state
- [ ] Handle optimistic updates (optional)
- [ ] Refresh feed after successful repost
- [ ] Update `shares_count` display

### Error Handling
- [ ] Network errors
- [ ] Timeout errors
- [ ] Validation errors (comment too long, etc.)
- [ ] Authentication errors

### Testing
- [ ] Quick repost (no comment)
- [ ] Repost with comment
- [ ] Error scenarios
- [ ] Loading states
- [ ] Feed refresh after repost

---

## Additional Resources

### Files to Reference

1. **API Route:**
   - `apps/web/app/api/posts/[id]/repost/route.ts`

2. **Web Component:**
   - `apps/web/src/components/posts/PostCard.tsx` (lines 724-862)
   - `apps/web/src/components/posts/RepostModal.tsx`

3. **Database Migration:**
   - `supabase/migrations/20251219000000_add-reposted-from-id.sql`
   - `database/add_reposted_from_id_column.sql`

4. **Type Definitions:**
   - `apps/web/src/lib/types/post.ts`

### Example Code Snippets

**Quick Repost:**
```typescript
const handleQuickRepost = async (postId: string) => {
  setIsReposting(true);
  try {
    const response = await fetch(`/api/posts/${postId}/repost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ with_comment: false }),
    });
    
    const data = await response.json();
    if (data.success) {
      // Refresh feed or show success message
      onRepostSuccess?.();
    } else {
      throw new Error(data.error || 'Failed to repost');
    }
  } catch (error) {
    // Handle error
    showError(error.message);
  } finally {
    setIsReposting(false);
  }
};
```

**Repost with Comment:**
```typescript
const handleRepostWithComment = async (postId: string, comment: string) => {
  if (comment.trim().length === 0) {
    showError('Comment cannot be empty');
    return;
  }
  
  if (comment.length > 500) {
    showError('Comment must be 500 characters or less');
    return;
  }
  
  setIsReposting(true);
  try {
    const response = await fetch(`/api/posts/${postId}/repost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        with_comment: true,
        comment: comment.trim(),
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      onRepostSuccess?.();
    } else {
      throw new Error(data.error || 'Failed to repost');
    }
  } catch (error) {
    showError(error.message);
  } finally {
    setIsReposting(false);
  }
};
```

---

## Questions or Issues?

If you encounter any issues or need clarification:

1. **Check API logs** for detailed error messages
2. **Review web implementation** for reference
3. **Test API directly** with Postman/curl
4. **Verify database schema** - ensure `reposted_from_id` column exists

---

**Good luck with implementation!** 🚀

