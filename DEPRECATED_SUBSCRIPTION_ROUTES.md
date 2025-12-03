# Deprecated Subscription Routes

## Routes That Are No Longer Needed

These routes were part of the old subscription system and are now replaced by the unified Checkout Session flow:

### 1. `/api/subscription/upgrade/route.ts`
- **Status:** DEPRECATED
- **Reason:** Replaced by `/api/stripe/create-checkout-session`
- **Action:** Can be deleted if not used elsewhere
- **Note:** `useSubscription` hook has been updated to use SubscriptionService instead

### 2. `/api/onboarding/upgrade-pro/route.ts`
- **Status:** DEPRECATED (but kept for backward compatibility)
- **Reason:** PaymentCollection now uses SubscriptionService and Checkout Sessions
- **Action:** Can be deleted after confirming PaymentCollection works
- **Note:** This route had RLS issues and complex logic - no longer needed

## Current Unified Flow

All subscription upgrades now use:
1. **Frontend:** `SubscriptionService.createCheckoutSession()`
2. **Backend:** `/api/stripe/create-checkout-session` (uses correct auth)
3. **Payment:** Stripe Checkout Sessions (redirects to Stripe)
4. **Webhook:** `/api/stripe/webhook` (updates database using upsert)

## Files to Keep

- ✅ `/api/stripe/create-checkout-session/route.ts` - Main upgrade endpoint
- ✅ `/api/stripe/webhook/route.ts` - Handles Stripe events
- ✅ `/api/subscription/status/route.ts` - Gets subscription status
- ✅ `SubscriptionService.ts` - Unified service for all subscription operations

## Cleanup Recommendation

After testing the new flow:
1. Delete `/api/subscription/upgrade/route.ts` if not used
2. Delete `/api/onboarding/upgrade-pro/route.ts` if PaymentCollection works
3. Update any remaining references to use SubscriptionService
