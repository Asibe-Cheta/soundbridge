# Onboarding API Endpoints Response - Web App Team

**Date:** December 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Status:** ✅ **ALL ENDPOINTS IMPLEMENTED**  
**Response to:** `WEB_TEAM_ONBOARDING_ENDPOINTS_REQUEST.md`

---

## ✅ **CONFIRMATION: ALL ENDPOINTS IMPLEMENTED**

All requested API endpoints have been implemented and are ready for use. The new onboarding flow has been **fully implemented** and **replaced** the old flow for new users. The old flow remains available for backward compatibility with users who are mid-onboarding.

**New users will automatically start with the new 7-screen flow:**
1. Welcome Screen
2. User Type Selection
3. Quick Setup
4. Value Demonstration
5. Tier Selection
6. Payment Collection (if Pro selected)
7. Welcome Confirmation

---

## 🗄️ **DATABASE SCHEMA - COMPLETE DATA MAPPING**

This section maps every piece of data collected during onboarding to its database location.

### **1. Profiles Table (`profiles`)**

**Location:** Supabase `profiles` table (extends `auth.users`)

**Onboarding Fields:**

| Field Name | Type | Values | Description | When Set |
|------------|------|--------|-------------|----------|
| `onboarding_completed` | BOOLEAN | `true` / `false` | Whether onboarding is complete | Set to `true` on completion |
| `onboarding_completed_at` | TIMESTAMP | ISO timestamp | When onboarding was completed | Set on completion |
| `onboarding_step` | VARCHAR | `'welcome'`, `'userType'`, `'quickSetup'`, `'valueDemo'`, `'tierSelection'`, `'payment'`, `'welcomeConfirmation'`, `'completed'` | Current step in onboarding | Updated at each step |
| `onboarding_user_type` | VARCHAR(50) | `'music_creator'`, `'podcast_creator'`, `'industry_professional'`, `'music_lover'`, `null` | User type selected in step 2 | Set in User Type Selection |
| `profile_completed` | BOOLEAN | `true` / `false` | Whether profile setup is complete | Set to `true` after Quick Setup |

**Profile Data Fields:**

| Field Name | Type | Values | Description | When Set |
|------------|------|--------|-------------|----------|
| `username` | VARCHAR(50) | Unique, lowercase, alphanumeric + underscore | Username (e.g., "johnsmith") | Set in Quick Setup |
| `display_name` | VARCHAR(100) | Any string | Display name (e.g., "John Smith") | Set in Quick Setup |
| `bio` | TEXT | Any string | User biography | Optional, set in Quick Setup |
| `role` | ENUM | `'creator'`, `'listener'` | User role for permissions | Set in Quick Setup (mapped from `onboarding_user_type`) |
| `genres` | TEXT[] | Array of genre IDs | Selected genres (min 3) | Set in Quick Setup |
| `country` | VARCHAR(100) | Country name | User's country | Optional, set in Quick Setup |
| `location` | VARCHAR(255) | Location string | User's location | Optional, set in Quick Setup |
| `avatar_url` | TEXT | URL string | Profile picture URL | Optional, can be set later |

**Role Mapping:**
- `onboarding_user_type: 'music_creator'` → `role: 'creator'`
- `onboarding_user_type: 'podcast_creator'` → `role: 'creator'`
- `onboarding_user_type: 'industry_professional'` → `role: 'creator'`
- `onboarding_user_type: 'music_lover'` → `role: 'listener'`

