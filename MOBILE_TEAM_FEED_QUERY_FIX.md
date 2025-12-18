# 🔧 Mobile App Feed Query Fix - Exact Query to Use

**Date:** December 18, 2025  
**From:** Web Team / Database Team  
**To:** Mobile Team  
**Status:** 🟢 **DATABASE FIXED - USE THIS QUERY**

---

## ✅ **Database Status: WORKING**

We confirmed 5 posts exist in the database and are queryable. The RLS policies are fixed.

**Verified Posts:**
- All have `visibility = 'public'`
- All have `deleted_at = null`
- All are queryable via Supabase

---

## 🎯 **The Problem: Mobile App Shows 0 Posts**

**Mobile App Log:**
```
💾 Cached 0 posts (page 1)
```

**This means:** Your query is returning 0 results, but posts exist in the database.

---

## 📋 **EXACT Query to Use (Copy This)**

### **Option 1: Simple Query (Recommended First)**

```typescript
// This is the EXACT query that works with the fixed RLS policy
const { data: posts, error } = await supabase
  .from('posts')
  .select('*')
  .is('deleted_at', null)           // CRITICAL: Filter soft-deleted posts
  .eq('visibility', 'public')      // CRITICAL: Only public posts
  .order('created_at', { ascending: false })
  .limit(10);

console.log('Posts:', posts);
console.log('Error:', error);
```

### **Option 2: With Specific Columns (Better Performance)**

```typescript
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
  .is('deleted_at', null)
  .eq('visibility', 'public')
  .order('created_at', { ascending: false })
  .limit(10);
```

### **Option 3: Include User's Own Posts Too**

```typescript
// Get current user ID first
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  console.error('User not authenticated');
  return;
}

const { data: posts, error } = await supabase
  .from('posts')
  .select('*')
  .is('deleted_at', null)
  .or(`visibility.eq.public,user_id.eq.${user.id}`)  // Public OR user's posts
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## ⚠️ **CRITICAL: Required Filters**

Your query MUST include these filters:

1. ✅ **`.is('deleted_at', null)`** - Filters soft-deleted posts
2. ✅ **`.eq('visibility', 'public')`** - Only public posts (or use `.or()` for user's posts too)

**Without these filters, RLS will block the query!**

---

## 🐛 **Common Mistakes to Avoid**

### **❌ MISTAKE 1: Missing `deleted_at` Filter**

```typescript
// ❌ BAD: Missing deleted_at filter
.from('posts')
.select('*')
.eq('visibility', 'public')

// ✅ GOOD: Includes deleted_at filter
.from('posts')
.select('*')
.is('deleted_at', null)
.eq('visibility', 'public')
```

### **❌ MISTAKE 2: Wrong Column Names**

```typescript
// ❌ BAD: These columns don't exist
.eq('is_deleted', false)        // Column is 'deleted_at', not 'is_deleted'
.eq('is_public', true)           // Column is 'visibility', not 'is_public'
.eq('status', 'active')          // This column doesn't exist

// ✅ GOOD: Use correct column names
.is('deleted_at', null)
.eq('visibility', 'public')
```

### **❌ MISTAKE 3: Additional Filters That Don't Exist**

```typescript
// ❌ BAD: These columns might not exist
.eq('moderation_status', 'approved')
.eq('is_active', true)
.gte('published_at', someDate)

// ✅ GOOD: Only use columns that exist
// Available columns: id, content, user_id, visibility, post_type, event_id, created_at, updated_at, deleted_at
```

### **❌ MISTAKE 4: Not Authenticated**

```typescript
// ❌ BAD: Query without authentication
const { data } = await supabase.from('posts').select('*');

// ✅ GOOD: Ensure user is authenticated first
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Handle not authenticated
  return;
}
const { data } = await supabase.from('posts').select('*')...
```

---

## 🔍 **Debugging Steps**

### **Step 1: Test with Minimal Query**

Replace your current feed query with this exact code:

```typescript
// Test query - should return 5 posts
const testQuery = async () => {
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user?.id);
    console.log('Auth Error:', authError);
    
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    
    // Simple query
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .limit(5);
    
    console.log('✅ Posts found:', posts?.length || 0);
    console.log('Posts:', posts);
    console.log('Error:', error);
    
    return posts;
  } catch (error) {
    console.error('❌ Query failed:', error);
  }
};

