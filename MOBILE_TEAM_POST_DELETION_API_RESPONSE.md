# Web Team - Post Deletion API Response

**To:** Mobile App Team  
**From:** Web App Team  
**Date:** November 2025  
**Priority:** High  
**Subject:** Post Deletion API Documentation

---

## ✅ **API Endpoint Confirmation**

Yes, **`DELETE /api/posts/[id]`** is the correct endpoint and is **active and working**.

---

## 📋 **1. API Endpoint Details**

### **Endpoint:**
- **URL:** `/api/posts/{postId}`
- **Method:** `DELETE`
- **Authentication:** Required (Bearer token via `Authorization` header or cookie)
- **CORS:** Enabled for all origins

### **Example:**
```
DELETE /api/posts/123e4567-e89b-12d3-a456-426614174000
```

---

## 📋 **2. Request Format**

### **URL Parameters:**
- `{postId}` (required) - The UUID of the post to delete

### **Headers:**
- `Authorization: Bearer {token}` - Required (or cookie-based auth via `credentials: 'include'`)
- `Content-Type` - Not required (no body)

### **Request Body:**
- **None required** - This is a DELETE request with no body parameters

### **Example Request (TypeScript/JavaScript):**
```typescript
// Option 1: Using fetch with Bearer token
const response = await fetch(`/api/posts/${postId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
});

// Option 2: Using fetch with credentials (cookie-based)
const response = await fetch(`/api/posts/${postId}`, {
  method: 'DELETE',
  credentials: 'include',
});
```

### **Example Request (React Native with apiFetch helper):**
```typescript
await apiFetch(
  `/api/posts/${postId}`,
  {
    method: 'DELETE',
    session,
  }
);
```

---

## 📋 **3. Response Format**

### **Success Response (200 OK):**
```typescript
{
  "success": true,
  "message": "Post deleted successfully"
}
```

**Status Code:** `200 OK`

### **Error Responses:**

#### **401 Unauthorized** - Authentication Required
```typescript
{
  "success": false,
  "error": "Authentication required"
}
```

#### **403 Forbidden** - Not Authorized (Not Post Owner)
```typescript
{
  "success": false,
  "error": "Unauthorized - you can only delete your own posts"
}
```

#### **404 Not Found** - Post Not Found
```typescript
{
  "success": false,
  "error": "Post not found"
}
```

#### **500 Internal Server Error** - Server Error
```typescript
{
  "success": false,
  "error": "Failed to delete post",
  "details": "Error message details"
}
```

**Note:** RLS policy issues have been resolved (see Section 10). If you encounter a 500 error, check the specific error details in the response.

---

## 📋 **4. Soft Delete Confirmation**

### **✅ Soft Delete is Confirmed**

- The endpoint performs a **soft delete** by setting the `deleted_at` timestamp
- The post is NOT permanently removed from the database
- The `deleted_at` field is updated with the current timestamp: `deleted_at: new Date().toISOString()`

### **Database Update:**
```sql
UPDATE posts
SET deleted_at = '2025-11-25T12:00:00Z'
WHERE id = '{postId}' AND user_id = '{userId}'
```

### **Automatic Filtering:**

✅ **Yes, deleted posts are automatically filtered out:**

1. **Feed API (`GET /api/posts/feed`):**
   - Automatically filters out posts where `deleted_at IS NOT NULL`
   - Uses `.is('deleted_at', null)` in the query

2. **RLS Policies:**
   - Row Level Security policies also filter out soft-deleted posts
   - Policy condition: `deleted_at IS NULL`

3. **Supabase Queries:**
   - When querying directly from Supabase, you should filter:
   ```typescript
   .is('deleted_at', null)
   ```

---

## 📋 **5. Error Handling Guide**

### **Error Codes and Scenarios:**

| Status Code | Scenario | Error Message |
|------------|----------|---------------|
| `401` | Missing or invalid authentication token | `"Authentication required"` |
| `403` | User is not the post author | `"Unauthorized - you can only delete your own posts"` |
| `404` | Post ID doesn't exist | `"Post not found"` |
| `500` | Server error or database error | `"Failed to delete post"` with details |

### **Authorization Check:**
- The endpoint verifies that the authenticated user is the owner of the post
- Only posts where `post.user_id === user.id` can be deleted

---

## 📋 **6. Mobile App Implementation Guide**

### **✅ Correct Implementation:**

```typescript
async deletePost(postId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await apiFetch(
    `/api/posts/${postId}`,
    {
      method: 'DELETE',
      session,
    }
  );

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete post');
  }

  // Success - post is soft deleted
  // The post will automatically disappear from feed queries
}
```

### **✅ Error Handling Example:**

```typescript
async deletePost(postId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await apiFetch(
      `/api/posts/${postId}`,
      {
        method: 'DELETE',
        session,
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error('Please log in to delete posts');
      } else if (response.status === 403) {
        throw new Error('You can only delete your own posts');
      } else if (response.status === 404) {
        throw new Error('Post not found');
      } else {
        throw new Error(data.error || 'Failed to delete post');
      }
    }

    // Success - handle UI update
    return;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}
