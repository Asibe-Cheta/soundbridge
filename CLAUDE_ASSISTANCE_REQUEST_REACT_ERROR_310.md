# 🤖 Request for Claude AI Assistance: React Error #310 (Maximum Update Depth Exceeded)

**Date:** January 7, 2026  
**Priority:** 🔴 **CRITICAL - BLOCKING PRODUCTION**  
**Status:** ❌ **PERSISTENT - Multiple Fixes Attempted**

---

## 📋 Problem Summary

We are experiencing **React Error #310 (Maximum update depth exceeded)** in our Next.js feed page. Despite implementing multiple fixes based on mobile team recommendations and React best practices, the error persists. The error occurs immediately after the feed loads successfully, and the stack trace indicates it's related to a `useMemo` hook.

---

## 🐛 Error Details

### Error Message
```
Error: Minified React error #310; visit https://react.dev/errors/310 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
```

### Stack Trace
```
at ao (4bd1b696-c5755eb4090…VA4ks1tD9aQ:1:52800)
at Object.aq [as useMemo] (4bd1b696-c5755eb4090…VA4ks1tD9aQ:1:60003)
at t.useMemo (62972-2bfbe7fa6a1f1f…4ks1tD9aQ:14:103049)
at b (page-8cd7d2ea815b628…jVA4ks1tD9aQ:1:3058)
at l9 (4bd1b696-c5755eb4090…VA4ks1tD9aQ:1:51514)
at o_ (4bd1b696-c5755eb4090…VA4ks1tD9aQ:1:71374)
at oq (4bd1b696-c5755eb4090…VA4ks1tD9aQ:1:82404)
at ik (4bd1b696-c5755eb4090…A4ks1tD9aQ:1:115066)
at 4bd1b696-c5755eb4090…A4ks1tD9aQ:1:114911
at ib (4bd1b696-c5755eb4090…A4ks1tD9aQ:1:114919)
at iu (4bd1b696-c5755eb4090…A4ks1tD9aQ:1:112002)
at iG (4bd1b696-c5755eb4090…A4ks1tD9aQ:1:133439)
at iW (4bd1b696-c5755eb4090…A4ks1tD9aQ:1:131650)
at iK (4bd1b696-c5755eb4090…VA4ks1tD9aQ:1:131995)
at 4bd1b696-c5755eb4090…VA4ks1tD9aQ:1:131279
```

**Key Observation:** The error is happening in a `useMemo` hook in the feed page component (`page-8cd7d2ea815b628`).

### Component Stack
```
at b (https://www.soundbridge.live/_next/static/chunks/app/feed/page-ad0bae24f9e3852a.js:1:798)
```

---

## 🔍 What We've Observed

