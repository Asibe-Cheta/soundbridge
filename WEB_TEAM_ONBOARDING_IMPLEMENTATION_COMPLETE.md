# Onboarding New Flow Implementation - Web App Team

**Date:** December 2024  
**Status:** ✅ **BACKEND COMPLETE** - Frontend Components Pending  
**Based on:** `ONBOARDING_NEW_FLOW.md`, `WEB_TEAM_ONBOARDING_ENDPOINTS_REQUEST.md`, `TIER_CORRECTIONS.md`

---

## 📋 **OVERVIEW**

This document summarizes the implementation of the new onboarding flow for the web app, including database schema updates, API endpoints, tier corrections, and frontend component requirements.

---

## ✅ **COMPLETED IMPLEMENTATIONS**

### **1. Database Schema Updates**

#### **File:** `database/onboarding_new_flow_schema.sql`

**Changes:**
- ✅ Added `onboarding_user_type` column to `profiles` table
  - Values: `'music_creator'`, `'podcast_creator'`, `'industry_professional'`, `'music_lover'`, or `null`
- ✅ Added `money_back_guarantee_end_date` column to `user_subscriptions` table
  - Calculated as `subscription_start_date + 7 days`
- ✅ Created `onboarding_analytics` table for tracking onboarding events
- ✅ Created helper function `calculate_money_back_guarantee_end_date()`

**To Deploy:**
```sql
-- Run in Supabase SQL Editor
\i database/onboarding_new_flow_schema.sql
```

---

### **2. Tier Corrections Applied**

#### **File:** `database/fix_upload_limits_tier_corrections.sql`

**Corrections:**
- ✅ **Free Tier:** 3 lifetime uploads (does NOT reset monthly)
- ✅ **Pro Tier:** 10 uploads per month (resets on 1st of each month)
- ✅ Updated `check_upload_count_limit()` function
- ✅ Updated `check_upload_limit()` function to return detailed info with `period` field

**Key Changes:**
- Pro tier now checks uploads in current month only (not total)
- Free tier checks total uploads ever (lifetime limit)
- Error messages updated to reflect monthly reset for Pro

**To Deploy:**
```sql
-- Run in Supabase SQL Editor
\i database/fix_upload_limits_tier_corrections.sql
```

---

### **3. New API Endpoints Created**

#### **3.1 POST /api/onboarding/check-username**

**Purpose:** Real-time username availability checking

**Location:** `apps/web/app/api/onboarding/check-username/route.ts`

**Features:**
- ✅ Validates username format (3-30 chars, lowercase, alphanumeric + underscore)
- ✅ Checks uniqueness in real-time
- ✅ Returns suggestions if unavailable
- ✅ Works without authentication (for onboarding flow)

**Request:**
```json
{
  "username": "johnsmith"
}
```

**Response:**
```json
{
  "success": true,
  "available": true,
  "suggestions": []
}
```

---

#### **3.2 GET /api/onboarding/value-demo**

**Purpose:** Returns personalized creator profiles for value demonstration screen

**Location:** `apps/web/app/api/onboarding/value-demo/route.ts`

**Features:**
- ✅ Returns 3 diverse creator profiles (default)
- ✅ Filters by user type and genres (optional)
- ✅ Prioritizes high-engagement creators
- ✅ Falls back to general successful creators if no matches

**Query Parameters:**
- `user_type`: music_creator | podcast_creator | industry_professional | music_lover
- `genres`: Comma-separated genre IDs
- `limit`: Number of creators (default: 3, max: 10)

**Response:**
```json
{
  "success": true,
  "creators": [
    {
      "id": "uuid",
      "username": "sarahmitchell",
      "display_name": "Sarah Mitchell",
      "avatar_url": "https://...",
      "location": "London",
      "country": "United Kingdom",
      "bio": "Gospel Producer",
      "role": "creator",
      "stats": {
        "connections": 500,
        "tracks": 50,
        "verified": true
      }
    }
  ]
}
```

---

#### **3.3 POST /api/onboarding/upgrade-pro**

**Purpose:** Create Stripe subscription for Pro tier during onboarding (immediate payment, no trial)

**Location:** `apps/web/app/api/onboarding/upgrade-pro/route.ts`