**SQL Schema:**
```sql
-- Profiles table (relevant columns)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  role user_role NOT NULL DEFAULT 'listener',  -- 'creator' or 'listener'
  genres TEXT[],  -- Array of genre IDs
  country VARCHAR(100),
  location VARCHAR(255),
  avatar_url TEXT,
  
  -- Onboarding fields
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_step VARCHAR(50) DEFAULT 'welcome',
  onboarding_user_type VARCHAR(50),  -- 'music_creator', 'podcast_creator', 'industry_professional', 'music_lover'
  profile_completed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **2. User Subscriptions Table (`user_subscriptions`)**

**Location:** Supabase `user_subscriptions` table

**Subscription Fields:**

| Field Name | Type | Values | Description | When Set |
|------------|------|--------|-------------|----------|
| `tier` | VARCHAR(20) | `'free'`, `'pro'`, `'enterprise'` | Subscription tier | Set on tier selection |
| `status` | VARCHAR(20) | `'active'`, `'cancelled'`, `'expired'`, `'past_due'` | Subscription status | Set to `'active'` on Pro upgrade |
| `billing_cycle` | VARCHAR(20) | `'monthly'`, `'yearly'` | Billing period | Set on Pro upgrade |
| `subscription_start_date` | TIMESTAMPTZ | ISO timestamp | When subscription started | Set on Pro upgrade |
| `subscription_renewal_date` | TIMESTAMPTZ | ISO timestamp | Next billing date | Set on Pro upgrade |
| `subscription_ends_at` | TIMESTAMPTZ | ISO timestamp | When subscription ends | Set on Pro upgrade |
| `money_back_guarantee_end_date` | TIMESTAMPTZ | ISO timestamp | End of 7-day guarantee window | Set to `subscription_start_date + 7 days` |
| `stripe_customer_id` | VARCHAR(255) | Stripe customer ID | Stripe customer ID | Set on Pro upgrade |
| `stripe_subscription_id` | VARCHAR(255) | Stripe subscription ID | Stripe subscription ID | Set on Pro upgrade |
| `money_back_guarantee_eligible` | BOOLEAN | `true` / `false` | Whether eligible for guarantee | Defaults to `true` |
| `refund_count` | INTEGER | 0+ | Number of refunds requested | Defaults to 0 |

**SQL Schema:**
```sql
-- User subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),
  subscription_start_date TIMESTAMPTZ,
  subscription_renewal_date TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  money_back_guarantee_end_date TIMESTAMPTZ,  -- NEW: 7 days from subscription_start_date
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  money_back_guarantee_eligible BOOLEAN DEFAULT true,
  refund_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** Subscription data is stored in `user_subscriptions` table, NOT in `profiles` table. You need to JOIN to get subscription info.

---

### **3. Onboarding Analytics Table (`onboarding_analytics`)**

**Location:** Supabase `onboarding_analytics` table

**Analytics Fields:**

| Field Name | Type | Description | Example Values |
|------------|------|-------------|----------------|
| `user_id` | UUID | Reference to profiles.id | User's UUID |
| `event_name` | VARCHAR(100) | Event name | `'onboarding_started'`, `'user_type_selected'`, `'profile_created'`, `'value_demo_viewed'`, `'tier_selected'`, `'payment_method_added'`, `'onboarding_completed'` |
| `screen_name` | VARCHAR(50) | Current screen | `'welcome'`, `'userType'`, `'quickSetup'`, `'valueDemo'`, `'tierSelection'`, `'payment'`, `'welcomeConfirmation'` |
| `properties` | JSONB | Additional event data | `{"user_type": "music_creator", "selected_tier": "pro", "time_spent": 45}` |
| `created_at` | TIMESTAMPTZ | Event timestamp | ISO timestamp |

**SQL Schema:**
```sql
-- Onboarding analytics table
CREATE TABLE onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_name VARCHAR(100) NOT NULL,
  screen_name VARCHAR(50),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX idx_onboarding_analytics_event_name ON onboarding_analytics(event_name);
CREATE INDEX idx_onboarding_analytics_screen_name ON onboarding_analytics(screen_name);
CREATE INDEX idx_onboarding_analytics_created_at ON onboarding_analytics(created_at DESC);
```

---

### **4. Genres Table (`genres`)**

**Location:** Supabase `genres` table

**Genre Fields:**

| Field Name | Type | Description | Example Values |
|------------|------|-------------|----------------|
| `id` | UUID | Genre ID | UUID |
| `name` | VARCHAR(100) | Genre name | `'Afrobeats'`, `'Gospel'`, `'Hip-Hop'` |
| `category` | VARCHAR(20) | Genre category | `'music'`, `'podcast'` |
| `description` | TEXT | Genre description | Text description |
| `is_active` | BOOLEAN | Whether genre is active | `true` / `false` |
| `sort_order` | INTEGER | Display order | 1, 2, 3... |

