# 📑 Mobile Team - Save/Bookmark Feature Implementation Guide

**Date:** December 18, 2025  
**From:** Web Team / Backend Team  
**To:** Mobile Team  
**Status:** 🟢 **API ENDPOINTS READY - IMPLEMENTATION GUIDE**

---

## 📋 **Overview**

This guide explains how to implement the **Save/Bookmark** feature for posts in the mobile app. The feature allows users to save posts for later viewing.

**Current Status:**
- ✅ Database table exists (`bookmarks`)
- ✅ API endpoints created
- ⚠️ Endpoints need to be deployed (causing 405 errors)
- ✅ This guide shows correct implementation

---

## 🎯 **Feature Requirements**

### **What Users Can Do:**
1. ✅ **Save a post** - Tap save button to bookmark a post
2. ✅ **Unsave a post** - Tap save button again to remove bookmark
3. ✅ **View saved posts** - See all saved posts in profile screen
4. ✅ **Check if saved** - See save status on each post

### **UI Requirements:**
- Save button on each post card
- Visual indicator when post is saved (filled icon)
- Saved posts section in profile screen
- Toast notification when saving/unsaving

---

## 🔌 **API Endpoints**

### **Base URL**
```
Production: https://www.soundbridge.live/api
```

---

## 📍 **Endpoint 1: Toggle Save/Bookmark**

**Toggle between save and unsave a post.**

### **Endpoint:**
```
POST /api/social/bookmark
```

**Alternative (also works):**
```
POST /api/social/bookmarks
```

### **Request:**

**Headers:**
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
}
```

**Body:**
```json
{
  "content_id": "post-uuid-here",
  "content_type": "post"
}
```

### **Response (Post Saved):**
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

### **Response (Post Unsaved):**
```json
{
  "success": true,
  "data": null
}
```
*Note: `data: null` means the bookmark was removed*

### **Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request:**
```json
{
  "error": "Missing required fields"
}
```
or
```json
{
  "error": "Invalid content type. Must be \"track\", \"event\", or \"post\""
}
```

**405 Method Not Allowed:**
- This means the endpoint hasn't been deployed yet
- Contact web team to deploy the endpoint
- Temporary workaround: Use direct Supabase query (see below)

---

## 📍 **Endpoint 2: Check if Post is Saved**

**Check if a specific post is saved by the current user.**

### **Endpoint:**
```
GET /api/social/bookmark?content_id={postId}&content_type=post
```

### **Request:**

**Headers:**
```typescript
{
  'Authorization': `Bearer ${accessToken}`
}
```

### **Response (Is Saved):**
```json
{
  "success": true,
  "data": true
}
```

### **Response (Not Saved):**
```json
{
  "success": true,
  "data": false
}
```

---

## 📍 **Endpoint 3: Get Saved Posts (Profile Screen)**

**Get all posts saved by the current user for the profile screen.**

### **Endpoint:**
```
GET /api/posts/saved?page=1&limit=20
```

### **Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Posts per page (default: 20, max: 50)

### **Request:**

**Headers:**
```typescript
{
  'Authorization': `Bearer ${accessToken}`
}
```

### **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post-uuid",
      "content": "Post content here",
      "user_id": "author-uuid",
      "visibility": "public",
      "post_type": "update",
      "event_id": null,
      "created_at": "2025-12-18T19:05:06.516Z",
      "updated_at": "2025-12-18T19:05:06.516Z",
      "deleted_at": null,
      "author": {
        "id": "author-uuid",
        "username": "username",
        "display_name": "Display Name",
        "avatar_url": "https://...",
        "role": "creator",
        "location": "London, UK"
      },
      "saved_at": "2025-12-18T19:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "has_more": false
  }
}
```

---

## 💻 **Implementation Code**

### **1. Toggle Save/Unsave Function**

```typescript
// services/api/socialService.ts or similar

interface ToggleBookmarkRequest {
  content_id: string;
  content_type: 'post' | 'track' | 'event';
}

interface BookmarkResponse {
  success: boolean;
  data: {
    id: string;
    user_id: string;
    content_id: string;
    content_type: string;
    created_at: string;
  } | null;
  error?: string;
}

async function toggleBookmark(
  postId: string,
  accessToken: string
): Promise<{ isSaved: boolean; error: string | null }> {
  try {
    const response = await fetch(
      'https://www.soundbridge.live/api/social/bookmark',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          content_id: postId,
          content_type: 'post'
        })
      }
    );

    if (response.status === 405) {
      // Endpoint not deployed yet - use Supabase fallback
      return await toggleBookmarkSupabase(postId);
    }

    if (!response.ok) {
      const errorData = await response.json();
      return {
        isSaved: false,
        error: errorData.error || 'Failed to save post'
      };
    }

    const data: BookmarkResponse = await response.json();
    
    // If data is null, post was unsaved
    // If data is object, post was saved
    const isSaved = data.data !== null;

    return {
      isSaved,
      error: null
    };
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return {
      isSaved: false,
      error: 'Network error. Please try again.'
    };
  }
}
```

