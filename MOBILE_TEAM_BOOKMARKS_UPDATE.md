# Bookmarks System - Extended for Posts

## 📋 Overview

The `bookmarks` table is a **unified save/bookmark system** that allows users to save content across multiple content types. We've extended it to support posts in addition to existing tracks and events.

**Date:** November 25, 2025  
**Update:** Added `'post'` content type support to existing bookmarks system

---

## 🎯 Purpose

Users can save/bookmark content for later viewing:
- ✅ **Tracks** - Music tracks/audio files
- ✅ **Events** - Live events, concerts, shows
- ✅ **Posts** - Professional networking posts (NEW)

All saved content appears in a unified "Saved" or "Bookmarks" section.

---

## 📊 Database Schema

### Table: `bookmarks`

```sql
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL, -- Track, Event, or Post ID
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event', 'post')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);
```

### Fields:
- `id` - Unique bookmark identifier
- `user_id` - ID of the user who saved the content
- `content_id` - ID of the saved item (track ID, event ID, or post ID)
- `content_type` - Type of content: `'track'`, `'event'`, or `'post'`
- `created_at` - Timestamp when item was saved
- **UNIQUE constraint**: Prevents duplicate bookmarks (one bookmark per user per content item)

---

## 🔐 Row Level Security (RLS) Policies

The table has RLS enabled with the following policies:

1. **SELECT Policy**: "Bookmarks are viewable by everyone"
   - All users can view all bookmarks (for public bookmark counts, etc.)

2. **INSERT Policy**: "Users can insert their own bookmarks"
   - Users can only create bookmarks for themselves
   - Check: `auth.uid() = user_id`

3. **DELETE Policy**: "Users can delete their own bookmarks"
   - Users can only delete their own bookmarks
   - Check: `auth.uid() = user_id`

---

## 🔌 API Endpoints

### Base URL
All endpoints are relative to your API base URL (e.g., `https://soundbridge.live/api`)

---

### 1. Toggle Bookmark (Add/Remove)

**Endpoint:** `POST /api/social/bookmark` (or use SocialService method)

**Request Body:**
```json
{
  "content_id": "uuid-of-track-or-event-or-post",
  "content_type": "post"  // "track", "event", or "post"
}
```

**Response (Added):**
```json
{
  "success": true,
  "data": {
    "id": "bookmark-uuid",
    "user_id": "user-uuid",
    "content_id": "post-uuid",
    "content_type": "post",
    "created_at": "2025-11-25T12:00:00Z"
  }
}
```

**Response (Removed):**
```json
{
  "success": true,
  "data": null  // null indicates bookmark was removed
}
```

**Behavior:**
- If bookmark exists → **Removes** it (returns `data: null`)
- If bookmark doesn't exist → **Adds** it (returns bookmark object)

---

### 2. Check Bookmark Status

**Endpoint:** Check via SocialService `isBookmarked()` method

**Request:**
```typescript
const { data, error } = await socialService.isBookmarked(
  userId,
  contentId,
  'post'  // content_type
);
```

**Response:**
```json
{
  "data": true,  // or false
  "error": null
}
```

---

### 3. Get User's Bookmarks

**Endpoint:** `GET /api/social/bookmarks` (or use SocialService method)

**Query Parameters:**
- `content_type` (optional): Filter by type - `'track'`, `'event'`, or `'post'`
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Example Request:**
```
GET /api/social/bookmarks?content_type=post&limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bookmark-uuid-1",
      "user_id": "user-uuid",
      "content_id": "post-uuid-1",
      "content_type": "post",
      "created_at": "2025-11-25T12:00:00Z",
      "content": {
        "id": "post-uuid-1",
        "title": "Post title or content preview",
        "creator_id": "creator-uuid",
        "creator": {
          "username": "creator_username",
          "display_name": "Creator Name"
        }
      }
    },
    // ... more bookmarks
  ]
}
```

---

## 💻 Implementation Examples

### Example 1: Toggle Bookmark on a Post

```typescript
import { SocialService } from '@/lib/social-service';

const socialService = new SocialService();

// Toggle bookmark
const result = await socialService.toggleBookmark(userId, {
  content_id: postId,
  content_type: 'post'
});

if (result.error) {
  console.error('Failed to toggle bookmark:', result.error);
} else if (result.data) {
  console.log('Post bookmarked successfully');
} else {
  console.log('Post bookmark removed');
}
```

### Example 2: Check if Post is Bookmarked

```typescript
// Check bookmark status
const { data: isBookmarked } = await socialService.isBookmarked(
  userId,
  postId,
  'post'
);

// Update UI accordingly
if (isBookmarked) {
  // Show filled bookmark icon
} else {
  // Show outline bookmark icon
}
```

### Example 3: Get All Saved Posts

```typescript
// Get all bookmarked posts
const { data: bookmarks, error } = await socialService.getBookmarks(
  userId,
  'post'  // Filter by content_type
);

if (!error && bookmarks) {
  const postIds = bookmarks.map(b => b.content_id);
  // Fetch full post details using postIds
  // Display in "Saved Posts" section
}
```

### Example 4: Display Bookmark Count on Post

```typescript
// To get bookmark count for a post, query:
const { data: bookmarks } = await supabase
  .from('bookmarks')
  .select('id', { count: 'exact', head: true })
  .eq('content_id', postId)
  .eq('content_type', 'post');

const bookmarkCount = bookmarks?.length || 0;
```

