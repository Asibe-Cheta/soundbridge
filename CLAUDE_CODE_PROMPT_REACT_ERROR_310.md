# 🎯 CLAUDE CODE PROMPT: React Error #310 - "Rendered more hooks than during the previous render"

**Date:** January 7, 2026  
**Priority:** 🔴 **CRITICAL - BLOCKING PRODUCTION**  
**Error:** React Error #310 - "Rendered more hooks than during the previous render"

---

## 📋 PROJECT CONTEXT

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **React Version:** Latest (from Next.js)
- **TypeScript:** Yes
- **State Management:** React hooks (useState, useEffect, useCallback, useRef, useMemo)
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel (Production)

### Project Structure
```
apps/web/
├── app/
│   ├── feed/
│   │   └── page.tsx          # Main feed page (ERROR OCCURS HERE)
│   └── api/                  # API routes
├── src/
│   ├── components/
│   │   ├── feed/
│   │   │   ├── FeedLeftSidebar.tsx
│   │   │   └── FeedRightSidebar.tsx
│   │   └── posts/
│   │       ├── PostCard.tsx
│   │       └── CreatePostModal.tsx
│   └── contexts/
│       ├── AuthContext.tsx
│       └── OnboardingContext.tsx  # Recently fixed with guards
```

---

## 🐛 THE ERROR

### Error Message
```
Error: Minified React error #310
Full message: "Rendered more hooks than during the previous render."
```

### Stack Trace
```
at ao (4bd1b696-c5755eb409061a98.js:1:52800)
at Object.aq [as useMemo] (4bd1b696-c5755eb409061a98.js:1:60003)
at t.useMemo (62972-4546106f75e663b5.js:14:103049)
at page-99445c7bf7323070.js:1:3069  # ← FeedPage component
```

### Error Location
- **Component:** `apps/web/app/feed/page.tsx`
- **Hook:** `useMemo` (line 3069 in minified code)
- **Trigger:** Occurs after feed loads successfully, sidebars load, and onboarding check completes

---

## 🔍 OBSERVED BEHAVIOR

