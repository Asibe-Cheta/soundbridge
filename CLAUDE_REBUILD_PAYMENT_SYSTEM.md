# Claude: Rebuild Payment/Subscription System - Complete Analysis & Plan

## Current Situation

The user is frustrated because:
1. **Tipping system works perfectly** - Uses Stripe Payment Intents, payments go through
2. **Subscription/upgrade system is broken** - Multiple issues:
   - RLS policy causing `42703: column "user_id" does not exist` errors
   - Authentication failing in `/api/stripe/create-checkout-session` (401 Unauthorized)
   - Multiple conflicting implementations
   - No clear, simple flow

## Root Causes Identified

### 1. Authentication Inconsistency
- **Working (Tipping):** Uses `getSupabaseRouteClient` helper or consistent pattern
- **Broken (Checkout):** Uses custom auth with `createServerComponentClient` (wrong for API routes)
- **Issue:** `createServerComponentClient` is for Server Components, not API routes

### 2. RLS Policy Issue
- PostgREST validates RLS policies BEFORE executing UPDATE
- Direct `user_id` reference in UPDATE USING clause fails validation
- Solution: Use ID subquery (already created in `fix_rls_policy_use_id_subquery.sql`)

### 3. Multiple Conflicting Flows
- Onboarding upgrade flow (`/api/onboarding/upgrade-pro`)
- Pricing page upgrade flow (`/api/stripe/create-checkout-session`)
- Both trying to do the same thing but differently

## Working System Analysis (Tipping)

### Tipping Flow (WORKS):
```typescript
// 1. Create Payment Intent
POST /api/payments/create-tip
- Uses consistent auth pattern
- Creates Stripe Payment Intent
- Returns clientSecret

// 2. Frontend confirms payment
- Uses Stripe.js to confirm payment
- Calls /api/payments/confirm-tip on success
- Updates database

// 3. Database update
- Simple INSERT into tips table
- No complex UPDATE operations
- No RLS issues
```

### Why Tipping Works:
1. ✅ Uses Payment Intents (one-time payments)
2. ✅ Simple database operations (INSERT only)
3. ✅ Consistent authentication
4. ✅ Clear, single flow

## Broken System Analysis (Subscriptions)

### Current Subscription Flow (BROKEN):
```typescript
// Option 1: Onboarding flow
POST /api/onboarding/upgrade-pro
- Complex logic
- Tries to UPDATE user_subscriptions
- Fails with RLS policy error

// Option 2: Pricing page flow  
POST /api/stripe/create-checkout-session
- Uses wrong auth method
- Returns 401 Unauthorized
- Never gets to Stripe

// Both try to:
- Create Stripe subscription
- Update user_subscriptions table
- Handle webhooks
```

### Why Subscriptions Fail:
1. ❌ Uses Checkout Sessions (different from Payment Intents)
2. ❌ Complex UPDATE operations with RLS issues
3. ❌ Inconsistent authentication
4. ❌ Multiple conflicting implementations

## Recommended Solution: Rebuild with Simple Pattern

### Option A: Use Payment Intents (Like Tipping)
**Pros:**
- Same pattern as working tipping system
- No RLS UPDATE issues (can use INSERT with ON CONFLICT)
- Simpler flow
- Already proven to work

**Cons:**
- Need to handle recurring billing manually or via Stripe Billing
- More code for subscription management

### Option B: Fix Checkout Sessions (Recommended)
**Pros:**
- Stripe handles recurring billing automatically
- Industry standard for subscriptions
- Less code for subscription management

**Cons:**
- Need to fix authentication
- Need to fix RLS policies
- Need webhook handling

## Rebuild Plan

### Phase 1: Fix Authentication (Critical)
**File:** `apps/web/app/api/stripe/create-checkout-session/route.ts`

**Current (BROKEN):**
```typescript
// Uses createServerComponentClient (WRONG for API routes)
const supabase = createServerComponentClient({ cookies });
```

**Should Be:**
```typescript
// Use unified helper like tipping system
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
```

### Phase 2: Fix RLS Policies
**File:** `database/fix_rls_policy_use_id_subquery.sql`

**Status:** Already created, just needs to be run

### Phase 3: Simplify Subscription Flow
**Create single, unified flow:**

1. **Frontend:** User clicks "Upgrade to Pro"
   - Single button/component
   - Works from both onboarding and pricing page

2. **Backend:** Create Checkout Session
   - Use fixed authentication
   - Create Stripe Checkout Session
   - Return session URL

3. **Stripe:** Handle Payment
   - User completes payment on Stripe
   - Stripe sends webhook

4. **Webhook:** Update Database
   - Receive webhook from Stripe
   - Update user_subscriptions (using fixed RLS policies)
   - Or use INSERT with ON CONFLICT (simpler)

### Phase 4: Clean Up
- Remove duplicate/conflicting code
- Remove complex RPC functions (if not needed)
- Simplify database operations

## Specific Files to Fix

### 1. Authentication Fix
**File:** `apps/web/app/api/stripe/create-checkout-session/route.ts`
- Replace custom auth with `getSupabaseRouteClient`
- Match pattern from `apps/web/app/api/payments/create-tip/route.ts`

### 2. RLS Policy Fix
**File:** `database/fix_rls_policy_use_id_subquery.sql`
- Run this script in Supabase
- This fixes the UPDATE issue

### 3. Simplify Database Operations
**Option:** Use INSERT with ON CONFLICT instead of UPDATE
```sql
INSERT INTO user_subscriptions (user_id, tier, status, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (user_id) 
DO UPDATE SET tier = EXCLUDED.tier, status = EXCLUDED.status, ...
```

This avoids RLS UPDATE policy issues entirely!

## Questions for Claude

1. **Should we use Payment Intents (like tipping) or Checkout Sessions (standard subscriptions)?**
   - Payment Intents: Simpler, proven to work, but manual recurring billing
   - Checkout Sessions: Industry standard, automatic recurring, but need to fix issues

2. **Should we use INSERT with ON CONFLICT instead of UPDATE?**
   - Pros: Avoids RLS UPDATE policy issues
   - Cons: Slightly less efficient (but negligible)

3. **Should we create a unified subscription service?**
   - Similar to `RevenueService` for tipping
   - Single place for all subscription logic
   - Easier to maintain

4. **What's the simplest path forward?**
   - Fix auth + RLS policies and keep Checkout Sessions?
   - Or rebuild with Payment Intents pattern?

## Request

Please:
1. **Review the working tipping system** - understand why it works
2. **Compare with broken subscription system** - identify all differences
3. **Recommend the simplest rebuild approach**
4. **Provide clean, working code** for the chosen approach
5. **Ensure it works from both onboarding and pricing page**

The user wants a clean, simple solution that just works. No more complex workarounds.
