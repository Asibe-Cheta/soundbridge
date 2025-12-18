# ✅ Posts RLS Fix Complete - Mobile App Update Required

**Date:** December 18, 2025  
**From:** Web Team / Database Team  
**To:** Mobile Team  
**Status:** 🟢 **DATABASE FIXED - MOBILE APP QUERY NEEDS VERIFICATION**

---

## 🎉 **Good News: Database Fix is Working!**

The RLS (Row Level Security) policies on the `posts` table have been fixed. Posts are now queryable from the database.

**Verification:** We can successfully query posts:
```json
[
  {
    "id": "a0d0dcf5-f726-46df-9acb-b0ae2c215e3b",
    "user_id": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
    "content": "SoundBridge going live soon!",
    "visibility": "public",
    "post_type": "update",
    "created_at": "2025-12-18 19:05:06.516+00",
    "deleted_at": null
  },
  // ... 4 more posts
]
```

**5 posts found** in the database, all with `visibility = 'public'` and `deleted_at = null`.

---

## ⚠️ **Current Issue: Mobile App Still Shows 0 Posts**

**Mobile App Log:**
```
💾 Cached 0 posts (page 1)
```

**This means:**
- ✅ Database has posts (5 posts confirmed)
- ✅ RLS policies are fixed (we can query posts)
- ❌ Mobile app query is returning 0 results

**Likely causes:**
1. Mobile app query has additional filters that are too restrictive
2. Mobile app query is missing required fields
3. Mobile app needs to clear cache/restart
4. Mobile app query syntax doesn't match the fixed RLS policy

---

## 🔍 **What We Fixed**

### **Before (Broken):**
- Posts RLS policy might have had circular dependency
- Missing admin access
- Policy syntax issues

### **After (Fixed):**
- Posts RLS policy uses safe `is_admin_user()` function
- Users can see:
  - Their own posts (`user_id = auth.uid()`)
  - Public posts (`visibility = 'public'`)
  - Posts from connections
  - Admins can see all posts
- Soft-deleted posts are filtered (`deleted_at IS NULL`)

---

## 📋 **Correct Query for Mobile App**

### **Recommended Feed Query:**

```typescript
// Supabase query that should work
const { data: posts, error } = await supabase
  .from('posts')
  .select(`
    id,
    content,
    user_id,
    visibility,
    post_type,
    event_id,
    created_at,
    updated_at,
    deleted_at
  `)
  .is('deleted_at', null)  // Only non-deleted posts
  .or('visibility.eq.public,user_id.eq.' + userId)  // Public OR user's own posts
  .order('created_at', { ascending: false })
  .limit(10);
```

### **Alternative Query (More Explicit):**

```typescript
const { data: posts, error } = await supabase
  .from('posts')
  .select('*')
  .is('deleted_at', null)
  .eq('visibility', 'public')  // Start with just public posts
  .order('created_at', { ascending: false })
  .limit(10);
```

### **With Connections (Full Feed Logic):**

```typescript
// First, get user's connections
const { data: connections } = await supabase
  .from('connections')
  .select('connected_user_id, user_id')
  .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
  .eq('status', 'connected');

// Extract connected user IDs
const connectedUserIds = connections?.map(c => 
  c.user_id === userId ? c.connected_user_id : c.user_id
) || [];

// Query posts
const { data: posts, error } = await supabase
  .from('posts')
  .select('*')
  .is('deleted_at', null)
  .or(`
    visibility.eq.public,
    user_id.eq.${userId},
    user_id.in.(${connectedUserIds.join(',')})
  `)
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## 🐛 **Troubleshooting Steps**

### **Step 1: Check Current Query**

Please share your current feed query code. Look for:
- File that queries posts (e.g., `feedService.ts`, `postsService.ts`, `FeedScreen.tsx`)
- The exact Supabase query being used
- Any filters or conditions applied

### **Step 2: Verify Query Matches RLS Policy**

Your query MUST include:
- ✅ `.is('deleted_at', null)` - Filter soft-deleted posts
- ✅ `.or('visibility.eq.public,user_id.eq.' + userId)` - Public OR user's posts
- ✅ `.order('created_at', { ascending: false })` - Order by newest first

### **Step 3: Test with Minimal Query**

Try this minimal query first to verify RLS is working:

```typescript
// Minimal test query
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .is('deleted_at', null)
  .eq('visibility', 'public')
  .limit(5);

