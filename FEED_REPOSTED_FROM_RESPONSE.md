# Response to Mobile Team: Feed Endpoint `reposted_from` Object

## Date: December 20, 2025
## From: Web Team
## Topic: `/api/posts/feed` endpoint - `reposted_from` nested object

---

## Question

**Does the `/api/posts/feed` endpoint already include the nested `reposted_from` object, or do we need to request this enhancement?**

---

## Answer: **Enhancement Required** ❌

The `/api/posts/feed` endpoint **does NOT currently include** the nested `reposted_from` object. This is an enhancement that needs to be implemented.

---

## Current Implementation

### What's Currently Included

The feed endpoint currently returns:

```typescript
{
  success: true,
  data: {
    posts: [
      {
        id: "post-uuid",
        user_id: "user-uuid",
        content: "...",
        visibility: "public",
        post_type: "update",
        media_urls: [...],
        likes_count: 5,
        comments_count: 3,
        shares_count: 2,
        created_at: "2025-12-20T...",
        updated_at: "2025-12-20T...",
        author: {
          id: "user-uuid",
          username: "username",
          display_name: "Display Name",
          avatar_url: "...",
          role: "...",
          location: "..."
        },
        user_reposted: false,  // ✅ Included
        user_repost_id: null   // ✅ Included
        // ❌ reposted_from_id: NOT included
        // ❌ reposted_from: NOT included
      }
    ],
    pagination: { ... }
  }
}
```

### What's Missing

1. **`reposted_from_id` field** - The ID of the original post (if this is a repost)
2. **`reposted_from` nested object** - The full original post data including:
   - Original post content
   - Original post author
   - Original post attachments
   - Original post reactions
   - etc.

---

## Why It's Not Included

The feed endpoint was optimized for performance and uses a minimal query:

```typescript
// Current query (line 68 in route.ts)
.select('id, user_id, content, visibility, post_type, media_urls, likes_count, comments_count, shares_count, created_at, updated_at')
```

This explicit field selection was done to:
- Reduce query time
- Minimize data transfer
- Avoid N+1 query problems

However, this means `reposted_from_id` and the nested `reposted_from` object are excluded.

---

## Enhancement Proposal

### Option 1: Include `reposted_from_id` Only (Minimal)

**Pros:**
- ✅ Minimal performance impact
- ✅ Mobile app can fetch original post separately if needed
- ✅ Quick to implement

**Cons:**
- ❌ Requires additional API call to get original post data
- ❌ Slower mobile app experience

**Implementation:**
```typescript
// Add to select statement
.select('id, user_id, content, visibility, post_type, media_urls, likes_count, comments_count, shares_count, created_at, updated_at, reposted_from_id')
```

---

### Option 2: Include Nested `reposted_from` Object (Recommended)

**Pros:**
- ✅ Complete data in one request
- ✅ Better mobile app performance
- ✅ Matches web app behavior (PostCard shows original post preview)

**Cons:**
- ⚠️ Slightly larger response size
- ⚠️ Requires additional query/join

**Implementation:**
```typescript
// Option 2A: Using Supabase join (if foreign key exists)
.select(`
  id, user_id, content, visibility, post_type, media_urls, 
  likes_count, comments_count, shares_count, created_at, updated_at,
  reposted_from_id,
  reposted_from:posts!posts_reposted_from_id_fkey(
    id,
    user_id,
    content,
    visibility,
    post_type,
    media_urls,
    created_at,
    author:profiles!posts_user_id_fkey(
      id,
      username,
      display_name,
      avatar_url
    )
  )
`)

// Option 2B: Fetch separately and map (more control, better error handling)
// 1. Fetch posts with reposted_from_id
// 2. Get unique reposted_from_id values
// 3. Fetch original posts in batch
// 4. Map to reposted_from field
```

---

## Recommended Approach

**We recommend Option 2 (Nested Object)** because:

1. **Better UX:** Mobile app can display repost indicator with original post preview without additional API calls
2. **Consistency:** Matches web app behavior where reposts show original post preview
3. **Performance:** One request instead of N+1 requests for reposts

### Implementation Details

**Fields to include in `reposted_from` object:**

```typescript
interface RepostedFrom {
  id: string;
  user_id: string;
  content: string;
  visibility: 'public' | 'connections';
  post_type: string;
  media_urls?: string[];
  created_at: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  // Optional: Include attachments if needed
  attachments?: PostAttachment[];
}
```

**Example Response:**

```typescript
{
  success: true,
  data: {
    posts: [
      {
        id: "repost-uuid",
        user_id: "reposter-uuid",
        content: "My thoughts on this...",
        reposted_from_id: "original-post-uuid",  // ✅ NEW
        reposted_from: {                         // ✅ NEW
          id: "original-post-uuid",
          user_id: "original-author-uuid",
          content: "Original post content",
          visibility: "public",
          post_type: "update",
          created_at: "2025-12-19T...",
          author: {
            id: "original-author-uuid",
            username: "original_author",
            display_name: "Original Author",
            avatar_url: "https://..."
          }
        },
        author: {
          id: "reposter-uuid",
          username: "reposter",
          display_name: "Reposter Name",
          avatar_url: "https://..."
        },
        user_reposted: false,
        user_repost_id: null
      }
    ]
  }
}
```

---

## Implementation Timeline

**Estimated Effort:** 2-3 hours

**Tasks:**
1. Update feed endpoint query to include `reposted_from_id` (5 min)
2. Fetch original posts for reposts in batch (30 min)
3. Map original posts to `reposted_from` field (30 min)
4. Include original post authors (30 min)
5. Testing and optimization (1 hour)

---

## Alternative: Query Parameter

We could also add an optional query parameter to control whether to include `reposted_from`:

```
GET /api/posts/feed?include_reposted_from=true
```

**Pros:**
- Backward compatible
- Allows mobile app to opt-in
- Web app can continue using minimal query

**Cons:**
- More complex implementation
- Two code paths to maintain

---

## Recommendation

**Implement Option 2 (Nested Object) by default** because:
- Reposts are relatively rare (most posts are originals)
- Performance impact is minimal
- Better developer experience
- Matches web app behavior

If performance becomes an issue, we can add the query parameter later.

---

## Next Steps

1. **Mobile Team:** Confirm if nested object is needed or if `reposted_from_id` alone is sufficient
2. **Web Team:** Implement enhancement based on mobile team preference
3. **Testing:** Verify performance and data accuracy

---

## Questions?

Please let us know:
1. Do you need the full nested `reposted_from` object, or is `reposted_from_id` sufficient?
2. What fields do you need in the `reposted_from` object? (author, attachments, reactions, etc.)
3. Should this be opt-in via query parameter, or always included?

---

**Status:** ⏳ Awaiting mobile team confirmation before implementation

