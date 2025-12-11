# Onboarding Fixes Summary

**Date:** December 11, 2025
**Status:** ✅ **COMPLETED**

---

## 🐛 Issues Fixed

### 1. **Onboarding Modal Shows Every Time Despite Active Subscription**

**Problem:**
The onboarding modal was appearing on every page load/refresh, even for users with active Premium or Unlimited subscriptions.

**Root Cause:**
The [onboarding-status API](apps/web/app/api/user/onboarding-status/route.ts) only checked `onboarding_completed` flag, but didn't check if the user had an active subscription. Subscribed users should skip onboarding entirely.

**Fix Applied:**
- Added `subscription_tier` and `subscription_status` to the profile query
- Added logic to check for active subscriptions (Premium/Unlimited with 'active' status)
- Users with active subscriptions now bypass onboarding completely, even if `onboarding_completed` is false

**Code Changes:**
```typescript
// CRITICAL FIX: If user has an active subscription (premium/unlimited with active status),
// they should NEVER see onboarding again, even if onboarding_completed is false
const hasActiveSubscription = profile?.subscription_tier &&
                               ['premium', 'unlimited'].includes(profile.subscription_tier) &&
                               profile?.subscription_status === 'active';

const needsOnboarding = !hasActiveSubscription &&
                        (!profile?.onboarding_completed ||
                        (isOldFlow && !profile?.role) ||
                        (isNewFlow && !profile?.role && !profile?.onboarding_user_type));
```

---

### 2. **TierSelection Component Used Old Tier System (Free, Pro)**

**Problem:**
The TierSelection component still showed the old "Free" and "Pro" tiers instead of the new 3-tier system: Free, Premium (£6.99), Unlimited (£12.99).

**Fix Applied:**
- Updated interface to accept `'free' | 'premium' | 'unlimited'`
- Changed grid layout from 2 columns to 3 columns
- Updated all pricing:
  - **Free:** £0 forever (3 lifetime uploads, 5 searches/month, 2 messages/month)
  - **Premium:** £6.99/month (7 tracks/month, Featured 1x/month, Advanced analytics)
  - **Unlimited:** £12.99/month (UNLIMITED uploads, Featured 2x/month, Top priority)
- Added tier-specific colors:
  - Free: Blue theme
  - Premium: Purple theme (Most Popular badge)
  - Unlimited: Yellow/Orange theme
- Updated all button text and actions

**Files Modified:**
- [TierSelection.tsx](apps/web/src/components/onboarding/TierSelection.tsx)

---

### 3. **PaymentCollection Component Hardcoded to 'Pro' Tier**

**Problem:**
PaymentCollection component was hardcoded to handle only 'Pro' tier payments at £9.99/£99.00, didn't support Premium or Unlimited tiers.

**Fix Applied:**
- Added `selectedTier` prop to accept 'premium' or 'unlimited'
- Updated pricing logic:
  - Premium: £6.99/month, £69.99/year (Save £13.89)
  - Unlimited: £12.99/month, £129.99/year (Save £25.89)
- Dynamic tier name display in UI
- Updated Stripe Price ID selection based on tier
- Updated button text to show selected tier name

**Files Modified:**
- [PaymentCollection.tsx](apps/web/src/components/onboarding/PaymentCollection.tsx)
- [OnboardingManager.tsx](apps/web/src/components/onboarding/OnboardingManager.tsx) - Pass selectedTier prop

---

### 4. **OnboardingContext Type Definitions Outdated**

**Problem:**
OnboardingContext still used 'pro' type instead of 'premium' | 'unlimited'.

**Fix Applied:**
- Updated `selectedTier` type from `'free' | 'pro' | null` to `'free' | 'premium' | 'unlimited' | null`
- Updated `setSelectedTier` function signature
- Ensured type consistency across all onboarding components

**Files Modified:**
- [OnboardingContext.tsx](apps/web/src/contexts/OnboardingContext.tsx)

---

## 📋 Complete File Changes

### 1. **apps/web/app/api/user/onboarding-status/route.ts**
- ✅ Added `subscription_tier` and `subscription_status` to profile query
- ✅ Added `hasActiveSubscription` check
- ✅ Updated `needsOnboarding` logic to skip onboarding for subscribed users
- ✅ Added subscription info to debug logs