### Timeline of Events (from console logs)
1. ✅ Feed page initializes
2. ✅ User authentication loads
3. ✅ Sidebar components start loading (profile, stats, opportunities, suggestions)
4. ✅ Feed posts load successfully (`✅ Feed posts loaded in 429ms`)
5. ❌ **Sidebar components reload a second time** (this shouldn't happen)
6. ❌ **React Error #310 occurs**

### Key Logs
```
[Log] ✅ Feed posts loaded in 429ms: – {count: 15, hasMore: true}
[Log] 🚀 Loading profile data using direct Supabase query... (appears TWICE)
[Log] 🚀 Loading sidebar stats using direct Supabase queries... (appears TWICE)
[Log] 🚀 Loading sidebar opportunities using direct Supabase query... (appears TWICE)
[Log] 🚀 Loading sidebar suggestions using direct Supabase query... (appears TWICE)
[Error] Error: Minified React error #310
```

---

## 🛠️ Fixes We've Attempted

### 1. ✅ Removed Bookmark Loading from `fetchPosts`
- **What:** Moved bookmark check to separate `useEffect`
- **Why:** Mobile team recommendation to avoid circular dependencies
- **Result:** ❌ Error still occurs

### 2. ✅ Used `user?.id` Instead of `user` Object
- **What:** Changed all `useEffect` dependencies from `user` to `user?.id`
- **Why:** Prevent re-renders from user object reference changes
- **Result:** ❌ Error still occurs

### 3. ✅ Used Refs for Function Dependencies
- **What:** Created refs for `fetchPosts`, `batchCheckBookmarks`
- **Why:** Avoid dependency issues with function references
- **Result:** ❌ Error still occurs

### 4. ✅ Fixed Stale Closures in `fetchPosts`
- **What:** Used `loadingRef` and `loadingMoreRef` instead of state
- **Why:** Prevent stale closures from missing dependencies
- **Result:** ❌ Error still occurs

### 5. ✅ Temporarily Disabled Bookmark Loading
- **What:** Commented out bookmark loading `useEffect`
- **Why:** Isolate the issue
- **Result:** ❌ Error still occurs (bookmark loading is NOT the cause)

### 6. ✅ Wrapped Sidebar Components in `React.memo()`
- **What:** Added `React.memo()` to `FeedLeftSidebar` and `FeedRightSidebar`
- **Why:** Prevent re-renders when parent re-renders
- **Result:** ❌ Error still occurs

### 7. ✅ Used Refs for Sidebar Load Functions
- **What:** Replaced `useCallback` with refs for load functions
- **Why:** Prevent function recreation from triggering `useEffect`
- **Result:** ❌ Error still occurs

### 8. ✅ Added `hasLoadedRef` Guards
- **What:** Added refs to prevent duplicate loads
- **Why:** Ensure `useEffect` only runs once
- **Result:** ❌ Error still occurs (components still load twice)

---

## 📁 Current Code Structure

### FeedPage Component (`apps/web/app/feed/page.tsx`)

**Key Features:**
- Uses `useCallback` for `fetchPosts` (depends on `user?.id`)
- Uses refs for `fetchPostsRef`, `fetchPostsInitialRef`, `batchCheckBookmarksRef`
- Uses refs for loading states (`loadingRef`, `loadingMoreRef`)
- Has `hasTriedFetchRef` to prevent duplicate initial loads
- **Note:** We removed `useMemo` from imports, but the error suggests it's still being used somewhere

**Initial Load Logic:**
```typescript
const fetchPostsInitialRef = useRef(fetchPosts);
fetchPostsInitialRef.current = fetchPosts;

useEffect(() => {
  if (user?.id && !authLoading && !hasTriedFetchRef.current) {
    hasTriedFetchRef.current = true;
    fetchPostsInitialRef.current(1, false);
  }
}, [user?.id, authLoading]);
```

**Fetch Posts Function:**
```typescript
const fetchPosts = useCallback(async (pageNum: number, append: boolean = false, force: boolean = false) => {
  // Uses loadingRef and loadingMoreRef instead of state
  // Sets posts, hasMore, page
  // No bookmark check (moved to separate useEffect)
}, [user?.id]);
```

### FeedLeftSidebar Component (`apps/web/src/components/feed/FeedLeftSidebar.tsx`)

**Key Features:**
- Wrapped in `React.memo()`
- Uses refs for load functions (`loadProfileDataRef`, `loadStatsRef`)
- Has `hasLoadedRef` guard
- `useEffect` only depends on `user?.id`

**Load Logic:**
```typescript
const loadProfileDataRef = useRef<() => Promise<void>>();
const loadStatsRef = useRef<() => Promise<void>>();

loadProfileDataRef.current = async () => {
  // Loads profile data
};

loadStatsRef.current = async () => {
  // Loads stats
};

useEffect(() => {
  if (user?.id && !hasLoadedRef.current) {
    hasLoadedRef.current = true;
    loadProfileDataRef.current?.();
    loadStatsRef.current?.();
  }
}, [user?.id]);
```

### FeedRightSidebar Component (`apps/web/src/components/feed/FeedRightSidebar.tsx`)

**Key Features:**
- Wrapped in `React.memo()`
- Uses refs for load functions (`loadOpportunitiesRef`, `loadSuggestionsRef`)
- Has `hasLoadedRef` guard
- `useEffect` only depends on `user?.id`

**Load Logic:**
```typescript
const loadOpportunitiesRef = useRef<() => Promise<void>>();
const loadSuggestionsRef = useRef<() => Promise<void>>();

loadOpportunitiesRef.current = async () => {
  // Loads opportunities
};

loadSuggestionsRef.current = async () => {
  // Loads suggestions
};

useEffect(() => {
  if (!hasLoadedRef.current) {
    hasLoadedRef.current = true;
    loadOpportunitiesRef.current?.();
    if (user?.id) {
      loadSuggestionsRef.current?.();
    }
  }
}, [user?.id]);
```

---

## 🤔 The Mystery: `useMemo` in Stack Trace

**Critical Finding:** The stack trace shows the error is happening in a `useMemo` hook, but:

1. ✅ We removed `useMemo` from FeedPage imports
2. ❓ The stack trace shows `at b (page-8cd7d2ea815b628…jVA4ks1tD9aQ:1:3058)` - this is the FeedPage
3. ❓ The error is `at Object.aq [as useMemo]` - React's internal `useMemo` implementation

**Possible Causes:**
- Another component (PostCard, CreatePostModal, etc.) might be using `useMemo` incorrectly
- React's internal memoization might be causing issues
- A third-party library might be using `useMemo` in a way that causes infinite loops

---

## 🎯 What We Need Help With

### Primary Questions

1. **Why is `useMemo` appearing in the stack trace?**
   - We removed it from FeedPage, but the error persists
   - Is there a hidden `useMemo` somewhere?
   - Could it be from a child component?

2. **Why are sidebar components loading twice?**
   - We have `hasLoadedRef` guards
   - We're using `React.memo()`
   - We're using refs for load functions
   - Yet they still load twice

3. **What's causing the infinite loop?**
   - All `useEffect` hooks have stable dependencies
   - All functions use refs or stable callbacks
   - All components are memoized
   - Yet the loop persists

### Specific Requests

1. **Review the FeedPage component** for any hidden `useMemo` usage or patterns that could cause infinite loops
2. **Review child components** (PostCard, CreatePostModal, FeedLeftSidebar, FeedRightSidebar) for `useMemo` issues
3. **Identify the root cause** of why sidebar components load twice despite guards
4. **Provide a working solution** that prevents the infinite loop

---

## 📊 Environment Details

- **Framework:** Next.js 14 (App Router)
- **React Version:** Latest (from Next.js)
- **TypeScript:** Yes
- **State Management:** React hooks (useState, useEffect, useCallback, useRef)
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)

