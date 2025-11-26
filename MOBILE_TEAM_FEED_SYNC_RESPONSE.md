# Web Team - Feed Synchronization Response

**To:** Mobile App Team  
**From:** Web App Team  
**Date:** November 2025  
**Priority:** High  
**Subject:** Feed Post Synchronization - API Documentation & Answers

---

## ✅ **API Endpoint Confirmations**

All requested endpoints exist and are active:

1. ✅ **`GET /api/posts/feed`** - Active and working
2. ✅ **`POST /api/posts`** - Active and working
3. ✅ **`POST /api/posts/upload-image`** - Active and working
4. ✅ **`POST /api/posts/upload-audio`** - Active and working

---

## 📋 **1. Feed API Endpoint (`GET /api/posts/feed`)**

### **Endpoint Details:**
- **URL:** `/api/posts/feed`
- **Method:** `GET`
- **Authentication:** Required (Bearer token via `Authorization` header or cookie)
- **CORS:** Enabled for all origins

### **Query Parameters:**
- `page` (optional, default: `1`) - Page number (1-indexed)
- `limit` (optional, default: `15`, max: `50`) - Posts per page
- `type` (optional) - Filter by post type: `'update'`, `'opportunity'`, `'achievement'`, `'collaboration'`, `'event'`

### **Response Format:**
```typescript
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "content": "Post content text",
        "visibility": "public" | "connections",
        "post_type": "update" | "opportunity" | "achievement" | "collaboration" | "event",
        "created_at": "2025-11-25T12:00:00Z",
        "author": {
          "id": "user-uuid",
          "name": "Display Name",
          "username": "username",
          "avatar_url": "https://...",
          "role": "Professional Headline"
        },
        "attachments": [
          {
            "id": "uuid",
            "attachment_type": "image" | "audio",
            "file_url": "https://...",
            "file_name": "image.jpg",
            "file_size": 2048000,
            "mime_type": "image/jpeg",
            "duration": null | 45, // for audio, in seconds
            "thumbnail_url": null | "https://..." // for audio
          }
        ],
        "reactions": {
          "support": 5,
          "love": 3,
          "fire": 2,
          "congrats": 1,
          "user_reaction": "support" | null // Current user's reaction, if any
        },
        "comment_count": 12,
        "is_connected": true | false // Whether current user is connected to author
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total": 42,
      "has_more": true
    }
  }
}
```

### **Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Server error with details in response

### **Feed Algorithm:**
The feed uses a priority-based ranking system:

1. **Connection posts** (highest priority) - Posts from users you're connected to
2. **Own posts** - Your own posts
3. **Nearby professionals** - Posts from users in the same country/city
4. **Opportunity posts** - Posts with `post_type: 'opportunity'`
5. **High engagement public posts** - Public posts with many reactions/comments
6. **Other public posts** - Remaining public posts
7. **Connection visibility posts** (lowest) - Posts from non-connected users with `visibility: 'connections'`

### **Visibility Filtering:**
- ✅ Filters by visibility: Only shows `'public'` posts or `'connections'` posts where user is connected
- ✅ Excludes soft-deleted posts: Only posts where `deleted_at IS NULL`
- ✅ Respects user authentication: Only shows posts the user should see based on connections
- ✅ Includes posts from all users (not just followed users) - uses connection-based filtering

### **Notes:**
- Posts are ranked in memory after fetching, so pagination may not be perfectly consistent across refreshes
- The feed fetches up to 200 posts for ranking, then paginates the ranked results
- Real-time updates are not included in this endpoint (use Supabase realtime subscriptions)

---

## 📋 **2. Post Creation API (`POST /api/posts`)**

### **Endpoint Details:**
- **URL:** `/api/posts`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `application/json`

### **Request Body:**
```typescript
{
  "content": "Post content (max 500 characters)", // Required
  "visibility": "public" | "connections", // Optional, default: "connections"
  "post_type": "update" | "opportunity" | "achievement" | "collaboration" | "event", // Optional, default: "update"
  "event_id": "uuid" // Optional, only for event-related posts
}
```

