# ✅ Bookmark/Save API Endpoint Created

**Date:** December 18, 2025  
**From:** Web Team  
**To:** Mobile Team  
**Status:** 🟢 **FIXED - API ENDPOINT CREATED**

---

## 🎉 **Good News: API Endpoint Created!**

The missing bookmark API endpoint has been created. The 405 error should now be resolved.

---

## 📍 **API Endpoint Details**

### **Endpoint:** `POST /api/social/bookmark`

**Base URL:** Your API base URL (e.g., `https://soundbridge.live/api`)

**Full URL:** `https://soundbridge.live/api/social/bookmark`

---

## 📋 **Request Format**

### **Method:** `POST`

### **Headers:**
```
Content-Type: application/json
Authorization: Bearer <your-auth-token>
```

### **Request Body:**
```json
{
  "content_id": "uuid-of-post",
  "content_type": "post"
}
```

**Fields:**
- `content_id` (required): The UUID of the post to bookmark
- `content_type` (required): Must be `"track"`, `"event"`, or `"post"`

---

## 📤 **Response Format**

### **Success Response (Bookmark Added):**
```json
{
  "success": true,
  "data": {
    "id": "bookmark-uuid",
    "user_id": "user-uuid",
    "content_id": "post-uuid",
    "content_type": "post",
    "created_at": "2025-12-18T19:30:00.000Z"
  }
}
```

### **Success Response (Bookmark Removed):**
```json
{
  "success": true,
  "data": null
}
```
*Note: `data: null` means the bookmark was removed (toggled off)*

### **Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request (Missing Fields):**
```json
{
  "error": "Missing required fields"
}
```

**400 Bad Request (Invalid Content Type):**
```json
{
  "error": "Invalid content type. Must be \"track\", \"event\", or \"post\""
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## 🔄 **Behavior**

The endpoint **toggles** the bookmark:
- If bookmark **exists** → **Removes** it (returns `data: null`)
- If bookmark **doesn't exist** → **Adds** it (returns bookmark object)

This matches the behavior of the `toggleBookmark` function.

---

## 💻 **Example Usage**

### **TypeScript/JavaScript:**

```typescript
async function toggleBookmark(postId: string) {
  try {
    const response = await fetch('https://soundbridge.live/api/social/bookmark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        content_id: postId,
        content_type: 'post'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to toggle bookmark');
    }

    if (result.data === null) {
      console.log('✅ Bookmark removed');
      return false; // Not bookmarked
    } else {
      console.log('✅ Bookmark added');
      return true; // Bookmarked
    }
  } catch (error) {
    console.error('❌ Error toggling bookmark:', error);
    throw error;
  }
}
```

### **React Native Example:**

```typescript
import { apiClient } from './apiClient'; // Your API client

const togglePostBookmark = async (postId: string) => {
  try {
    const response = await apiClient.post('/api/social/bookmark', {
      content_id: postId,
      content_type: 'post'
    });

    if (response.data.success) {
      const isBookmarked = response.data.data !== null;
      return isBookmarked;
    } else {
      throw new Error(response.data.error || 'Failed to toggle bookmark');
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw error;
  }
};
```

---

## 🔍 **Check Bookmark Status**

### **Endpoint:** `GET /api/social/bookmark`

**Query Parameters:**
- `content_id` (required): The UUID of the post
- `content_type` (required): `"track"`, `"event"`, or `"post"`

**Example:**
```
GET /api/social/bookmark?content_id=post-uuid&content_type=post
```

**Response:**
```json
{
  "success": true,
  "data": true  // or false
}
```

### **Get All User Bookmarks:**

**Example:**
```
GET /api/social/bookmark?content_type=post
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
      "created_at": "2025-12-18T19:30:00.000Z"
    },
    // ... more bookmarks
  ]
}
```

---

## ✅ **Testing**

### **Test 1: Add Bookmark**

```bash
curl -X POST https://soundbridge.live/api/social/bookmark \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content_id": "a0d0dcf5-f726-46df-9acb-b0ae2c215e3b",
    "content_type": "post"
  }'
```

**Expected:** Returns bookmark object

### **Test 2: Remove Bookmark (Toggle Off)**

Run the same request again.

**Expected:** Returns `{"success": true, "data": null}`

### **Test 3: Check Status**

```bash
curl -X GET "https://soundbridge.live/api/social/bookmark?content_id=a0d0dcf5-f726-46df-9acb-b0ae2c215e3b&content_type=post" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Returns `{"success": true, "data": true}` or `false`

---

## 🐛 **Troubleshooting**

### **Still Getting 405 Error?**

1. **Check URL:**
   - Must be: `/api/social/bookmark` (not `/api/social/bookmarks`)
   - Must use `POST` method (not `GET` for toggle)

2. **Check Request:**
   - Must include `Content-Type: application/json` header
   - Must include `Authorization: Bearer <token>` header
   - Body must be valid JSON

3. **Check Authentication:**
   - User must be authenticated
   - Token must be valid

### **Getting 401 Unauthorized?**

- User is not authenticated
- Token is missing or invalid
- Token has expired

### **Getting 400 Bad Request?**

- Missing `content_id` or `content_type`
- Invalid `content_type` (must be `"track"`, `"event"`, or `"post"`)

---

## 📊 **Database Schema**

The endpoint uses the `bookmarks` table:

```sql
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event', 'post')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);
```

**RLS Policies:**
- ✅ Users can view all bookmarks
- ✅ Users can insert their own bookmarks
- ✅ Users can delete their own bookmarks

---

## 🔄 **Migration Notes**

**What Changed:**
- ✅ Created `/api/social/bookmark` endpoint
- ✅ Supports `POST` (toggle bookmark)
- ✅ Supports `GET` (check status / get all)
- ✅ Validates content types: `track`, `event`, `post`
- ✅ Uses existing `socialService.toggleBookmark()` method
- ✅ Follows same pattern as `/api/social/likes` endpoint

**No Database Changes Required:**
- The `bookmarks` table already exists
- RLS policies are already configured
- The endpoint uses existing infrastructure

---

## ✅ **Verification Checklist**

After updating your mobile app:

- [ ] Can save/bookmark a post
- [ ] Can unsave/unbookmark a post
- [ ] Bookmark status persists after app restart
- [ ] No 405 errors
- [ ] No 401 errors (if authenticated)
- [ ] Bookmark icon updates correctly
- [ ] Can check if post is bookmarked

---

## 📞 **Next Steps**

1. **Update Mobile App:**
   - Point bookmark API call to `/api/social/bookmark`
   - Use `POST` method for toggle
   - Include `content_id` and `content_type: "post"` in body

2. **Test:**
   - Try saving a post
   - Try unsaving a post
   - Verify bookmark status

3. **If Issues:**
   - Share error messages
   - Share request/response details
   - Check authentication status

---

**Status:** 🟢 **API ENDPOINT CREATED**  
**Action Required:** 🔧 **UPDATE MOBILE APP TO USE NEW ENDPOINT**  
**Priority:** 🟡 **MEDIUM** (feature was broken, now fixed)

---

**The API endpoint is ready! Update your mobile app to use `/api/social/bookmark` and the save feature should work! 🚀**