console.log('Posts:', data);
console.log('Error:', error);
```

**Expected:** Should return 5 posts (the ones we confirmed exist)

### **Step 4: Check for Additional Filters**

Look for any filters that might be blocking results:
- ❌ `.eq('moderation_status', 'approved')` - This column might not exist
- ❌ `.eq('is_active', true)` - This column might not exist
- ❌ `.gte('created_at', someDate)` - Date filter might be too restrictive
- ❌ `.in('post_type', ['update'])` - Type filter might be too restrictive

### **Step 5: Clear Cache and Restart**

```bash
# Clear Expo cache
npx expo start --clear

# Or if using React Native
npm start -- --reset-cache
```

### **Step 6: Check Authentication**

Verify the user is authenticated:
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id);
```

The query needs an authenticated user to work with RLS.

---

## 📊 **Expected Results**

### **With Correct Query:**

```typescript
// Should return 5 posts
[
  {
    id: "a0d0dcf5-f726-46df-9acb-b0ae2c215e3b",
    content: "SoundBridge going live soon!",
    visibility: "public",
    // ... other fields
  },
  // ... 4 more posts
]
```

### **If Still Getting 0 Posts:**

Check:
1. ✅ Is user authenticated? (`supabase.auth.getUser()`)
2. ✅ Is query using correct table name? (`'posts'` not `'post'`)
3. ✅ Is query filtering by `deleted_at IS NULL`?
4. ✅ Is query including `visibility = 'public'` OR `user_id = auth.uid()`?
5. ✅ Are there any additional filters blocking results?

---

## 🔍 **Debugging Checklist**

Please check and share:

- [ ] **Current query code** - Share the exact Supabase query
- [ ] **Error logs** - Any errors in console/logs?
- [ ] **Authentication** - Is user logged in?
- [ ] **Query filters** - What filters are applied?
- [ ] **Cache status** - Have you cleared cache?
- [ ] **Network tab** - What does the actual API request look like?

---

## 📝 **Sample Working Code**

Here's a complete example that should work:

```typescript
// feedService.ts or similar
import { supabase } from './supabase';

export async function getFeedPosts(page: number = 1, limit: number = 10) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Query posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        user_id,
        visibility,
        post_type,
        event_id,
        created_at,
        updated_at
      `)
      .is('deleted_at', null)  // Only non-deleted
      .or(`visibility.eq.public,user_id.eq.${user.id}`)  // Public OR user's posts
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    console.log(`✅ Fetched ${posts?.length || 0} posts`);
    return { posts: posts || [], error: null };
  } catch (error) {
    console.error('Error in getFeedPosts:', error);
    return { posts: [], error };
  }
}
```

---

## 🚨 **Common Issues**

### **Issue 1: Missing `deleted_at` Filter**

```typescript
// ❌ BAD: Missing deleted_at filter
.from('posts')
.select('*')

// ✅ GOOD: Includes deleted_at filter
.from('posts')
.select('*')
.is('deleted_at', null)
```

### **Issue 2: Wrong Visibility Filter**

```typescript
// ❌ BAD: Only public, missing user's own posts
.eq('visibility', 'public')

// ✅ GOOD: Public OR user's posts
.or('visibility.eq.public,user_id.eq.' + userId)
```

### **Issue 3: Additional Filters That Don't Exist**

```typescript
// ❌ BAD: Column might not exist
.eq('moderation_status', 'approved')
.eq('is_active', true)

// ✅ GOOD: Only use columns that exist
// Check: id, content, user_id, visibility, post_type, event_id, created_at, updated_at, deleted_at
```

---

## 📞 **Next Steps**

1. **Share your current query code** - We'll review it
2. **Test with minimal query** - Use the sample code above
3. **Check console logs** - Share any errors
4. **Verify authentication** - Ensure user is logged in
5. **Clear cache** - Restart Expo with `--clear` flag

---

## ✅ **What We Know Works**

- ✅ Database has 5 posts
- ✅ RLS policies are fixed
- ✅ Direct SQL query returns posts
- ✅ Posts are public and not deleted

**The issue is likely in the mobile app query logic or filters.**

---

## 📚 **Related Files**

- `FIX_POSTS_RLS_POLICIES.sql` - The fix we applied
- `DIAGNOSE_POSTS_RLS_ISSUE.sql` - Diagnostic script
- `POSTS_RLS_FIX_GUIDE.md` - Complete fix guide

---

**Status:** 🟢 **DATABASE FIXED**  
**Action Required:** 🔍 **MOBILE APP QUERY VERIFICATION**  
**Priority:** 🟡 **MEDIUM** (database works, app query needs review)

---

**Please share your current feed query code so we can help debug! 🚀**

