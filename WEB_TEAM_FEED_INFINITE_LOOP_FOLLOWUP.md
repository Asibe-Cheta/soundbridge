# 🔴 WEB TEAM FOLLOW-UP: Persistent React Error #310 (Infinite Loop)

**Date:** January 7, 2026  
**Priority:** 🔴 **CRITICAL**  
**Status:** ❌ **Still Occurring After Multiple Fixes**  
**Response to:** MOBILE_TEAM_RESPONSE_POST_CREATION.md

---

## 📋 Summary

Despite implementing all recommended fixes from the mobile team, **React Error #310 (Maximum update depth exceeded)** still persists. The error occurs immediately after the feed loads successfully, and we've identified that **sidebar components are reloading** after posts load, suggesting a re-render loop.

---

## 🔍 Current Status

### ✅ What We've Fixed (Based on Mobile Team Recommendations)

1. **✅ Removed bookmark check from `fetchPosts`**
   - Bookmarks now load in separate `useEffect`
   - No circular dependencies

2. **✅ Used `user?.id` instead of `user` object**
   - All `useEffect` dependencies use `user?.id`
   - Prevents re-renders from user object reference changes

3. **✅ Used refs for function dependencies**
   - `fetchPostsRef` for infinite scroll
   - `batchCheckBookmarksRef` for bookmark loading
   - `fetchPostsInitialRef` for initial load

4. **✅ Fixed stale closures in `fetchPosts`**
   - Uses `loadingRef` and `loadingMoreRef` instead of state
   - Prevents dependency issues

5. **✅ Temporarily disabled bookmark loading**
   - To isolate the issue
   - **Error still occurs** → Bookmark loading is NOT the root cause

### ❌ What's Still Broken

