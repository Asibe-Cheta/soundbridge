# 🆘 CLAUDE ASSISTANCE REQUEST: Persistent React Error #310 - FOLLOWUP

**Date:** January 7, 2026
**Problem:** React Error #310 persists despite implementing Solutions 1 & 2. New evidence points to `OnboardingContext` as the root cause.

---

## 📋 NEW CRITICAL OBSERVATION

The error **ALWAYS** occurs right after this log message:
```
👁️ Window regained focus, restoring onboarding state...
```

This happens in `OnboardingContext.tsx` when the window regains focus. The stack trace shows:
```
at page-99445c7bf7323070.js?dpl=dpl_JRExv389x3SESHvEkC7XUYVSyq8Q:1:3069
at Object.aq [as useMemo] (4bd1b696-c5755eb409061a98.js?dpl=dpl_JRExv389x3SESHvEkC7XUYVSyq8Q:1:60003)
```

**Key Evidence:**
1. Error occurs **immediately after** "Window regained focus, restoring onboarding state..."
2. Sidebars load **twice** (indicating parent re-render loop)
3. FeedPage itself doesn't use `useMemo`, but React's internal optimization is failing
4. The `OnboardingContext` has a `handleVisibilityChange` function that runs on window focus

---

## 🔍 CURRENT CODE STRUCTURE

### `apps/web/src/contexts/OnboardingContext.tsx` (Relevant Section)

```typescript
// Re-check when tab regains focus (user switches back to tab)
const handleVisibilityChange = () => {
  // Only restore if user is authenticated
  if (!document.hidden && user && session) {
    console.log('👁️ Window regained focus, restoring onboarding state...');
    // This might be causing state updates that trigger re-renders
    checkOnboarding();
  }
};

// Initial check
checkOnboarding();

// Re-check when tab regains focus (user switches back to tab)
window.addEventListener('visibilitychange', handleVisibilityChange);
```

### `apps/web/app/feed/page.tsx` (Current State)

- ✅ Uses `useRef().current` for stable `fetchPosts` function
- ✅ Passes only `userId` (primitive) to sidebars
- ✅ Sidebars wrapped in `React.memo()`
- ✅ `PostCard` and `CreatePostModal` wrapped in `React.memo()`
- ✅ All `useEffect` dependencies are primitives

### Sidebar Components

- ✅ Wrapped in `React.memo()`
- ✅ Use `hasLoadedRef` guards
- ✅ Depend only on `effectiveUserId` (primitive)

---

## 🎯 HYPOTHESIS

The `OnboardingContext` is likely:
1. **Updating state during render** when window regains focus
2. **Causing FeedPage to re-render** (which is a child of OnboardingProvider)
3. **Triggering a cascade** of re-renders that eventually hits React's `useMemo` optimization
4. **Creating an infinite loop** because the state update triggers another visibility change check

---

## ❓ KEY QUESTIONS FOR CLAUDE

1. **OnboardingContext State Updates:**
   - Is `setOnboardingState` being called during render or in a way that causes infinite loops?
   - Should `handleVisibilityChange` be debounced or guarded?
   - Is the `checkOnboardingStatusWithRetry` function causing state updates that trigger re-renders?

2. **Context Provider Re-renders:**
   - How can we prevent `OnboardingContext` from causing FeedPage re-renders?
   - Should FeedPage be isolated from OnboardingContext updates?
   - Is there a way to memoize the context value to prevent unnecessary re-renders?

3. **Window Focus Events:**
   - Could the `visibilitychange` event be firing multiple times?
   - Should we add guards to prevent multiple simultaneous checks?
   - Is there a race condition between multiple `checkOnboarding` calls?

4. **React.memo() Not Working:**
   - Why is `React.memo()` on FeedPage children not preventing re-renders?
   - Could the context updates be bypassing `React.memo()`?
   - Should we use a custom comparison function for `React.memo()`?

---

## 🔧 ATTEMPTED FIXES (Already Applied)

### Solution 1: Stable Function Refs ✅
- `fetchPosts` uses `useRef().current`
- `userIdRef` for current user ID
- Primitives only in dependencies

### Solution 2: Memoize Components ✅
- `PostCard` wrapped in `React.memo()`
- `CreatePostModal` wrapped in `React.memo()`
- Sidebars wrapped in `React.memo()`

### Solution 3: Sidebar Guards ✅
- `hasLoadedRef` prevents duplicate loads
- Only depend on `effectiveUserId` (primitive)

---

## 🚨 CRITICAL FINDING

**The error pattern is consistent:**
1. Feed loads successfully ✅
2. Sidebars load successfully ✅
3. Window regains focus (or tab switch) 🔄
4. `OnboardingContext` runs `handleVisibilityChange` 🔄
5. **ERROR #310 occurs** ❌

This suggests the issue is **NOT** in FeedPage itself, but in how `OnboardingContext` interacts with FeedPage.

---

## 📝 REQUESTED SOLUTION

Please provide:
1. **Analysis** of `OnboardingContext` code for state update patterns that could cause infinite loops
2. **Specific fix** for `handleVisibilityChange` to prevent re-render cascades
3. **Context value memoization** strategy to prevent unnecessary re-renders
4. **Isolation strategy** to prevent OnboardingContext updates from affecting FeedPage

---

## 📁 RELATED FILES

- `apps/web/src/contexts/OnboardingContext.tsx` - **LIKELY ROOT CAUSE**
- `apps/web/app/feed/page.tsx` - FeedPage component
- `apps/web/src/components/feed/FeedLeftSidebar.tsx` - Left sidebar
- `apps/web/src/components/feed/FeedRightSidebar.tsx` - Right sidebar
- `apps/web/src/components/posts/PostCard.tsx` - Post card component
- `apps/web/src/components/posts/CreatePostModal.tsx` - Create post modal

---

## 🔗 PREVIOUS DOCUMENTATION

See `CLAUDE_ASSISTANCE_REQUEST_REACT_ERROR_310.md` for:
- Complete problem description
- All attempted fixes
- Original code structure
- Initial questions

---

**URGENCY:** This is blocking production deployment. The error occurs consistently on every page load after window focus events.