**Features:**
- ✅ Creates Stripe customer (if doesn't exist)
- ✅ Creates payment method from card details
- ✅ Creates subscription with immediate payment (NO trial period)
- ✅ Sets `money_back_guarantee_end_date` (7 days from start)
- ✅ Updates `user_subscriptions` table
- ✅ Handles Stripe errors gracefully

**Request:**
```json
{
  "cardNumber": "4242424242424242",
  "cardExpiry": "12/25",
  "cardCvv": "123",
  "cardholderName": "John Smith",
  "period": "monthly"  // or "annual"
}
```

**Response (Success):**
```json
{
  "success": true,
  "subscription_id": "sub_xxx",
  "customer_id": "cus_xxx",
  "subscription_start_date": "2024-12-01T10:00:00Z",
  "money_back_guarantee_end_date": "2024-12-08T10:00:00Z",
  "next_billing_date": "2025-01-01T10:00:00Z",
  "amount": 999,  // £9.99 in pence
  "currency": "gbp"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Card declined",
  "error_code": "card_declined",
  "message": "Your card was declined. Please try a different payment method."
}
```

**Important Notes:**
- ⚠️ **Security:** This endpoint accepts raw card details. For production, consider using Stripe Elements on the frontend and passing Payment Intent IDs instead.
- ✅ **No Trial:** Subscription is created with `payment_behavior: 'default_incomplete'` and payment is confirmed immediately
- ✅ **Money-Back Guarantee:** `money_back_guarantee_end_date` is set to 7 days from subscription start

---

### **4. Updated Existing Endpoints**

#### **4.1 POST /api/user/onboarding-progress**

**Location:** `apps/web/app/api/user/onboarding-progress/route.ts`

**Updates:**
- ✅ Added support for `onboarding_user_type` field
- ✅ Accepts `userType` or `onboarding_user_type` in request body
- ✅ Validates user type values: `'music_creator'`, `'podcast_creator'`, `'industry_professional'`, `'music_lover'`, or `null`
- ✅ Initializes `onboarding_user_type` to `null` when creating new profiles

**New Request Fields:**
```json
{
  "userId": "uuid",
  "userType": "music_creator",  // NEW
  "currentStep": "quickSetup"    // Supports new flow steps
}
```

---

#### **4.2 POST /api/user/complete-profile**

**Location:** `apps/web/app/api/user/complete-profile/route.ts`

**Updates:**
- ✅ Added support for `onboarding_user_type` field
- ✅ Validates user type if provided
- ✅ Stores user type in profile

**New Request Fields:**
```json
{
  "role": "creator",
  "display_name": "John Smith",
  "username": "johnsmith",
  "onboarding_user_type": "music_creator",  // NEW
  // ... other fields
}
```

---

#### **4.3 POST /api/subscription/upgrade**

**Location:** `apps/web/app/api/subscription/upgrade/route.ts`

**Updates:**
- ✅ Sets `money_back_guarantee_end_date` when creating subscription
- ✅ Calculates as `subscription_start_date + 7 days`
- ✅ Returns `money_back_guarantee_end_date` in response

**Response Update:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      // ... existing fields
      "money_back_guarantee_end_date": "2024-12-08T10:00:00Z"  // NEW
    },
    "moneyBackGuarantee": {
      "eligible": true,
      "windowDays": 7,
      "endDate": "2024-12-08T10:00:00Z",  // NEW
      "message": "7-day money-back guarantee - full refund if not satisfied"
    }
  }
}
```

---

### **5. Upload Limit Error Messages Updated**

**Files Updated:**
- `apps/web/app/api/upload/validate/route.ts`
- `apps/web/app/api/upload/route.ts`

**Changes:**
- ✅ Free tier: "3 lifetime uploads" (clarified)
- ✅ Pro tier: "10 uploads per month. Your limit resets on the 1st of each month." (clarified monthly reset)

---

## 🚧 **PENDING IMPLEMENTATIONS**

### **1. Frontend Onboarding Components**

The new 7-screen onboarding flow needs to be implemented in React components. Current components need to be replaced/updated:

**Required Components:**

1. **WelcomeScreen** (NEW)
   - Auto-advances after 2 seconds or on tap
   - Shows SoundBridge logo and value proposition
   - Location: `apps/web/src/components/onboarding/WelcomeScreen.tsx`

2. **UserTypeSelection** (UPDATE existing `RoleSelectionModal.tsx`)
   - Options: Music Creator, Podcast Creator, Industry Professional, Music Lover
   - Maps to `onboarding_user_type` field
   - Location: `apps/web/src/components/onboarding/UserTypeSelection.tsx`

3. **QuickSetup** (UPDATE existing `ProfileCompletionWizard.tsx`)
   - Consolidated single-screen form
   - Fields: Display Name, Username (with real-time check), Genres (min 3), Location (optional)
   - Location: `apps/web/src/components/onboarding/QuickSetup.tsx`

4. **ValueDemo** (NEW)
   - Shows 3 creator profile cards
   - Fetches from `/api/onboarding/value-demo`
   - Location: `apps/web/src/components/onboarding/ValueDemo.tsx`

5. **TierSelection** (NEW)
   - Side-by-side Free vs Pro comparison
   - Highlights 7-day money-back guarantee
   - Location: `apps/web/src/components/onboarding/TierSelection.tsx`

6. **PaymentCollection** (NEW)
   - Stripe payment form (or Stripe Elements)
   - Shows money-back guarantee terms
   - Calls `/api/onboarding/upgrade-pro`
   - Location: `apps/web/src/components/onboarding/PaymentCollection.tsx`

7. **WelcomeConfirmation** (NEW)
   - Success animation
   - Shows tier status
   - Location: `apps/web/src/components/onboarding/WelcomeConfirmation.tsx`

**Updated Component:**

8. **OnboardingManager** (UPDATE)
   - Manages new 7-screen flow
   - Handles step progression
   - Location: `apps/web/src/components/onboarding/OnboardingManager.tsx`

---

### **2. Onboarding Context Updates**

**File:** `apps/web/src/contexts/OnboardingContext.tsx`

**Required Updates:**
- ✅ Add support for new flow steps: `welcome`, `userType`, `quickSetup`, `valueDemo`, `tierSelection`, `payment`, `welcomeConfirmation`
- ✅ Add `onboarding_user_type` to state
- ✅ Update step progression logic

---

## 📊 **DATABASE SCHEMA SUMMARY**

### **Profiles Table - New Fields**

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_user_type VARCHAR(50);
-- Values: 'music_creator', 'podcast_creator', 'industry_professional', 'music_lover', null
```