```

---

## 📋 **7. Client-Side Error Fix**

### **⚠️ Your Current Error:**

```
Failed to delete post: ReferenceError: Property 'setPosts' doesn't exist
```

### **Root Cause:**
This is a **client-side error** in your React component/hook, not an API issue. The error indicates that you're trying to call `setPosts()` but the state setter doesn't exist or isn't accessible.

### **Solution:**

Check your component/hook where you're calling `deletePost`:

```typescript
// ❌ WRONG - Missing state or wrong state setter name
const handleDelete = async (postId: string) => {
  await deletePost(postId);
  setPosts(posts.filter(p => p.id !== postId)); // setPosts doesn't exist
};

// ✅ CORRECT - Ensure state is defined
const [posts, setPosts] = useState<Post[]>([]);

const handleDelete = async (postId: string) => {
  try {
    await deletePost(postId);
    // Optimistic update - remove from UI immediately
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  } catch (error) {
    console.error('Failed to delete post:', error);
    // Optionally: Re-fetch posts or show error message
  }
};
```

### **Or Use a Callback/Refresh Pattern:**

```typescript
const handleDelete = async (postId: string) => {
  try {
    await deletePost(postId);
    // Option 1: Remove from local state (optimistic)
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
    
    // Option 2: Refresh feed from API
    await fetchPosts(); // Your fetch function
    
    // Option 3: Call a callback if provided
    onPostDeleted?.(postId);
  } catch (error) {
    console.error('Failed to delete post:', error);
    // Show error to user
  }
};
```

---

## 📋 **8. Testing Checklist**

### **✅ Test Cases:**

1. **✅ Successful Delete:**
   - Delete own post → Should return `200 OK` with `success: true`
   - Post should disappear from feed on refresh

2. **✅ Authorization:**
   - Try to delete another user's post → Should return `403 Forbidden`
   - Error message: `"Unauthorized - you can only delete your own posts"`

3. **✅ Authentication:**
   - Delete without auth token → Should return `401 Unauthorized`
   - Error message: `"Authentication required"`

4. **✅ Not Found:**
   - Delete with invalid post ID → Should return `404 Not Found`
   - Error message: `"Post not found"`

5. **✅ Soft Delete Verification:**
   - Delete post → Post should not appear in feed
   - Direct Supabase query with `.is('deleted_at', null)` should exclude it
   - Post should still exist in database with `deleted_at` timestamp

---

## 📋 **9. Real-time Updates**

### **Supabase Realtime:**

After deleting a post, you can listen for the `UPDATE` event (soft delete is an UPDATE, not DELETE):

```typescript
// Subscribe to post updates
const subscription = supabase
  .channel('posts')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'posts',
    filter: `id=eq.${postId}`
  }, (payload) => {
    const post = payload.new;
    if (post.deleted_at) {
      // Post was soft deleted - remove from UI
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
    }
  })
  .subscribe();