**SQL Schema:**
```sql
-- Genres table
CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('music', 'podcast')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** User's selected genres are stored as an array of genre IDs in `profiles.genres` (TEXT[]).

---

## 🔌 **API ENDPOINTS - COMPLETE REFERENCE**

### **1. POST /api/onboarding/check-username** ✅

**Purpose:** Real-time username availability checking

**Endpoint:** `POST /api/onboarding/check-username`

**Authentication:** Optional (works without auth)

**Request:**
```json
{
  "username": "johnsmith"
}
```

**Response (Available):**
```json
{
  "success": true,
  "available": true,
  "suggestions": []
}
```

**Response (Unavailable):**
```json
{
  "success": true,
  "available": false,
  "suggestions": ["johnsmith1", "johnsmith2", "johnsmith3"]
}
```

**Validation Rules:**
- Minimum 3 characters
- Maximum 30 characters
- Lowercase only
- Alphanumeric + underscore only
- Must be unique (checked against `profiles.username`)

**Database:** Checks `profiles.username` column

---

### **2. GET /api/onboarding/value-demo** ✅

**Purpose:** Get personalized creator profiles for value demonstration

**Endpoint:** `GET /api/onboarding/value-demo`

**Authentication:** Optional (recommended)

**Query Parameters:**
- `user_type` (optional): `'music_creator'`, `'podcast_creator'`, `'industry_professional'`, `'music_lover'`
- `genres` (optional): Comma-separated genre IDs (e.g., `"uuid1,uuid2,uuid3"`)
- `limit` (optional): Number of creators (default: 3, max: 10)

**Example Request:**
```
GET /api/onboarding/value-demo?user_type=music_creator&genres=uuid1,uuid2&limit=3
```

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

**Database:** Queries `profiles` table with `role = 'creator'`, filters by genres if provided, orders by `followers_count` DESC

---

### **3. POST /api/onboarding/upgrade-pro** ✅

**Purpose:** Create Stripe subscription for Pro tier during onboarding (immediate payment, no trial)

**Endpoint:** `POST /api/onboarding/upgrade-pro`

**Authentication:** Required (Bearer token or cookie)

**⚠️ IMPORTANT UPDATE (December 2025):** This endpoint now requires a `paymentMethodId` from Stripe's mobile SDK instead of raw card details. See `MOBILE_TEAM_PAYMENT_SECURITY_FIX_UPDATE.md` for complete migration guide.

**Request:**
```json
{
  "paymentMethodId": "pm_1ABC123...",  // Required - Created using Stripe React Native SDK
  "period": "monthly"  // or "annual" - Required
}
```

**⚠️ DEPRECATED (No Longer Works):**
```json
{
  "cardNumber": "4242424242424242",  // ❌ No longer accepted
  "cardExpiry": "12/25",             // ❌ No longer accepted
  "cardCvv": "123",                  // ❌ No longer accepted
  "cardholderName": "John Smith",    // ❌ No longer accepted
  "period": "monthly"
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

**Response (Error - Card Declined):**
```json
{
  "success": false,
  "error": "Card declined",
  "error_code": "card_declined",
  "message": "Your card was declined. Please try a different payment method."
}
```

**Database Operations:**
1. Creates/retrieves Stripe customer
2. Creates payment method
3. Creates Stripe subscription (immediate payment, NO trial)
4. Updates `user_subscriptions` table with:
   - `tier: 'pro'`
   - `status: 'active'`
   - `billing_cycle: 'monthly'` or `'yearly'`
   - `subscription_start_date: NOW()`
   - `subscription_renewal_date: subscription_start_date + 1 month/year`
   - `money_back_guarantee_end_date: subscription_start_date + 7 days`
   - `stripe_customer_id: cus_xxx`
   - `stripe_subscription_id: sub_xxx`

**Important Notes:**
- ✅ **Security:** This endpoint now uses secure payment method IDs (PCI compliant)
- ✅ **Mobile:** Use Stripe React Native SDK to create payment methods (see `MOBILE_TEAM_PAYMENT_SECURITY_FIX_UPDATE.md`)
- ✅ **No Trial:** Subscription charges immediately (no `trial_period_days` in Stripe)
- ✅ **Money-Back Guarantee:** Tracked in database, not in Stripe

---

### **4. POST /api/user/onboarding-progress** ✅

**Purpose:** Update user's onboarding progress

**Endpoint:** `POST /api/user/onboarding-progress`

**Authentication:** Required

**Request:**
```json
{
  "userId": "uuid",
  "currentStep": "quickSetup",  // 'welcome', 'userType', 'quickSetup', 'valueDemo', 'tierSelection', 'payment', 'welcomeConfirmation'
  "userType": "music_creator",  // or "onboarding_user_type": "music_creator"
  "profileCompleted": false,
  "firstActionCompleted": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding progress updated successfully",
  "profile": { /* updated profile object */ }
}
```

**Database:** Updates `profiles` table:
- `onboarding_step` → `currentStep`
- `onboarding_user_type` → `userType` or `onboarding_user_type`
- `profile_completed` → `profileCompleted`
- `first_action_completed` → `firstActionCompleted`

---

### **5. POST /api/user/complete-profile** ✅

**Purpose:** Complete profile setup (called after Quick Setup screen)

**Endpoint:** `POST /api/user/complete-profile`

**Authentication:** Required

**Request:**
```json
{
  "role": "creator",  // 'creator' or 'listener' (mapped from onboarding_user_type)
  "display_name": "John Smith",
  "username": "johnsmith",
  "genres": ["uuid1", "uuid2", "uuid3"],  // Array of genre IDs (min 3)
  "country": "United Kingdom",
  "location": "London",
  "bio": "Music producer",
  "onboarding_user_type": "music_creator",  // NEW
  "avatar_url": "https://..."  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "profile": { /* complete profile object */ }
}
```

**Database:** Updates `profiles` table with all provided fields and sets:
- `onboarding_completed: true`
- `onboarding_step: 'completed'`
- `onboarding_completed_at: NOW()`
- `profile_completed: true`

---

### **6. POST /api/user/complete-onboarding** ✅

**Purpose:** Mark onboarding as complete (called at Welcome Confirmation screen)

**Endpoint:** `POST /api/user/complete-onboarding`

**Authentication:** Required

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed successfully"
}
```

**Database:** Updates `profiles` table:
- `onboarding_completed: true`
- `onboarding_step: 'completed'`
- `onboarding_completed_at: NOW()`

---

### **7. GET /api/user/onboarding-status** ✅

**Purpose:** Check if user needs onboarding and get current status

**Endpoint:** `GET /api/user/onboarding-status`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "needsOnboarding": true,
  "profile": {
    "id": "uuid",
    "username": "johnsmith",
    "display_name": "John Smith",
    "role": "creator",
    "onboarding_user_type": "music_creator",  // NEW
    "onboarding_completed": false,
    "onboarding_step": "quickSetup",
    "profile_completed": false
  },
  "onboarding": {
    "completed": false,
    "step": "quickSetup",  // Defaults to 'welcome' for new users
    "profileCompleted": false
  }
}
```