### **User Subscriptions Table - New Fields**

```sql
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS money_back_guarantee_end_date TIMESTAMPTZ;
-- Calculated as subscription_start_date + 7 days
```

### **Onboarding Analytics Table - New Table**

```sql
CREATE TABLE onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_name VARCHAR(100) NOT NULL,
  screen_name VARCHAR(50),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔌 **API ENDPOINTS SUMMARY**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/onboarding/check-username` | POST | Check username availability | ✅ **CREATED** |
| `/api/onboarding/value-demo` | GET | Get creator profiles for value demo | ✅ **CREATED** |
| `/api/onboarding/upgrade-pro` | POST | Create Pro subscription (onboarding) | ✅ **CREATED** |
| `/api/user/onboarding-progress` | POST | Update onboarding progress | ✅ **UPDATED** |
| `/api/user/complete-profile` | POST | Complete profile setup | ✅ **UPDATED** |
| `/api/user/complete-onboarding` | POST | Mark onboarding complete | ✅ **EXISTS** |
| `/api/subscription/upgrade` | POST | Upgrade subscription | ✅ **UPDATED** |

---

## 🎯 **TIER CORRECTIONS SUMMARY**

### **Upload Limits (Corrected)**

| Tier | Upload Limit | Reset Period | Implementation |
|------|--------------|--------------|----------------|
| **Free** | 3 tracks | Never (lifetime) | ✅ **CORRECTED** |
| **Pro** | 10 tracks | Monthly (1st of month) | ✅ **CORRECTED** |
| **Enterprise** | Unlimited | N/A | ✅ **CORRECTED** |

### **Database Functions Updated**

- ✅ `check_upload_count_limit(UUID)` - Now checks monthly for Pro tier
- ✅ `check_upload_limit(UUID)` - Returns detailed info with `period` field

### **Error Messages Updated**

- ✅ Free tier: "3 lifetime uploads"
- ✅ Pro tier: "10 uploads per month. Your limit resets on the 1st of each month."

---

## 💳 **STRIPE INTEGRATION**

### **Onboarding Upgrade Endpoint**

**Endpoint:** `POST /api/onboarding/upgrade-pro`

**Stripe Flow:**
1. Create or retrieve Stripe customer
2. Create payment method from card details
3. Attach payment method to customer
4. Create subscription with immediate payment (NO trial)
5. Confirm payment intent
6. Update database with subscription details and `money_back_guarantee_end_date`