**Note:** `image_url` and `audio_url` are **NOT** accepted in the post creation request. Instead:
1. Create the post first (this endpoint)
2. Upload image/audio using `/api/posts/upload-image` or `/api/posts/upload-audio` with the `post_id`
3. The upload endpoints will automatically create attachment records

### **Response Format:**
```typescript
{
  "success": true,
  "data": {
    "id": "post-uuid",
    "user_id": "user-uuid",
    "content": "Post content",
    "visibility": "connections",
    "post_type": "update",
    "event_id": null,
    "created_at": "2025-11-25T12:00:00Z",
    "updated_at": "2025-11-25T12:00:00Z",
    "deleted_at": null,
    "author": {
      "id": "user-uuid",
      "name": "Display Name",
      "username": "username",
      "avatar_url": "https://...",
      "role": "Professional Headline"
    },
    "attachments": [] // Empty initially, populated after upload
  }
}
```

### **Validation:**
- ✅ Content length: Max 500 characters (enforced)
- ✅ Content required: Cannot be empty or whitespace only
- ✅ Visibility: Must be `'public'` or `'connections'`
- ✅ Post type: Must be one of the allowed values
- ✅ File sizes: Not validated here (validated in upload endpoints)

### **Error Responses:**
- `400 Bad Request` - Validation errors (content too long, invalid visibility, etc.)
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Server error

---

## 📋 **3. Image Upload API (`POST /api/posts/upload-image`)**

### **Endpoint Details:**
- **URL:** `/api/posts/upload-image`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `multipart/form-data`

### **⚠️ CRITICAL FIX FOR MOBILE APP:**

**The FormData field name must be `'file'`, NOT `'image'`!**

The mobile app is currently using `'image'` as the field name, but the endpoint expects `'file'`. This is why you're getting the "No file provided" error.

### **Request Format:**
```typescript
FormData:
  - file: File (required) // ⚠️ Field name must be 'file', not 'image'
  - post_id: string (optional) // If provided, creates attachment record automatically
```

### **File Specifications:**
- **Max file size:** 2MB (2,097,152 bytes)
- **Allowed types:** 
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`
- **Field name:** `'file'` (not `'image'`)

### **Response Format:**
```typescript
{
  "success": true,
  "data": {
    "file_url": "https://storage.supabase.co/...",
    "file_name": "image.jpg",
    "file_size": 2048000,
    "mime_type": "image/jpeg",
    "post_id": "uuid" | null
  }
}
```

### **Error Responses:**
- `400 Bad Request` - No file provided, invalid file type, or file too large
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Post not found or doesn't belong to user (if post_id provided)
- `500 Internal Server Error` - Upload failed

### **Mobile App Fix:**
```typescript
// ❌ WRONG (current mobile implementation):
formData.append('image', { ... });

// ✅ CORRECT:
formData.append('file', {
  uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
  name: filename,
  type: 'image/jpeg' | 'image/png',
} as any);
```

### **Authentication:**
- ✅ Requires `Authorization: Bearer {token}` header
- ✅ Do NOT set `Content-Type` header manually - let fetch/browser set it automatically for FormData

### **Workflow:**
1. Create post using `POST /api/posts` (get `post_id`)
2. Upload image using `POST /api/posts/upload-image` with `post_id` in FormData
3. The endpoint automatically creates the attachment record in `post_attachments` table
4. Image will appear in the post's `attachments` array when fetching feed

---

## 📋 **4. Audio Upload API (`POST /api/posts/upload-audio`)**

### **Endpoint Details:**
- **URL:** `/api/posts/upload-audio`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `multipart/form-data`

### **Request Format:**
```typescript
FormData:
  - file: File (required) // Field name must be 'file'
  - post_id: string (optional) // If provided, creates attachment record automatically