```

---

## 📋 **10. RLS Policy Issue (RESOLVED)**

### **✅ Status: FIXED**

**Update (November 26, 2025):** The RLS (Row-Level Security) policy issue has been resolved. Post deletion now works correctly.

### **The Issue (Historical):**

Previously, there was an RLS policy issue that could cause this error:
```json
{
  "success": false,
  "error": "Failed to delete post",
  "details": "new row violates row-level security policy for table \"posts\""
}
```

### **Root Cause (Historical):**

PostgreSQL requires **both** `USING` and `WITH CHECK` clauses for UPDATE operations:
- **USING clause**: Checks if you can see/access the row to update (before update)
- **WITH CHECK clause**: Validates the updated row is valid (after update)

### **✅ Resolution:**

The issue has been resolved through two approaches:

1. **RLS Policy Fix:** The database RLS policy now has both `USING` and `WITH CHECK` clauses properly configured
   - Verified: Policy exists with both clauses
   - Status: ✅ Working correctly

2. **Code Fix:** The API endpoint now uses the service client for deletion operations
   - Verifies ownership first (using user session)
   - Uses service client to perform soft delete (bypasses RLS)
   - Maintains security through application-level authorization checks

### **📋 For Mobile Team:**

**This error should no longer occur.** If you do encounter deletion errors:

1. **Check error details:** Look at the specific error message
2. **Verify authentication:** Ensure Bearer token is valid
3. **Check post ownership:** Only post authors can delete posts
4. **Report issues:** If deletion fails with a 500 error, share the exact error details

### **Error Handling (Recommended):**

```typescript
async deletePost(postId: string): Promise<void> {
  try {
    const response = await apiFetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      session,
    });

    const data = await response.json();
    
    if (!data.success) {
      if (response.status === 401) {
        throw new Error('Please log in to delete posts');
      } else if (response.status === 403) {
        throw new Error('You can only delete your own posts');
      } else if (response.status === 404) {
        throw new Error('Post not found');
      } else {
        // Generic error handling for 500 or other errors
        throw new Error(data.error || 'Failed to delete post');
      }
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}
```

---

## 📋 **11. Summary**

### **✅ Key Points:**

1. ✅ **Endpoint is correct:** `DELETE /api/posts/{postId}`
2. ✅ **No request body required** - Just the post ID in the URL
3. ✅ **Authentication required** - Bearer token or cookie-based
4. ✅ **Soft delete confirmed** - Sets `deleted_at` timestamp
5. ✅ **Auto-filtered** - Deleted posts automatically excluded from feeds
6. ✅ **Status code:** `200 OK` on success
7. ✅ **Response format:** `{ success: true, message: "Post deleted successfully" }`
8. ✅ **RLS policy fix:** Resolved - Both RLS policy and code fixes applied (see Section 10)

### **⚠️ Action Items for Mobile Team:**

1. **Fix client-side error:** Ensure `setPosts` state setter exists in your component
2. **Test the endpoint:** Verify all error cases are handled
3. **Update UI:** Implement optimistic updates or refresh feed after deletion
4. **Add error handling:** Handle 401, 403, 404, and 500 errors appropriately
5. **Error handling:** Implement comprehensive error handling for all status codes

---

## 📞 **Support & Troubleshooting**

### **Common Issues:**

1. **Check the response status code** - It indicates the specific error type
2. **Verify authentication** - Ensure Bearer token is included
3. **Check post ownership** - Only post authors can delete their posts
4. **Verify post ID format** - Must be a valid UUID
5. **RLS Policy Error (500)** - If you see `"new row violates row-level security policy"`, the database fix may not be applied yet. Contact web team.

### **Error-Specific Troubleshooting:**

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Missing/invalid auth token | Ensure Bearer token is included in headers |
| `403 Forbidden` | Not post owner | Verify user owns the post |
| `404 Not Found` | Invalid post ID | Check post ID format and existence |
| `500 Server Error` | Server or database error | Check error details, retry, or contact support |
| `500 Other` | Server error | Check error details, retry, or contact support |

---

**The API endpoint is working correctly. The RLS policy issue has been resolved (Section 10), and post deletion should work reliably. Any client-side errors (like `setPosts` not defined) need to be fixed in your React component/hook.**

---

**Thank you for your patience while we documented this endpoint!**