**React Error #310** occurs immediately after:
1. Feed posts load successfully (`✅ Feed posts loaded in 888ms`)
2. Sidebar components reload (they shouldn't):
   - `🚀 Loading profile data using direct Supabase query...` (appears twice)
   - `🚀 Loading sidebar stats using direct Supabase queries...` (appears twice)
   - `🚀 Loading sidebar opportunities using direct Supabase query...` (appears twice)
   - `🚀 Loading sidebar suggestions using direct Supabase query...` (appears twice)
3. Error occurs: `Error: Minified React error #310`

---

## 🐛 Error Logs

```
[Log] ✅ Feed posts loaded in 888ms: – {count: 15, hasMore: true}
[Log] 🚀 Loading profile data using direct Supabase query... (appears TWICE)
[Log] 🚀 Loading sidebar stats using direct Supabase queries... (appears TWICE)
[Log] 🚀 Loading sidebar opportunities using direct Supabase query... (appears TWICE)
[Log] 🚀 Loading sidebar suggestions using direct Supabase query... (appears TWICE)
[Error] Error: Minified React error #310; visit https://react.dev/errors/310
```

**Component Stack:**
```
componentStack: "↵b@https://www.soundbridge.live/_next/static/chunks/app/feed/page-ad0bae24f9e3852a.js:1:798↵div@unknown:0:…"
```

---

## ❓ Critical Questions for Mobile Team

### 1. **Sidebar Component Re-rendering**

**Q: How do you prevent sidebar components from reloading when the feed updates?**

**Our Current Implementation:**
- `FeedLeftSidebar` and `FeedRightSidebar` are rendered as child components in `FeedPage`
- They have `useEffect` hooks that depend on `user?.id`
- When `FeedPage` re-renders (e.g., after `setPosts`), the sidebar components reload

**What We Need:**
- Do you use `React.memo()` to prevent sidebar re-renders?
- Do you have separate routes/pages for sidebar components?
- How do you ensure sidebar components don't reload on feed updates?

---

### 2. **Feed Page Re-render Prevention**

**Q: How do you prevent the feed page from re-rendering after posts load?**

**Our Current Flow:**
1. `fetchPosts` completes successfully
2. `setPosts(newPosts)` is called
3. This causes `FeedPage` to re-render
4. Re-render triggers sidebar components to reload
5. Sidebar reloads trigger another re-render → **infinite loop**

**What We Need:**
- Do you use `React.memo()` for the feed page?
- Do you batch state updates?
- How do you prevent cascading re-renders?

---

### 3. **Sidebar Component Dependencies**

**Q: What are the exact dependencies for your sidebar components' `useEffect` hooks?**

**Our Sidebar Components:**

**FeedLeftSidebar.tsx:**
```typescript
useEffect(() => {
  if (user?.id) {
    loadProfileData();
    loadStats();
  }
}, [user?.id]); // ✅ Only depends on user?.id
```

**FeedRightSidebar.tsx:**
```typescript
useEffect(() => {
  loadOpportunities();
  if (user?.id) {
    loadSuggestions();
  }
}, [user?.id]); // ✅ Only depends on user?.id
```

**What We Need:**
- Are your dependencies exactly the same?
- Do you use any additional guards or refs?
- Do you prevent re-runs if data hasn't changed?

---

### 4. **State Update Batching**

**Q: How do you batch state updates to prevent multiple re-renders?**

**Our Current Implementation:**
```typescript
// In fetchPosts:
setPosts(newPosts);
setHasMore(hasMorePosts);
setPage(pageNum);
setLoading(false);
setLoadingMore(false);
```

**What We Need:**
- Do you batch these updates?
- Do you use `React.startTransition()` or `React.useDeferredValue()`?
- How do you prevent cascading re-renders from multiple state updates?

---

### 5. **Component Structure**

**Q: Can you share your exact FeedPage component structure?**

**Our Structure:**
```tsx
export default function FeedPage() {
  // ... state and hooks ...
  
  return (
    <div>
      <FeedLeftSidebar />  {/* ← Reloads on FeedPage re-render */}
      <main>
        {/* Posts */}
      </main>
      <FeedRightSidebar />  {/* ← Reloads on FeedPage re-render */}
    </div>
  );
}
```

**What We Need:**
- Is your structure similar?
- Do you use any wrapper components or providers?
- Do you use `React.memo()` for sidebar components?

---

## 🔧 What We've Tried (That Didn't Work)

1. ❌ Removed bookmark loading from `fetchPosts`
2. ❌ Used `user?.id` instead of `user` object
3. ❌ Used refs for all function dependencies
4. ❌ Fixed stale closures with refs
5. ❌ Temporarily disabled bookmark loading entirely
6. ❌ Removed `useEffect` for ref updates
7. ❌ Used refs for initial `fetchPosts` call

**All of these fixes were based on mobile team recommendations, but the error persists.**

---

## 🎯 Specific Request

**We need the mobile team to:**

1. **Share your exact `FeedPage` component code** (or at least the structure)
2. **Share your exact sidebar component code** (or at least the `useEffect` hooks)
3. **Confirm if you use `React.memo()` or other optimization techniques**
4. **Explain how you prevent sidebar components from reloading on feed updates**
5. **Share any additional patterns or techniques you use to prevent infinite loops**

---

## 📝 Additional Context

**React Error #310** means "Maximum update depth exceeded" - this occurs when:
- A component calls `setState` during render
- A `useEffect` hook triggers a state update that causes the effect to run again
- Multiple components are causing cascading re-renders

**Our Hypothesis:**
- `setPosts` causes `FeedPage` to re-render
- Re-render causes sidebar components to re-mount or their `useEffect` to run
- Sidebar `useEffect` hooks trigger state updates
- State updates cause another re-render → **infinite loop**

**We need to break this cycle, but we're not sure how the mobile team does it.**

---

## 🚨 Urgency

This is a **critical blocker** for the web app. Users cannot use the feed page without encountering this error. We've tried all recommended fixes, but the issue persists.

**We need the mobile team's help to identify what we're missing.**

---

## 📧 Next Steps

1. **Mobile team reviews this document**
2. **Mobile team shares their exact implementation patterns**
3. **Web team implements the missing pieces**
4. **Both teams verify the fix works**

---

**Thank you for your continued support!** 🙏