**Database:** Queries `profiles` table for user's profile

---

## 📊 **DATA FLOW SUMMARY**

### **Onboarding Flow → Database Mapping**

| Screen | Data Collected | Database Table | Field Name |
|--------|---------------|----------------|------------|
| **Welcome** | None (auto-advance) | `profiles` | `onboarding_step: 'welcome'` |
| **User Type Selection** | User type | `profiles` | `onboarding_user_type: 'music_creator'` etc. |
| **Quick Setup** | Display name, username, genres, location | `profiles` | `display_name`, `username`, `genres[]`, `location`, `country` |
| **Value Demo** | None (display only) | N/A | N/A |
| **Tier Selection** | Selected tier | `user_subscriptions` | `tier: 'free'` or `'pro'` |
| **Payment** | Card details, billing period | `user_subscriptions` | `billing_cycle`, `stripe_customer_id`, `stripe_subscription_id`, `money_back_guarantee_end_date` |
| **Welcome Confirmation** | None (completion) | `profiles` | `onboarding_completed: true`, `onboarding_completed_at: NOW()` |

---

## 🔍 **HOW TO QUERY USER DATA**

### **Get User Profile with Onboarding Data:**

```sql
SELECT 
  id,
  username,
  display_name,
  role,
  onboarding_user_type,
  onboarding_completed,
  onboarding_step,
  profile_completed,
  genres,
  country,
  location
FROM profiles
WHERE id = 'user_uuid';
```

### **Get User Subscription:**

```sql
SELECT 
  tier,
  status,
  billing_cycle,
  subscription_start_date,
  subscription_renewal_date,
  money_back_guarantee_end_date,
  stripe_customer_id,
  stripe_subscription_id
FROM user_subscriptions
WHERE user_id = 'user_uuid'
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 1;
```

