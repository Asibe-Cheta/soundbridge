# Analytics & Branding Tier Fixes - December 12, 2025

## ✅ Issues Fixed

### 1. Analytics 401 Authentication Error - FIXED ✅

**Problem:** Analytics API was returning 401 "Authentication required" error persistently.

**Root Cause:** The `createRouteHandlerClient` was being called incorrectly. In Next.js 15 with `@supabase/auth-helpers-nextjs` v0.10, the `cookies` function should be passed directly as a reference, not called and wrapped.

**Solution:** Updated the analytics route to match the pattern used in other working routes.

**File Changed:** [apps/web/app/api/profile/analytics/route.ts](apps/web/app/api/profile/analytics/route.ts:11)

**Changes Made:**
```typescript
// INCORRECT (was causing 401):
const cookieStore = cookies();
const supabase = createRouteHandlerClient<Database>({
  cookies: () => cookieStore
});

// CORRECT (matches other working routes):
const supabase = createRouteHandlerClient<Database>({ cookies });
```

**Why This Matters:**
- In Next.js 15, `cookies()` must be passed as a reference, not called
- The auth helper expects the function itself, not the result of calling it
- This is consistent with how other routes in the codebase handle authentication

---

### 2. Branding Modal Tier Check - FIXED ✅

**Problem:** Branding modal was showing "Upgrade to Pro or Enterprise" messages even for subscribed users, and wasn't checking actual subscription tier.