### Timeline of Events
1. ✅ Feed page initializes
2. ✅ User authentication loads
3. ✅ Sidebar components start loading (profile, stats, opportunities, suggestions)
4. ✅ Feed posts load successfully (`✅ Feed posts loaded in 643ms`)
5. ✅ Onboarding check completes (`✅ User onboarding already completed`)
6. ❌ **Sidebar components reload a second time** (this shouldn't happen)
7. ❌ **React Error #310 occurs** (hooks count mismatch)

### Key Logs
```
👂 Adding visibility change listener
✅ Feed posts loaded in 643ms: {count: 15, hasMore: true}
🚀 Loading profile data using direct Supabase query... (appears TWICE)
🚀 Loading sidebar stats using direct Supabase queries... (appears TWICE)
🧹 Removing visibility change listener
👂 Adding visibility change listener
✅ User onboarding already completed
Error: Minified React error #310
```

### Critical Observations
1. **Visibility listener is added/removed multiple times** - suggests `useEffect` dependencies are changing
2. **Sidebars load twice** - parent re-render cascade
3. **Error occurs in `useMemo`** - conditional hook rendering suspected
4. **Error happens AFTER onboarding check** - timing suggests context update triggers re-render

---

## 🛠️ FIXES ALREADY ATTEMPTED

### 1. ✅ OnboardingContext Fixes (Recently Applied)
- Added triple guards (`isCheckingRef`, `lastCheckTimeRef`, `hasInitialCheckRef`)
- Memoized context value with `useMemo`
- Only update state if actually changed
- Stable callbacks with `useCallback`
- Debounced visibility checks (5 seconds)

**Result:** ❌ Error still occurs (but visibility listener logs show it's working)

### 2. ✅ FeedPage Refactoring
- Used `useRef().current` for stable `fetchPosts` function
- Passed only `userId` (primitive) to sidebars
- Used `loadingRef` and `loadingMoreRef` to prevent stale closures
- `hasTriedFetchRef` guard for initial load

**Result:** ❌ Error still occurs

### 3. ✅ Sidebar Components
- Wrapped in `React.memo()`
- Used `hasLoadedRef` guards
- Depend only on `userId` (primitive)
- Load functions use `useRef().current`

**Result:** ❌ Error still occurs (components still load twice)

### 4. ✅ PostCard & CreatePostModal
- Wrapped in `React.memo()`
- Access `user` directly from `useAuth()` instead of props

**Result:** ❌ Error still occurs

---

## 🎯 ROOT CAUSE HYPOTHESIS

### The Real Problem: Conditional Hooks

React Error #310 "Rendered more hooks than during the previous render" means:
- **Hooks are being called conditionally** (inside `if` statements, loops, or after early returns)
- **Hooks are being called in different orders** between renders
- **Hooks are being added/removed** based on state changes

### Likely Culprits in FeedPage

1. **Conditional `useMemo` calls:**
   ```typescript
   // BAD - conditional hook
   if (someCondition) {
     const memoized = useMemo(() => ..., [deps]);
   }
   ```

2. **Early returns before hooks:**
   ```typescript
   // BAD - early return before all hooks
   if (!user) return null;
   const memoized = useMemo(() => ..., [deps]); // This hook might not run
   ```

3. **Hooks inside loops or conditionals:**
   ```typescript
   // BAD - hook in conditional
   posts.map(post => {
     const memoized = useMemo(() => ..., [post]); // WRONG!
   })
   ```

4. **Dynamic hook count based on data:**
   ```typescript
   // BAD - hook count changes with data
   {posts.map((post, i) => {
     const hook = useSomeHook(post); // Different number of hooks each render
   })}
   ```

---

## 📁 FILES TO EXAMINE

### Primary Files (CRITICAL)
1. **`apps/web/app/feed/page.tsx`**
   - Main feed page component
   - Contains the `useMemo` that's failing
   - Check for conditional hooks, early returns, dynamic hook counts

2. **`apps/web/src/components/feed/FeedLeftSidebar.tsx`**
   - Left sidebar component
   - Check for conditional hooks

3. **`apps/web/src/components/feed/FeedRightSidebar.tsx`**
   - Right sidebar component
   - Check for conditional hooks

4. **`apps/web/src/components/posts/PostCard.tsx`**
   - Post card component
   - Check for conditional hooks, especially in render loops

5. **`apps/web/src/components/posts/CreatePostModal.tsx`**
   - Create post modal
   - Check for conditional hooks

### Secondary Files (Context)
6. **`apps/web/src/contexts/OnboardingContext.tsx`**
   - Recently fixed with guards
   - Check if context value memoization is correct

7. **`apps/web/src/contexts/AuthContext.tsx`**
   - Auth context provider
   - Check for conditional hooks

---

## 🔎 SPECIFIC THINGS TO CHECK

### 1. FeedPage (`apps/web/app/feed/page.tsx`)
- [ ] Are there any `useMemo`, `useCallback`, or other hooks called conditionally?
- [ ] Are there early returns (`if (!user) return null`) before all hooks are called?
- [ ] Are hooks called inside loops or conditionals?
- [ ] Does the number of hooks change based on `posts.length` or other dynamic data?
- [ ] Are there any hooks that only run when certain conditions are met?

### 2. PostCard Component
- [ ] Are hooks called conditionally based on post data?
- [ ] Are hooks called inside `.map()` loops?
- [ ] Does the hook count change based on post properties?

### 3. Sidebar Components
- [ ] Are hooks called conditionally based on `userId`?
- [ ] Are there early returns before all hooks?
- [ ] Do hooks depend on data that might not exist initially?

### 4. Context Providers
- [ ] Are context values memoized correctly?
- [ ] Do context updates cause components to re-render with different hook counts?

---

## 🎯 WHAT TO LOOK FOR

### Common Patterns That Cause This Error

1. **Conditional Hook Calls:**
   ```typescript
   // ❌ WRONG
   if (user) {
     const data = useMemo(() => compute(user), [user]);
   }
   
   // ✅ CORRECT
   const data = useMemo(() => user ? compute(user) : null, [user]);
   ```

2. **Early Returns:**
   ```typescript
   // ❌ WRONG
   if (!user) return null;
   const memoized = useMemo(() => ..., [deps]); // Might not run
   
   // ✅ CORRECT
   const memoized = useMemo(() => user ? ... : null, [user, deps]);
   if (!user) return null;
   ```

3. **Hooks in Loops:**
   ```typescript
   // ❌ WRONG
   {posts.map(post => {
     const memoized = useMemo(() => ..., [post]); // Different count each render
   })}
   
   // ✅ CORRECT
   const memoizedPosts = useMemo(() => 
     posts.map(post => compute(post)), 
     [posts]
   );
   ```

4. **Dynamic Hook Count:**
   ```typescript
   // ❌ WRONG
   {items.map((item, i) => {
     if (item.type === 'special') {
       const special = useSpecialHook(item); // Different hook count
     }
   })}
   ```

---

## 📊 DEBUGGING STRATEGY

### Step 1: Identify the Exact Hook
- The stack trace points to `useMemo` in FeedPage
- Search for all `useMemo` calls in `apps/web/app/feed/page.tsx`
- Check if any are conditional or after early returns

### Step 2: Check Hook Order
- Ensure all hooks are called in the same order every render
- No hooks after conditional returns
- No hooks inside conditionals

### Step 3: Check Dynamic Hook Counts
- Count the total number of hooks in FeedPage
- Ensure this count never changes
- Check if hooks are added/removed based on state

### Step 4: Check Child Components
- Ensure PostCard, Sidebars, etc. don't have conditional hooks
- Check if they're rendered conditionally (which would change hook count)

---

## 🚨 CRITICAL CLUES FROM LOGS

1. **Visibility listener added/removed multiple times:**
   ```
   👂 Adding visibility change listener
   🧹 Removing visibility change listener
   👂 Adding visibility change listener
   ```
   This suggests `useEffect` dependencies are changing, causing re-renders.

2. **Sidebars load twice:**
   ```
   🚀 Loading profile data... (first time)
   ✅ Feed posts loaded
   🚀 Loading profile data... (second time) ← Parent re-rendered
   ```
   This suggests FeedPage is re-rendering, which might change hook count.

3. **Error occurs after onboarding check:**
   ```
   ✅ User onboarding already completed
   Error: Minified React error #310
   ```
   This suggests OnboardingContext update triggers FeedPage re-render with different hook count.

---

## 🎯 EXPECTED SOLUTION

### The Fix Should:
1. ✅ Ensure all hooks are called unconditionally
2. ✅ Ensure hooks are called in the same order every render
3. ✅ Ensure hook count never changes between renders
4. ✅ Move any conditional logic inside hook callbacks, not around hooks

### Example Fix Pattern:
```typescript
// ❌ BEFORE (Conditional hook)
function FeedPage() {
  if (!user) return null;
  const memoized = useMemo(() => ..., [deps]); // Hook might not run
  return <div>...</div>;
}

// ✅ AFTER (Unconditional hook)
function FeedPage() {
  const memoized = useMemo(() => user ? ... : null, [user, deps]);
  if (!user) return null; // Early return AFTER all hooks
  return <div>...</div>;
}
```

---

## 📝 ADDITIONAL CONTEXT

### Recent Changes
- OnboardingContext was recently refactored with guards and memoization
- FeedPage was refactored to use refs for stable functions
- Sidebars were wrapped in `React.memo()`
- All components access `user` from `useAuth()` directly

### Production vs Development
- Error only shows in production (minified)
- Development build would show full error message
- Stack trace points to minified code, making debugging harder

### Related Issues
- Sidebars loading twice (suggests parent re-render)
- Visibility listener being added/removed (suggests dependency changes)
- Error occurs after successful data load (suggests state update triggers issue)

---

## 🎯 YOUR TASK

1. **Examine `apps/web/app/feed/page.tsx`** for:
   - Conditional hook calls
   - Early returns before all hooks
   - Hooks in loops or conditionals
   - Dynamic hook counts

2. **Examine child components** for:
   - Conditional hooks
   - Hooks that might not run on every render

3. **Identify the exact hook** causing the count mismatch

4. **Provide a fix** that ensures:
   - All hooks are called unconditionally
   - Hooks are called in the same order every render
   - Hook count never changes

5. **Test the fix** by:
   - Ensuring no conditional hooks
   - Ensuring no early returns before hooks
   - Ensuring hook count is constant

---

## 📚 REACT HOOKS RULES (Reminder)

1. ✅ **Only call hooks at the top level** - not inside loops, conditions, or nested functions
2. ✅ **Only call hooks from React functions** - not from regular JavaScript functions
3. ✅ **Call hooks in the same order every render** - React relies on hook order
4. ✅ **Don't call hooks conditionally** - all hooks must run on every render

---

**The error "Rendered more hooks than during the previous render" means one of these rules is being violated. Find and fix it!** 🎯