### **2. Check if Post is Saved**

```typescript
async function isPostSaved(
  postId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.soundbridge.live/api/social/bookmark?content_id=${postId}&content_type=post`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (response.status === 405) {
      // Endpoint not deployed - use Supabase fallback
      return await isPostSavedSupabase(postId);
    }

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.data === true;
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return false;
  }
}
```

### **3. Get Saved Posts (Profile Screen)**

```typescript
interface SavedPost {
  id: string;
  content: string;
  user_id: string;
  visibility: string;
  post_type: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    role: string | null;
    location: string | null;
  };
  saved_at: string;
}

interface SavedPostsResponse {
  success: boolean;
  data: SavedPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

async function getSavedPosts(
  page: number = 1,
  limit: number = 20,
  accessToken: string
): Promise<{ posts: SavedPost[]; hasMore: boolean; error: string | null }> {
  try {
    const response = await fetch(
      `https://www.soundbridge.live/api/posts/saved?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        posts: [],
        hasMore: false,
        error: errorData.error || 'Failed to load saved posts'
      };
    }

    const data: SavedPostsResponse = await response.json();

    return {
      posts: data.data || [],
      hasMore: data.pagination.has_more,
      error: null
    };
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    return {
      posts: [],
      hasMore: false,
      error: 'Network error. Please try again.'
    };
  }
}
```

---

## 🔄 **Supabase Fallback (For 405 Errors)**

**If the API endpoint returns 405 (not deployed yet), use direct Supabase queries:**

```typescript
import { supabase } from './supabase'; // Your Supabase client

// Toggle bookmark using Supabase
async function toggleBookmarkSupabase(
  postId: string
): Promise<{ isSaved: boolean; error: string | null }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isSaved: false, error: 'Not authenticated' };
    }

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', postId)
      .eq('content_type', 'post')
      .single();

    if (existingBookmark) {
      // Remove bookmark
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', existingBookmark.id);

      if (error) throw error;
      return { isSaved: false, error: null };
    } else {
      // Add bookmark
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          content_id: postId,
          content_type: 'post'
        })
        .select()
        .single();

      if (error) throw error;
      return { isSaved: true, error: null };
    }
  } catch (error) {
    console.error('Error toggling bookmark (Supabase):', error);
    return {
      isSaved: false,
      error: 'Failed to save post'
    };
  }
}

// Check if saved using Supabase
async function isPostSavedSupabase(postId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', postId)
      .eq('content_type', 'post')
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}
```

---

## 🎨 **UI Implementation**

### **1. Save Button Component**

```typescript
// components/PostSaveButton.tsx

import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Bookmark, BookmarkCheck } from 'lucide-react-native'; // or your icon library
import { toggleBookmark, isPostSaved } from '../services/api/socialService';
import { useAuth } from '../hooks/useAuth'; // Your auth hook

interface PostSaveButtonProps {
  postId: string;
  onSaveChange?: (isSaved: boolean) => void;
}

export function PostSaveButton({ postId, onSaveChange }: PostSaveButtonProps) {
  const { accessToken } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check initial save status
    checkSaveStatus();
  }, [postId]);

  const checkSaveStatus = async () => {
    if (!accessToken) {
      setIsChecking(false);
      return;
    }

    try {
      const saved = await isPostSaved(postId, accessToken);
      setIsSaved(saved);
    } catch (error) {
      console.error('Error checking save status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggle = async () => {
    if (!accessToken || isLoading) return;

    setIsLoading(true);
    try {
      const result = await toggleBookmark(postId, accessToken);
      
      if (result.error) {
        // Show error toast
        Alert.alert('Error', result.error);
        return;
      }

      setIsSaved(result.isSaved);
      onSaveChange?.(result.isSaved);

      // Show success toast
      // Toast.show({
      //   type: 'success',
      //   text1: result.isSaved ? 'Post saved' : 'Post unsaved'
      // });
    } catch (error) {
      console.error('Error toggling save:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return <ActivityIndicator size="small" />;
  }

  return (
    <TouchableOpacity
      onPress={handleToggle}
      disabled={isLoading}
      style={{ padding: 8 }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" />
      ) : (
        isSaved ? (
          <BookmarkCheck size={20} color="#DC2626" fill="#DC2626" />
        ) : (
          <Bookmark size={20} color="#666" />
        )
      )}
    </TouchableOpacity>
  );
}
```

### **2. Saved Posts Screen (Profile)**

```typescript
// screens/SavedPostsScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { getSavedPosts } from '../services/api/socialService';
import { PostCard } from '../components/PostCard'; // Your post card component
import { useAuth } from '../hooks/useAuth';

export function SavedPostsScreen() {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async (pageNum: number = 1, refresh: boolean = false) => {
    if (!accessToken) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const result = await getSavedPosts(pageNum, 20, accessToken);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (refresh || pageNum === 1) {
        setPosts(result.posts);
      } else {
        setPosts(prev => [...prev, ...result.posts]);
      }

      setHasMore(result.hasMore);
      setPage(pageNum);
      setError(null);
    } catch (error) {
      console.error('Error loading saved posts:', error);
      setError('Failed to load saved posts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadSavedPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadSavedPosts(page + 1);
    }
  };

  if (isLoading && posts.length === 0) {
    return <LoadingScreen />;
  }

  if (error && posts.length === 0) {
    return <ErrorScreen error={error} onRetry={() => loadSavedPosts(1, true)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}
```

---

## 🐛 **Troubleshooting**

### **405 Method Not Allowed Error**

**Symptom:**
```
❌ API Error (405): Method Not Allowed
```

**Cause:**
- API endpoint hasn't been deployed to production yet
- Route file exists but server doesn't recognize it

**Solution:**
1. **Use Supabase fallback** (immediate fix):
   - Use the `toggleBookmarkSupabase()` function above
   - Works immediately without waiting for deployment

2. **Wait for deployment** (permanent fix):
   - Contact web team to deploy the endpoint
   - Once deployed, the API endpoint will work

3. **Check endpoint status:**
   ```bash
   curl -X POST https://www.soundbridge.live/api/social/bookmark \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"content_id":"test","content_type":"post"}'
   ```
   - If 405: Not deployed yet
   - If 401: Endpoint exists but auth failed
   - If 200: Endpoint works!

### **401 Unauthorized Error**

**Cause:** Missing or invalid authentication token

**Solution:**
- Ensure user is logged in
- Check token is included in Authorization header
- Verify token hasn't expired

### **Network Errors**

**Cause:** Network connectivity issues

**Solution:**
- Check internet connection
- Retry with exponential backoff
- Show user-friendly error message

---

## ✅ **Testing Checklist**

### **Save Feature:**
- [ ] Can save a post (button changes to filled icon)
- [ ] Can unsave a post (button changes to outline icon)
- [ ] Save status persists after app restart
- [ ] Save status updates immediately in UI
- [ ] Error handling works (shows error message)
- [ ] Loading state shows while saving

### **Saved Posts Screen:**
- [ ] Saved posts load correctly
- [ ] Posts show author information
- [ ] Posts sorted by saved date (newest first)
- [ ] Pagination works (load more)
- [ ] Pull to refresh works
- [ ] Empty state shows when no saved posts
- [ ] Error state shows on failure

### **Edge Cases:**
- [ ] Works when offline (shows error)
- [ ] Works with slow network (shows loading)
- [ ] Handles expired token (shows login prompt)
- [ ] Handles deleted posts (filters them out)

---

## 📊 **Data Flow**

```
User Taps Save Button
    ↓
Check if Post is Saved
    ↓
If Saved → Unsave (DELETE bookmark)
If Not Saved → Save (INSERT bookmark)
    ↓
Update UI (filled/outline icon)
    ↓
Show Toast Notification
    ↓
Update Saved Posts List (if on profile screen)
```

---

## 🎯 **Quick Start**

1. **Add Save Button to Post Card:**
   ```tsx
   <PostSaveButton postId={post.id} />
   ```

2. **Add Saved Posts to Profile:**
   ```tsx
   <SavedPostsScreen />
   ```

3. **Handle 405 Errors:**
   - Use Supabase fallback until endpoint is deployed
   - Switch to API endpoint after deployment

---

## 📞 **Support**

**If you encounter issues:**
1. Check error logs in console
2. Verify authentication token is valid
3. Test endpoint with curl (see troubleshooting)
4. Contact web team if 405 persists after deployment

---

**Status:** 🟢 **READY FOR IMPLEMENTATION**  
**Priority:** 🟡 **MEDIUM** (feature exists, needs endpoint deployment)  
**ETA:** Immediate (with Supabase fallback) or after deployment (with API)

---

**The save feature is ready to implement! Use the Supabase fallback until the endpoint is deployed. 🚀**