```

### **File Specifications:**
- **Max file size:** 10MB (10,485,760 bytes)
- **Max duration:** 60 seconds (not currently validated server-side, but should be enforced client-side)
- **Allowed types:**
  - `audio/mpeg`
  - `audio/mp3`
  - `audio/wav`
  - `audio/wave`
- **Field name:** `'file'` (not `'audio'`)

### **Response Format:**
```typescript
{
  "success": true,
  "data": {
    "file_url": "https://storage.supabase.co/...",
    "file_name": "preview.mp3",
    "file_size": 5120000,
    "mime_type": "audio/mpeg",
    "duration": null, // Currently null, will be extracted in future update
    "thumbnail_url": null, // Currently null, will be generated in future update
    "post_id": "uuid" | null
  }
}
```

### **Error Responses:**
- `400 Bad Request` - No file provided, invalid file type, or file too large
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Post not found or doesn't belong to user (if post_id provided)
- `500 Internal Server Error` - Upload failed

### **Notes:**
- Duration extraction and thumbnail generation are planned for future updates
- Currently, duration should be handled client-side if needed

---

## 📋 **5. Database Schema - Posts Table**

### **Posts Table Schema:**
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  visibility VARCHAR(20) NOT NULL DEFAULT 'connections' 
    CHECK (visibility IN ('connections', 'public')),
  post_type VARCHAR(20) DEFAULT 'update' 
    CHECK (post_type IN ('update', 'opportunity', 'achievement', 'collaboration', 'event')),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete (NULL = not deleted)
);
```

### **Foreign Key Relationships:**
- `user_id` → `auth.users(id)` (CASCADE delete)
- `event_id` → `events(id)` (SET NULL on delete)

### **Indexes:**
- `idx_posts_user_id` - On `user_id`
- `idx_posts_created_at` - On `created_at DESC`
- `idx_posts_visibility` - On `visibility`
- `idx_posts_post_type` - On `post_type`
- `idx_posts_deleted_at` - On `deleted_at` (partial, WHERE deleted_at IS NULL)
- `idx_posts_user_id_created_at` - Composite on `(user_id, created_at DESC)`
- `idx_posts_visibility_created_at` - Composite on `(visibility, created_at DESC)`

### **Row Level Security (RLS) Policies:**

#### **SELECT Policy:**
- Users can view:
  - All public posts (`visibility = 'public'`)
  - Connection posts where user is connected
  - Their own posts (regardless of visibility)
- Soft-deleted posts (`deleted_at IS NOT NULL`) are filtered out by RLS

#### **INSERT Policy:**
- Users can only insert their own posts (`user_id = auth.uid()`)

#### **UPDATE Policy:**
- Users can only update their own posts (`user_id = auth.uid()`)
- Both `USING` and `WITH CHECK` clauses are present (required for UPDATE)

#### **DELETE Policy:**
- Users can only delete their own posts (`user_id = auth.uid()`)
- Note: Soft delete is recommended (UPDATE with `deleted_at`) rather than hard delete

---

## 📋 **6. Post Reactions & Comments**

### **Post Reactions Table:**
```sql
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL 
    CHECK (reaction_type IN ('support', 'love', 'fire', 'congrats')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(post_id, user_id) -- One reaction per user per post
);
```

**Key Points:**
- ✅ One reaction per user per post (enforced by UNIQUE constraint)
- ✅ Users can change their reaction type (UPDATE existing record)
- ✅ Reaction types: `'support'`, `'love'`, `'fire'`, `'congrats'`
- ✅ Reactions are aggregated in application logic (not database triggers)

### **Post Comments Table:**
```sql
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);
```

**Key Points:**
- ✅ Supports threading: `parent_comment_id` is NULL for top-level comments, UUID for replies
- ✅ Soft delete: `deleted_at IS NOT NULL` means comment is deleted
- ✅ Content must be non-empty (enforced by CHECK constraint)

### **Reaction Aggregation:**
Reaction counts are calculated in application logic (not database triggers):

```typescript
// Example aggregation logic:
const reactions = await supabase
  .from('post_reactions')
  .select('post_id, reaction_type')
  .eq('post_id', postId);

const counts = {
  support: reactions.filter(r => r.reaction_type === 'support').length,
  love: reactions.filter(r => r.reaction_type === 'love').length,
  fire: reactions.filter(r => r.reaction_type === 'fire').length,
  congrats: reactions.filter(r => r.reaction_type === 'congrats').length,
};
```

---

## 📋 **7. Real-time Synchronization**