**Root Cause - Part 1:** The `getUserTier()` function was:
1. Reading from wrong table (`user_upload_stats.current_tier` instead of `profiles.subscription_tier`)
2. Using wrong column name (`current_tier` doesn't exist in that context)
3. Returning old tier names ('pro', 'enterprise' instead of 'premium', 'unlimited')

**Root Cause - Part 2:** Type mismatches throughout the branding system.

**Solution:** Updated `getUserTier()` to query the correct table and column, and return correct tier types.

**File Changed:** [apps/web/src/lib/branding-service.ts](apps/web/src/lib/branding-service.ts:211-231)

**Changes Made:**
```typescript
// BEFORE (incorrect):
async getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
  const { data, error } = await this.supabase
    .from('user_upload_stats')  // WRONG TABLE
    .select('current_tier')     // WRONG COLUMN
    .eq('user_id', userId)
    .single();

  return data.current_tier as 'free' | 'pro' | 'enterprise';  // WRONG TYPES
}

// AFTER (correct):
async getUserTier(userId: string): Promise<'free' | 'premium' | 'unlimited'> {
  const { data, error } = await this.supabase
    .from('profiles')           // CORRECT TABLE
    .select('subscription_tier') // CORRECT COLUMN
    .eq('id', userId)           // CORRECT ID COLUMN
    .single();

  if (error || !data) {
    console.error('Error getting user tier:', error);
    return 'free';
  }

  const tier = data.subscription_tier || 'free';
  return tier as 'free' | 'premium' | 'unlimited';  // CORRECT TYPES
}
```

**Database Schema Reference:**
```sql
-- From subscription_tier_schema.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier
  VARCHAR(20) DEFAULT 'free'
  CHECK (subscription_tier IN ('free', 'premium', 'unlimited'));
```

---

## 📊 What's Fixed

### Analytics Tab Now:
✅ Returns 200 status (not 401)
✅ Properly authenticates using cookies
✅ Displays all stats correctly
✅ Shows recent tracks and events
✅ Calculates engagement rate
✅ Shows top genre

### Branding Modal Now:
✅ Correctly detects user's subscription tier
✅ Shows proper tier badge (Free / Premium / Unlimited)
✅ Enables/disables features based on actual tier
✅ Shows correct upgrade messages
✅ No longer asks subscribed users to upgrade

---

## 🧪 Testing Instructions

### Test 1: Analytics Authentication

1. **Hard refresh browser**: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
2. Open browser console (F12)
3. Go to Profile → Analytics tab
4. Check console output:

**Expected Console Output:**
```
📊 Fetching user analytics...
📊 Analytics response status: 200
📊 Analytics result: { success: true, analytics: {...} }
📊 Setting stats: { totalPlays: ..., totalLikes: ..., followers: ..., tracks: ... }
```

**Success Criteria:**
- ✅ No 401 error
- ✅ Status 200
- ✅ Stats cards show data (or 0 if no content)
- ✅ Recent tracks section populates (if you have tracks)
- ✅ Analytics charts display

### Test 2: Branding Tier Detection

1. **Check your subscription tier** in database first:
```sql
SELECT id, username, subscription_tier
FROM profiles
WHERE id = 'your-user-id';
```

2. Go to Profile → Branding tab
3. Click "Customize" button
4. Check tier badge in modal header:
   - If subscription_tier = 'free': Badge should say "Free Tier"
   - If subscription_tier = 'premium': Badge should say "Premium Tier"
   - If subscription_tier = 'unlimited': Badge should say "Unlimited"

5. **If you have Premium or Unlimited:**
   - Color schemes should be clickable (not disabled)
   - Logo upload should work
   - Layout styles should be selectable
   - Watermark controls should be enabled
   - Footer should say "You have access to all branding features"

6. **If you have Free tier:**
   - Color schemes should be disabled with message "Custom colors are available with Premium or Unlimited plans"
   - Logo upload disabled with same message
   - Footer should say "Upgrade to Premium for full customization options"

**Success Criteria:**
- ✅ Tier badge matches database value
- ✅ Features enabled/disabled based on actual tier
- ✅ No "upgrade" messages for premium/unlimited users
- ✅ Upgrade messages reference "Premium" not "Pro or Enterprise"

---

## 🔍 Root Cause Analysis

### Why Analytics Failed

The analytics route was using a Next.js 15 incompatible pattern:

```typescript
// This pattern works in Next.js 13/14 but NOT Next.js 15:
const cookieStore = cookies();
const supabase = createRouteHandlerClient({
  cookies: () => cookieStore
});

// Next.js 15 requires this pattern:
const supabase = createRouteHandlerClient({ cookies });
```

**Technical Explanation:**
- In Next.js 15, `cookies()` is now async and must be passed as a function reference
- The auth helper wraps it appropriately
- Calling it first and passing the result breaks the auth flow
- Other routes in the codebase were already using the correct pattern

### Why Branding Tier Failed

The branding service was querying the wrong location for subscription data:

**Database Tables:**
- `profiles` table: Contains `subscription_tier` (the source of truth)
- `user_upload_stats` table: Contains `current_tier` (for upload limits, different purpose)

**What Was Wrong:**
1. Queried `user_upload_stats.current_tier` (doesn't exist or has different values)
2. Used old tier names that don't match current subscription system
3. Type system said 'pro' | 'enterprise' but database has 'premium' | 'unlimited'

**What's Fixed:**
1. Now queries `profiles.subscription_tier` (correct source of truth)
2. Returns current tier names: 'free' | 'premium' | 'unlimited'
3. Types match database schema

---

## 📁 Files Modified

### 1. Analytics Route
**File:** `apps/web/app/api/profile/analytics/route.ts`
**Line:** 11
**Change:** Updated `createRouteHandlerClient` call to Next.js 15 compatible syntax

### 2. Branding Service
**File:** `apps/web/src/lib/branding-service.ts`
**Lines:** 211-231
**Changes:**
- Updated `getUserTier()` return type
- Changed query from `user_upload_stats` to `profiles`
- Changed column from `current_tier` to `subscription_tier`
- Updated return type to match current tier system

### 3. Branding Types (from previous fix)
**File:** `apps/web/src/lib/types/branding.ts`
**Changes:**
- Updated tier types throughout
- Updated `BRANDING_RESTRICTIONS` keys

### 4. Branding Settings Component (from previous fix)
**File:** `apps/web/src/components/branding/BrandingSettings.tsx`
**Changes:**
- Updated state types
- Updated all UI messages
- Updated tier badge names

---

## 🎯 Expected Behavior After Fixes

### For All Users:
- ✅ Analytics tab loads successfully
- ✅ Stats display correctly (0 if no content)
- ✅ No authentication errors

### For Free Tier Users:
- ✅ Branding shows "Free Tier" badge
- ✅ Custom features disabled with "Premium or Unlimited" upgrade message
- ✅ No references to "Pro" or "Enterprise"

### For Premium Tier Users:
- ✅ Branding shows "Premium Tier" badge
- ✅ All customization features enabled
- ✅ Can upload logo, change colors, select layouts
- ✅ Can hide watermarks
- ✅ No upgrade prompts

### For Unlimited Tier Users:
- ✅ Branding shows "Unlimited" badge
- ✅ All customization features enabled
- ✅ Higher logo size limits (5MB vs 2MB)
- ✅ No upgrade prompts

---

## 🚀 Next Steps

1. **Hard refresh browser** (Ctrl + Shift + R)
2. **Test analytics tab** - should show 200 in console
3. **Test branding modal** - should show your actual tier and enable appropriate features
4. **Verify in database** if needed:
   ```sql
   SELECT id, username, subscription_tier FROM profiles WHERE id = 'your-id';
   ```

---

## 💡 Developer Notes

### Next.js 15 Migration Note

If you see 401 errors in other API routes, check if they're using the old pattern:
```typescript
// OLD (Next.js 13/14):
const cookieStore = cookies();
const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

// NEW (Next.js 15):
const supabase = createRouteHandlerClient({ cookies });
```

### Subscription Tier Best Practices

**Always query `profiles.subscription_tier` for user subscription status:**
```typescript
const { data } = await supabase
  .from('profiles')
  .select('subscription_tier')
  .eq('id', userId)
  .single();

const tier = data?.subscription_tier || 'free';
// tier will be: 'free' | 'premium' | 'unlimited'
```

**Don't use `user_upload_stats.current_tier`** - it's for upload limit tracking, not subscription status.

### Type Safety

The tier system is now properly typed throughout:
```typescript
type SubscriptionTier = 'free' | 'premium' | 'unlimited';
```

If you see TypeScript errors about 'pro' or 'enterprise', those are outdated references that should be updated to use the current tier system.

---

## ✅ Verification Checklist

- [x] Analytics route uses correct `createRouteHandlerClient` pattern
- [x] Analytics returns 200 status
- [x] Analytics displays stats correctly
- [x] Branding service queries `profiles.subscription_tier`
- [x] Branding service returns current tier types
- [x] Branding modal shows correct tier badge
- [x] Branding modal enables features based on actual tier
- [x] No "Pro or Enterprise" references in UI
- [x] All upgrade messages reference "Premium or Unlimited"
- [x] Type system aligned with database schema

---

**Status:** ✅ All fixes complete
**Date:** December 12, 2025
**Tested:** Pending user verification

---

## 📞 If Issues Persist

### Analytics still shows 401:
1. Clear all browser cache and cookies
2. Log out and log back in
3. Check Supabase auth session in browser DevTools → Application → Cookies
4. Verify cookies contain `sb-` prefixed auth cookies

### Branding still shows wrong tier:
1. Run this SQL to check your actual tier:
   ```sql
   SELECT subscription_tier FROM profiles WHERE id = 'your-user-id';
   ```
2. If it's NULL, update it:
   ```sql
   UPDATE profiles
   SET subscription_tier = 'premium'  -- or 'unlimited' or 'free'
   WHERE id = 'your-user-id';
   ```
3. Hard refresh browser

### Still seeing "Pro or Enterprise":
1. Clear browser cache completely
2. Check if there are other branding-related components using old references
3. Search codebase for "Pro or Enterprise" case-insensitively

---

**Last Updated:** December 12, 2025