// Call it
testQuery();
```

**Expected Output:**
```
User: bd8a455d-a54d-45c5-968d-e4cf5e8d928e
✅ Posts found: 5
Posts: [array of 5 posts]
Error: null
```

### **Step 2: Check Your Current Query**

Find your current feed query code and compare it to the working query above. Look for:

- [ ] Is `.is('deleted_at', null)` included?
- [ ] Is `.eq('visibility', 'public')` included?
- [ ] Are there any additional filters that might block results?
- [ ] Is the user authenticated?

### **Step 3: Clear Cache**

```bash
# Clear Expo cache
npx expo start --clear

# Or if using React Native CLI
npm start -- --reset-cache
```

### **Step 4: Check Network Tab**

In your mobile app debugger, check the actual network request:

1. Look for the Supabase request to `posts` table
2. Check the request URL/body
3. Check the response
4. Share the request/response if still not working

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
    user_id: "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
    post_type: "update",
    created_at: "2025-12-18T19:05:06.516Z",
    deleted_at: null
  },
  // ... 4 more posts
]
```

### **If Still Getting 0 Posts:**

Check these in order:

1. **Authentication:**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User authenticated:', !!user);
   ```
   - Should be `true`

2. **Query Filters:**
   - Must have `.is('deleted_at', null)`
   - Must have `.eq('visibility', 'public')` OR `.or()` clause

3. **Table Name:**
   - Must be `'posts'` (not `'post'` or `'Posts'`)

4. **Supabase Client:**
   - Ensure you're using the correct Supabase client instance
   - Ensure it's configured with the right project URL and anon key

---

## 💻 **Complete Working Example**

Here's a complete working example you can copy:

```typescript
// feedService.ts or similar file
import { supabase } from './supabase'; // Your Supabase client

export async function getFeedPosts(page: number = 1, limit: number = 10) {
  try {
    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError);
      return { posts: [], error: 'Not authenticated' };
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // 2. Calculate offset
    const offset = (page - 1) * limit;
    
    // 3. Query posts (EXACT query that works)
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .is('deleted_at', null)           // CRITICAL: Filter deleted posts
      .eq('visibility', 'public')      // CRITICAL: Only public posts
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('❌ Error fetching posts:', error);
      return { posts: [], error };
    }
    
    console.log(`✅ Fetched ${posts?.length || 0} posts`);
    
    // 4. Return results
    return {
      posts: posts || [],
      error: null,
      hasMore: (posts?.length || 0) === limit
    };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { posts: [], error };
  }
}
```

---

## 🚨 **If Still Not Working**

Please share:

1. **Your current query code** - The exact Supabase query you're using
2. **Console logs** - What does `console.log('Posts:', posts)` show?
3. **Error messages** - Any errors in the console?
4. **Authentication status** - Is user logged in?
5. **Network request** - What does the actual HTTP request look like?

---

## ✅ **Quick Checklist**

Before asking for help, verify:

- [ ] User is authenticated (`supabase.auth.getUser()` returns user)
- [ ] Query includes `.is('deleted_at', null)`
- [ ] Query includes `.eq('visibility', 'public')` or `.or()` clause
- [ ] Table name is `'posts'` (lowercase)
- [ ] Supabase client is properly configured
- [ ] Cache is cleared (`npx expo start --clear`)
- [ ] Test query above returns 5 posts

---

## 📞 **Next Steps**

1. **Copy the working query** from "Option 1" above
2. **Replace your current query** with it
3. **Test** - Should return 5 posts
4. **If still 0 posts** - Share your code and we'll debug together

---

**Status:** 🟢 **DATABASE FIXED**  
**Action:** 🔧 **UPDATE MOBILE APP QUERY**  
**Priority:** 🟡 **MEDIUM**

---

**The database is working. Just update your query to match the format above! 🚀**