### **Supabase Realtime:**
- ✅ Realtime subscriptions are enabled for the `posts` table
- ✅ Listen to events: `INSERT`, `UPDATE`, `DELETE`
- ✅ Filter by `deleted_at IS NULL` to exclude soft-deleted posts

### **Recommended Implementation:**
```typescript
// Subscribe to new posts
const subscription = supabase
  .channel('posts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: 'deleted_at=is.null'
  }, (payload) => {
    // Handle new post
    console.log('New post:', payload.new);
    // Refresh feed or add to top of list
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'posts',
    filter: 'deleted_at=is.null'
  }, (payload) => {
    // Handle post update
    console.log('Post updated:', payload.new);
  })
  .on('postgres_changes', {
    event: 'DELETE',
    schema: 'public',
    table: 'posts'
  }, (payload) => {
    // Handle post deletion (soft or hard)
    console.log('Post deleted:', payload.old.id);
    // Remove from feed
  })
  .subscribe();
```

### **Update Speed:**
- New posts should appear **immediately** (within 1-2 seconds) after creation
- If realtime is not working, fallback to polling every 10-30 seconds
- The feed API endpoint always returns fresh data (no caching)

---

## 🔧 **Action Items for Mobile Team**

### **1. Fix Image Upload (CRITICAL):**
```typescript
// Change FormData field name from 'image' to 'file'
const formData = new FormData();
formData.append('file', { // ⚠️ Change 'image' to 'file'
  uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
  name: filename,
  type: 'image/jpeg',
} as any);
```

### **2. Update Feed Fetching:**
- Use `/api/posts/feed` as primary method (it's working)
- Remove or update Supabase fallback to match API behavior:
  - Filter by `visibility IN ('public', 'connections')`
  - Only show connection posts where user is connected
  - Exclude soft-deleted posts (`deleted_at IS NULL`)

### **3. Implement Real-time Subscriptions:**
- Add Supabase realtime subscriptions for immediate updates
- Handle `INSERT`, `UPDATE`, and `DELETE` events
- Filter out soft-deleted posts

### **4. Test Synchronization:**
- Create post on web app → Verify appears on mobile
- Create post on mobile app → Verify appears on web
- Upload image from mobile → Verify displays correctly
- Upload audio from mobile → Verify plays correctly

---

## 📞 **Support & Questions**

If you encounter any issues or need clarification:

1. **Check API responses:** All endpoints return detailed error messages
2. **Verify authentication:** Ensure Bearer token is included in headers
3. **Check file formats:** Ensure images are JPEG/PNG/WEBP, audio is MP3/WAV
4. **Verify file sizes:** Images max 2MB, audio max 10MB

---

## ✅ **Summary of Key Points**

1. ✅ All endpoints exist and are active
2. ⚠️ **Image upload field name must be `'file'`, not `'image'`** (CRITICAL FIX)
3. ✅ Feed endpoint filters by visibility and excludes soft-deleted posts
4. ✅ Post creation workflow: Create post first, then upload attachments
5. ✅ One reaction per user per post (can change reaction type)
6. ✅ Comments support threading via `parent_comment_id`
7. ✅ Real-time subscriptions are enabled and recommended
8. ✅ RLS policies enforce proper access control

---

## 📋 **8. Post Deletion API**

### **Endpoint:**
- **URL:** `DELETE /api/posts/{postId}`
- **Method:** `DELETE`
- **Authentication:** Required

### **Request:**
- No request body required
- Post ID in URL path

### **Response:**
```typescript
{
  "success": true,
  "message": "Post deleted successfully"
}
```

### **Behavior:**
- ✅ Soft delete (sets `deleted_at` timestamp)
- ✅ Only post author can delete
- ✅ Returns `200 OK` on success
- ✅ Returns `403 Forbidden` if not post owner
- ✅ Returns `404 Not Found` if post doesn't exist
- ✅ Deleted posts automatically filtered from feed queries

**See `MOBILE_TEAM_POST_DELETION_API_RESPONSE.md` for complete documentation.**

---

**Thank you for working with us to ensure seamless feed synchronization!**