### 2. **apps/web/src/components/onboarding/TierSelection.tsx**
- ✅ Updated interface: `onContinue: (tier: 'free' | 'premium' | 'unlimited') => void`
- ✅ Changed `selectedTier` state type to include all 3 tiers
- ✅ Changed grid from 2 columns to 3 columns
- ✅ Replaced "Free" and "Pro" cards with "Free", "Premium", "Unlimited"
- ✅ Updated all pricing to match new tier system
- ✅ Added tier-specific feature lists
- ✅ Updated button actions to handle all 3 tiers
- ✅ Changed "Pro" badge to "Most Popular" for Premium
- ✅ Updated social proof text

### 3. **apps/web/src/components/onboarding/PaymentCollection.tsx**
- ✅ Added `selectedTier` prop to interface
- ✅ Updated PaymentForm to accept and use selectedTier
- ✅ Dynamic pricing based on tier (Premium: £6.99/£69.99, Unlimited: £12.99/£129.99)
- ✅ Dynamic savings calculation
- ✅ Dynamic tier name display
- ✅ Updated button text to show selected tier
- ✅ Updated Stripe Price ID selection

### 4. **apps/web/src/components/onboarding/OnboardingManager.tsx**
- ✅ Pass `selectedTier` prop to PaymentCollection component

### 5. **apps/web/src/contexts/OnboardingContext.tsx**
- ✅ Updated `selectedTier` type definition
- ✅ Updated `setSelectedTier` function signature

---

## 🎯 Expected Behavior After Fixes

### For Subscribed Users:
1. ✅ Users with active Premium/Unlimited subscriptions will **NEVER** see the onboarding modal
2. ✅ Even if `onboarding_completed` is false in database, subscribed users skip onboarding
3. ✅ Onboarding only shows for Free tier users or users without active subscriptions

### For New Users in Onboarding:
1. ✅ See correct 3-tier system: Free, Premium (£6.99), Unlimited (£12.99)
2. ✅ Can select any of the 3 tiers
3. ✅ Free tier selection → Skip payment → Welcome confirmation
4. ✅ Premium selection → Payment modal with £6.99/month or £69.99/year options
5. ✅ Unlimited selection → Payment modal with £12.99/month or £129.99/year options
6. ✅ Payment modal shows correct pricing and tier name based on selection
7. ✅ Stripe checkout uses correct Price IDs for selected tier

---

## ✅ Testing Checklist

- [ ] Verify subscribed users (Premium/Unlimited) don't see onboarding modal on refresh
- [ ] Verify Free tier users still see onboarding modal (if not completed)
- [ ] Test TierSelection shows all 3 tiers correctly
- [ ] Test Free tier selection → Goes to welcome confirmation (no payment)
- [ ] Test Premium tier selection → Goes to payment modal with £6.99/£69.99
- [ ] Test Unlimited tier selection → Goes to payment modal with £12.99/£129.99
- [ ] Verify payment modal shows correct tier name in title
- [ ] Verify payment modal shows correct pricing for monthly/annual
- [ ] Verify Stripe checkout redirects correctly
- [ ] Check browser console for subscription_tier/subscription_status in logs

---

## 🔍 Debug Tips

### Check Onboarding Status API Response:
Open browser DevTools Network tab and look for `/api/user/onboarding-status` response:

```json
{
  "success": true,
  "needsOnboarding": false,  // Should be false for subscribed users
  "profile": {
    "subscription_tier": "premium",  // or "unlimited"
    "subscription_status": "active",
    "onboarding_completed": true  // or false - doesn't matter if subscribed
  }
}
```

### Check Console Logs:
Look for this log in browser console:
```
📊 Onboarding status check result: {
  userId: "...",
  hasProfile: true,
  role: "musician",
  onboardingCompleted: false,
  subscriptionTier: "premium",
  subscriptionStatus: "active",
  hasActiveSubscription: true,  // This should be true for subscribed users
  needsOnboarding: false,  // This should be false for subscribed users
  currentStep: "completed"
}
```

---

## 📝 Notes

- All changes are backward compatible with existing onboarding flow
- Old Pro tier references removed from codebase
- New tier system aligns with pricing page: Free, Premium, Unlimited
- Subscribed users will never see onboarding modal, even if database flag is incorrect
- Payment flow correctly handles both Premium and Unlimited tiers with accurate pricing

---

**Status:** ✅ All fixes implemented and ready for testing