---

## 🔗 Related Files

1. **FeedPage:** `apps/web/app/feed/page.tsx`
2. **FeedLeftSidebar:** `apps/web/src/components/feed/FeedLeftSidebar.tsx`
3. **FeedRightSidebar:** `apps/web/src/components/feed/FeedRightSidebar.tsx`
4. **PostCard:** `apps/web/src/components/posts/PostCard.tsx`
5. **CreatePostModal:** `apps/web/src/components/posts/CreatePostModal.tsx`
6. **AuthContext:** `apps/web/src/contexts/AuthContext.tsx`

---

## 📝 Additional Context

### Mobile Team's Working Implementation

The mobile team has a working implementation that doesn't experience this error. We've tried to match their patterns:
- ✅ Separate bookmark loading
- ✅ Stable dependencies (`user?.id` instead of `user`)
- ✅ Refs for function dependencies
- ✅ Memoized components

But the error persists on the web app.

### What Works

- ✅ Feed posts load successfully
- ✅ Authentication works
- ✅ Sidebar components load data correctly
- ✅ No API errors

### What Doesn't Work

- ❌ Sidebar components load twice (should only load once)
- ❌ React Error #310 occurs after feed loads
- ❌ Page crashes with error boundary

---

## 🚨 Urgency

This is a **critical production blocker**. Users cannot use the feed page without encountering this error. We've exhausted our knowledge and need expert assistance to identify and fix the root cause.

---

## 🙏 Request

Please help us:
1. **Identify the root cause** of React Error #310
2. **Explain why `useMemo` appears in the stack trace** despite being removed
3. **Fix the infinite loop** that's causing the error
4. **Prevent sidebar components from loading twice**

We're open to any approach - refactoring, different patterns, or architectural changes. The priority is getting this fixed.

---

**Thank you for your assistance!** 🙏