### **Get User's Selected Genres:**

```sql
SELECT 
  g.id,
  g.name,
  g.category,
  g.description
FROM genres g
WHERE g.id = ANY(
  SELECT unnest(genres) 
  FROM profiles 
  WHERE id = 'user_uuid'
);
```

### **Get Onboarding Analytics:**

```sql
SELECT 
  event_name,
  screen_name,
  properties,
  created_at
FROM onboarding_analytics
WHERE user_id = 'user_uuid'
ORDER BY created_at DESC;
```

---

## 🎯 **TIER LIMITS (Per TIER_CORRECTIONS.md)**

### **Upload Limits:**

| Tier | Upload Limit | Reset Period | Database Check |
|------|--------------|--------------|----------------|
| **Free** | 3 tracks | Never (lifetime) | Counts total uploads in `audio_tracks` table |
| **Pro** | 10 tracks | Monthly (1st of month) | Counts uploads in current month only |
| **Enterprise** | Unlimited | N/A | No limit check |

**Database Functions:**
- `check_upload_count_limit(user_uuid UUID)` - Returns BOOLEAN
- `check_upload_limit(p_user_id UUID)` - Returns JSONB with detailed info

**Example Response from `check_upload_limit`:**
```json
{
  "tier": "pro",
  "limit": 10,
  "used": 5,
  "remaining": 5,
  "is_unlimited": false,
  "period": "monthly",
  "reset_date": "2025-02-01T00:00:00Z"
}
```

---

## ⚠️ **IMPORTANT NOTES**

1. **No Free Trial:** All Pro subscriptions charge immediately. No `trial_period_days` in Stripe.

2. **Money-Back Guarantee:** Tracked in database (`money_back_guarantee_end_date`), not in Stripe. Calculated as `subscription_start_date + 7 days`.

3. **Onboarding User Type vs Role:**
   - `onboarding_user_type`: Categorization for onboarding (music_creator, podcast_creator, etc.)
   - `role`: Permissions field (creator, listener)
   - Mapping: All creator types → `role: 'creator'`, music_lover → `role: 'listener'`

4. **Subscription Data:** Stored in `user_subscriptions` table, NOT in `profiles`. Always JOIN to get subscription info.

5. **Genres:** Stored as array of genre IDs in `profiles.genres` (TEXT[]). Use `genres` table to get genre details.

6. **Username:** Must be unique, lowercase, alphanumeric + underscore only, 3-30 characters.

---

## 🧪 **TESTING**

### **Test Cards (Stripe Test Mode):**

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Insufficient Funds:** `4000 0000 0000 9995`

### **Test Endpoints:**

1. **Username Check:**
   ```bash
   curl -X POST https://your-domain.com/api/onboarding/check-username \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser"}'
   ```

2. **Value Demo:**
   ```bash
   curl -X GET "https://your-domain.com/api/onboarding/value-demo?user_type=music_creator&limit=3" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Pro Upgrade:**
   ```bash
   # Note: paymentMethodId must be created using Stripe SDK first
   curl -X POST https://your-domain.com/api/onboarding/upgrade-pro \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "paymentMethodId": "pm_1ABC123...",
       "period": "monthly"
     }'
   ```
   
   **For Mobile Apps:** See `MOBILE_TEAM_PAYMENT_SECURITY_FIX_UPDATE.md` for complete implementation guide using Stripe React Native SDK.

---

## 📚 **RELATED DOCUMENTS**

- `MOBILE_TEAM_PAYMENT_SECURITY_FIX_UPDATE.md` - **⚠️ CRITICAL:** Payment security fix and migration guide
- `ONBOARDING_NEW_FLOW.md` - Complete onboarding flow specification
- `TIER_CORRECTIONS.md` - Tier structure corrections
- `WEB_TEAM_ONBOARDING_IMPLEMENTATION_COMPLETE.md` - Full implementation details
- `database/onboarding_new_flow_schema.sql` - Database migration file
- `database/fix_upload_limits_tier_corrections.sql` - Upload limits correction

---

## ✅ **CONFIRMATION**

All requested endpoints have been implemented and tested. The new onboarding flow is **fully operational** and **replaces the old flow** for all new users. The system is ready for mobile app integration.

**Status:** ✅ **READY FOR PRODUCTION**

---

**END OF DOCUMENT**