**Important:**
- ⚠️ **Security Note:** Currently accepts raw card details. For production, consider using Stripe Elements on frontend.
- ✅ **No Trial Period:** Subscription charges immediately
- ✅ **Money-Back Guarantee:** Tracked in database, not in Stripe

---

## 📝 **NEXT STEPS FOR FRONTEND TEAM**

### **Priority 1: Database Migration**

1. Run `database/onboarding_new_flow_schema.sql` in Supabase SQL Editor
2. Run `database/fix_upload_limits_tier_corrections.sql` in Supabase SQL Editor
3. Verify new columns exist in `profiles` and `user_subscriptions` tables

### **Priority 2: Create New Onboarding Components**

1. Create `WelcomeScreen.tsx` component
2. Update `RoleSelectionModal.tsx` → `UserTypeSelection.tsx` (new options)
3. Update `ProfileCompletionWizard.tsx` → `QuickSetup.tsx` (consolidated form)
4. Create `ValueDemo.tsx` component
5. Create `TierSelection.tsx` component
6. Create `PaymentCollection.tsx` component
7. Create `WelcomeConfirmation.tsx` component
8. Update `OnboardingManager.tsx` to manage new flow

### **Priority 3: Update Onboarding Context**

1. Add new step types to `OnboardingStep` type
2. Add `onboarding_user_type` to state
3. Update step progression logic

### **Priority 4: Integration Testing**

1. Test username checking in real-time
2. Test value demo with different user types
3. Test Pro upgrade flow with Stripe test cards
4. Test Free tier selection
5. Verify `money_back_guarantee_end_date` is set correctly
6. Verify `onboarding_user_type` is saved correctly

---

## 🧪 **TESTING CHECKLIST**

### **Database**
- [ ] Run `onboarding_new_flow_schema.sql` migration
- [ ] Run `fix_upload_limits_tier_corrections.sql` migration
- [ ] Verify `onboarding_user_type` column exists in `profiles`
- [ ] Verify `money_back_guarantee_end_date` column exists in `user_subscriptions`
- [ ] Verify `onboarding_analytics` table exists

### **API Endpoints**
- [ ] Test `POST /api/onboarding/check-username` with valid/invalid usernames
- [ ] Test `GET /api/onboarding/value-demo` with/without filters
- [ ] Test `POST /api/onboarding/upgrade-pro` with Stripe test cards
- [ ] Test `POST /api/user/onboarding-progress` with `onboarding_user_type`
- [ ] Test `POST /api/user/complete-profile` with `onboarding_user_type`
- [ ] Verify `money_back_guarantee_end_date` is set in subscription upgrade

### **Upload Limits**
- [ ] Test Free tier: Upload 3 tracks (should succeed), 4th track (should fail)
- [ ] Test Pro tier: Upload 10 tracks in January (should succeed), 11th track (should fail)
- [ ] Test Pro tier: Upload 10 tracks in February (should succeed - monthly reset)
- [ ] Verify error messages mention "lifetime" for Free and "per month" for Pro

---

## 📚 **RELATED DOCUMENTS**

- `ONBOARDING_NEW_FLOW.md` - Complete onboarding flow specification
- `WEB_TEAM_ONBOARDING_ENDPOINTS_REQUEST.md` - Mobile team's endpoint requirements
- `TIER_CORRECTIONS.md` - Tier structure corrections (Pro = 10/month)
- `TIER_RESTRUCTURE.md` - Original tier restructure document
- `MOBILE_TEAM_TIER_RESTRUCTURE_GUIDE.md` - Mobile team integration guide

---

## ⚠️ **IMPORTANT NOTES**

1. **No Free Trial:** All Pro subscriptions charge immediately. No `trial_period_days` in Stripe.
2. **Money-Back Guarantee:** Tracked in database (`money_back_guarantee_end_date`), not in Stripe.
3. **Upload Limits:** Pro tier resets monthly on the 1st, not lifetime.
4. **Security:** Consider using Stripe Elements on frontend instead of passing raw card details.
5. **Onboarding User Type:** Different from `role` field - `onboarding_user_type` is for categorization, `role` is for permissions.

---

## 🎉 **SUMMARY**

✅ **Backend Implementation:** 100% Complete
- Database schema updated
- All API endpoints created/updated
- Tier corrections applied
- Stripe integration ready

🚧 **Frontend Implementation:** Pending
- New onboarding components need to be created
- Onboarding context needs updates
- Integration with new endpoints required

---

**END OF DOCUMENT**