---

## 🎨 UI/UX Recommendations

### Bookmark Button States

1. **Unbookmarked State:**
   - Icon: Outline bookmark icon (📑)
   - Tooltip: "Save post"
   - Action: Add to bookmarks

2. **Bookmarked State:**
   - Icon: Filled bookmark icon (📑)
   - Color: Accent color (e.g., #DC2626 or #EC4899)
   - Tooltip: "Remove from saved"
   - Action: Remove from bookmarks

### Placement

- **In Post Card/Feed:**
  - Place bookmark button alongside other actions (like, comment, share)
  - Typically in the bottom action bar

- **In Post Detail Page:**
  - Same placement as feed
  - More prominent if viewing saved content

### Feedback

- **Visual Feedback:**
  - Show brief animation when toggling (fill/unfill icon)
  - Consider toast notification: "Post saved" / "Post removed from saved"

- **Optimistic Updates:**
  - Update UI immediately (before API response)
  - Revert if API call fails

---

## 📱 Mobile App Integration

### Using Existing Social Service

The bookmark functionality is already integrated into the existing `SocialService`. No new endpoints needed - just use `content_type: 'post'`.

### React Native Example

```typescript
import { useSocial } from '@/hooks/useSocial';

function PostCard({ post }) {
  const { toggleBookmark, isBookmarked } = useSocial();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Check initial bookmark status
    isBookmarked(post.id, 'post').then(({ data }) => {
      setSaved(data);
    });
  }, [post.id]);

  const handleBookmark = async () => {
    const { data, error } = await toggleBookmark({
      content_id: post.id,
      content_type: 'post'
    });

    if (!error) {
      setSaved(!!data); // data is null if removed, object if added
    }
  };

  return (
    <TouchableOpacity onPress={handleBookmark}>
      <Icon name={saved ? 'bookmark-filled' : 'bookmark-outline'} />
    </TouchableOpacity>
  );
}
```

---

## 🔍 Querying Bookmarks

### Get All Bookmarks for a User

```typescript
const { data: allBookmarks } = await supabase
  .from('bookmarks')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Get Only Post Bookmarks

```typescript
const { data: postBookmarks } = await supabase
  .from('bookmarks')
  .select('*')
  .eq('user_id', userId)
  .eq('content_type', 'post')
  .order('created_at', { ascending: false });
```

### Check if Multiple Posts are Bookmarked

```typescript
const postIds = ['post-id-1', 'post-id-2', 'post-id-3'];

const { data: bookmarks } = await supabase
  .from('bookmarks')
  .select('content_id')
  .eq('user_id', userId)
  .eq('content_type', 'post')
  .in('content_id', postIds);

const bookmarkedPostIds = new Set(
  bookmarks?.map(b => b.content_id) || []
);

// Check: bookmarkedPostIds.has('post-id-1') // true/false
```

---

## ⚠️ Important Notes

1. **Uniqueness Constraint:**
   - A user can only bookmark the same content once
   - Attempting to bookmark twice will toggle (remove) the bookmark

2. **Content Type Required:**
   - Always specify `content_type` when creating/checking bookmarks
   - Valid values: `'track'`, `'event'`, `'post'`

3. **Cascading Deletes:**
   - If a post is deleted, related bookmarks are NOT automatically deleted
   - Consider checking if content exists before displaying bookmarks

4. **Performance:**
   - Use batch queries when checking multiple items
   - Cache bookmark status for recently viewed content

---

## 🧪 Testing Checklist

- [ ] User can bookmark a post
- [ ] User can unbookmark a post (toggle)
- [ ] Bookmark icon updates immediately
- [ ] Bookmark persists after app restart
- [ ] Bookmark count displays correctly
- [ ] User can view all saved posts
- [ ] Bookmark status syncs across devices
- [ ] Error handling works (network failures, etc.)

---

## 📞 Support

If you have questions or encounter issues:

1. **Check API Response:**
   - Verify `content_type` is set correctly
   - Check for RLS policy errors
   - Ensure user is authenticated

2. **Common Issues:**
   - **Error: "relation bookmarks does not exist"** → Run migration: `database/extend_bookmarks_for_posts.sql`
   - **Error: "content_type check constraint"** → Ensure using `'track'`, `'event'`, or `'post'`
   - **Bookmark not saving** → Check RLS policies and user authentication

---

## 🚀 Next Steps

1. ✅ **Database Migration**: Run `database/extend_bookmarks_for_posts.sql` in Supabase
2. ✅ **Type Updates**: TypeScript types already updated in web app
3. 🔄 **Mobile App**: Implement bookmark button in post components
4. 🔄 **Saved Posts Page**: Create UI to view all saved posts
5. 🔄 **Bookmark Counts**: Display bookmark counts on posts (optional)

---

## 📚 Related Files

- **Migration Script**: `database/extend_bookmarks_for_posts.sql`
- **Type Definitions**: `apps/web/src/lib/types/social.ts` (Bookmark interface)
- **Service**: `apps/web/src/lib/social-service.ts` (SocialService class)
- **Hook**: `apps/web/src/hooks/useSocial.ts` (useSocial hook)

---

**Last Updated:** November 25, 2025  
**Status:** ✅ Ready for implementation

