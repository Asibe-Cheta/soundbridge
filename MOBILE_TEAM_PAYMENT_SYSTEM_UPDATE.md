# 📱 Mobile Team: Payment System Update Guide

**Date:** December 3, 2025  
**Priority:** 🚨 **IMPORTANT UPDATE**  
**Status:** Ready for Review  
**Target:** Mobile App Development Team

---

## 🎯 **Overview**

The web team has completed a major update to the payment/subscription system. This document outlines the changes, new endpoints, database tables, and what the mobile team needs to update to maintain consistency across platforms.

**Key Point:** Mobile uses **IAP (In-App Purchases)** for subscriptions and **Stripe** for tips. This update ensures consistency of experience for users across web and mobile platforms.

---

## 📊 **What Changed**

### **1. Subscription Tier System**
- **Removed:** Enterprise tier (no longer available)
- **Current Tiers:** Free and Pro only
- **Pricing:** Pro = £9.99/month or £99/year

### **2. Upload Limits**
- **Free:** 3 lifetime uploads (does NOT reset)
- **Pro:** 10 uploads per month (resets on 1st of each month)
- **Important:** Pro does NOT have unlimited uploads

### **3. Database Tables**

#### **`user_subscriptions` Table**
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- tier (TEXT: 'free' | 'pro')
- status (TEXT: 'active' | 'cancelled' | 'expired' | 'past_due')
- billing_cycle (TEXT: 'monthly' | 'yearly')
- stripe_customer_id (TEXT, nullable)
- stripe_subscription_id (TEXT, nullable)
- subscription_start_date (TIMESTAMPTZ)
- subscription_renewal_date (TIMESTAMPTZ)
- subscription_ends_at (TIMESTAMPTZ)
- money_back_guarantee_end_date (TIMESTAMPTZ)
- money_back_guarantee_eligible (BOOLEAN)
- refund_count (INTEGER)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Key Changes:**
- `tier` now only accepts 'free' or 'pro' (Enterprise removed)
- Added `money_back_guarantee_eligible` and `money_back_guarantee_end_date`
- Added `refund_count` for tracking refunds

#### **`user_usage` Table** (For Analytics)
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- music_uploads (INTEGER)
- podcast_uploads (INTEGER)
- event_uploads (INTEGER)
- total_storage_used (BIGINT)
- total_plays (BIGINT)
- total_followers (INTEGER)
- last_upload_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Note:** Usage statistics are now calculated from actual tables (`audio_tracks`, `follows`) for accuracy, not just from `user_usage` table.

---

## 🔌 **API Endpoints**

### **1. Get Subscription Status**
```
GET /api/subscription/status
```

**Headers:**
```
Authorization: Bearer {token}
// OR fallback headers:
X-Auth-Token: Bearer {token}
X-Authorization: Bearer {token}
X-Supabase-Token: {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "tier": "pro",
      "status": "active",
      "billing_cycle": "monthly",
      "subscription_start_date": "2025-12-03T00:00:00Z",
      "subscription_renewal_date": "2026-01-03T00:00:00Z",
      "subscription_ends_at": "2026-01-03T00:00:00Z",
      "money_back_guarantee_eligible": true,
      "refund_count": 0
    },
    "usage": {
      "music_uploads": 6,
      "podcast_uploads": 0,
      "event_uploads": 0,
      "total_storage_used": 52428800,
      "total_plays": 97,
      "total_followers": 0,
      "last_upload_at": "2025-12-01T10:30:00Z",
      "formatted_storage": "50 MB",
      "formatted_plays": "97",
      "formatted_followers": "0"
    },
    "limits": {
      "uploads": {
        "used": 6,
        "limit": 10,
        "remaining": 4,
        "is_unlimited": false,
        "period": "monthly"
      },
      "searches": {
        "used": 2,
        "limit": -1,
        "remaining": -1,
        "is_unlimited": true
      },
      "messages": {
        "used": 1,
        "limit": -1,
        "remaining": -1,
        "is_unlimited": true
      }
    },
    "moneyBackGuarantee": {
      "eligible": true,
      "withinWindow": true,
      "daysRemaining": 5
    },
    "features": {
      "unlimitedUploads": false,
      "unlimitedSearches": true,
      "unlimitedMessages": true,
      "advancedAnalytics": true,
      "customBranding": true,
      "prioritySupport": true,
      "revenueSharing": true,
      "whiteLabel": false
    }
  }
}
```

**Key Changes:**
- `features.unlimitedUploads` is now `false` for Pro (was incorrectly `true`)
- Usage statistics are calculated from actual tables (not just `user_usage`)
- Added `moneyBackGuarantee` information

---

### **2. Create Checkout Session (Web Only - Stripe)**
```
POST /api/stripe/create-checkout-session
```

**Note:** Mobile uses IAP, not this endpoint. This is for web Stripe payments only.

---

### **3. Verify IAP Receipt (Mobile)**
```
POST /api/subscriptions/verify-iap
```

**Request Body (Apple):**
```json
{
  "platform": "apple",
  "receiptData": "base64_encoded_receipt",
  "productId": "com.soundbridge.pro.monthly",
  "transactionId": "apple_transaction_id"
}
```

**Request Body (Google):**
```json
{
  "platform": "google",
  "packageName": "com.soundbridge.app",
  "productId": "soundbridge_pro_monthly",
  "purchaseToken": "google_purchase_token",
  "transactionId": "google_order_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription verified and updated",
  "subscription": {
    "id": "uuid",
    "user_id": "uuid",
    "tier": "pro",
    "status": "active",
    "billing_cycle": "monthly",
    "subscription_platform": "apple",
    "subscription_ends_at": "2026-01-03T00:00:00Z"
  }
}
```

**Important:** This endpoint now creates/updates subscriptions in the `user_subscriptions` table with the same structure as web Stripe subscriptions.

---

### **4. Get Usage Statistics**
```
GET /api/user/usage-statistics
```

**Response:**
```json
{
  "usage": {
    "uploads": {
      "used": 6,
      "limit": 10,
      "remaining": 4,
      "is_unlimited": false
    },
    "storage": {
      "used": 52428800,
      "limit": 2147483648,
      "unit": "bytes"
    },
    "bandwidth": {
      "used": 0,
      "limit": 1048576000,
      "unit": "bytes"
    }
  }
}
```

**Key Change:** Usage is now calculated from actual tables (`audio_tracks`, `follows`) for accuracy.

---

## 🔄 **What Mobile Team Needs to Update**

### **1. Remove Enterprise Tier References**

**Search for and remove:**
- Any UI text mentioning "Enterprise"
- Any code checking for `tier === 'enterprise'`
- Any pricing displays showing Enterprise plans
- Any feature lists mentioning Enterprise-only features

**Example Fix:**
```typescript
// ❌ OLD
if (userTier === 'enterprise') {
  // Enterprise features
}

// ✅ NEW
// Enterprise tier removed - only Free and Pro now
if (userTier === 'pro') {
  // Pro features (same as what Enterprise had)
}
```

---

### **2. Update Upload Limits Display**

**Change:**
- ❌ "Unlimited Uploads" for Pro users
- ✅ "10 Uploads Per Month" for Pro users
- ✅ "3 Lifetime Uploads" for Free users

**Example:**
```typescript
// ❌ OLD
const uploadLimitText = userTier === 'pro' 
  ? 'Unlimited Uploads' 
  : '3 Lifetime Uploads';

// ✅ NEW
const uploadLimitText = userTier === 'pro' 
  ? '10 Uploads Per Month' 
  : '3 Lifetime Uploads';

const uploadLimitDescription = userTier === 'pro'
  ? 'Limit resets on the 1st of each month'
  : 'Total lifetime limit (does not reset)';
```

---

### **3. Update Feature Flags**

**Check `features` object from `/api/subscription/status`:**
```typescript
// ✅ CORRECT Feature Flags
{
  unlimitedUploads: false,      // Pro does NOT have unlimited
  unlimitedSearches: true,      // Pro has unlimited searches
  unlimitedMessages: true,      // Pro has unlimited messages
  advancedAnalytics: true,
  customBranding: true,
  prioritySupport: true,
  revenueSharing: true,
  whiteLabel: false             // No white label feature
}
```

---

### **4. Update Usage Statistics Display**

**Important:** Usage statistics should show **actual data from user's history**, not reset when they upgrade.

**Example:**
```typescript
// Usage should be cumulative (extension of free tier usage)
const usage = {
  music_uploads: 6,        // All tracks ever uploaded
  total_plays: 97,         // All plays across all tracks
  total_followers: 0,      // All followers
  // ... not reset to 0 when upgrading
};
```

**Display:**
- Show actual counts (e.g., "6 Tracks", "97 Plays")
- Don't show "0" for users who had activity before upgrading
- Usage is an extension of free tier, not a fresh slate

---

### **5. Update IAP Product IDs (If Needed)**

**Current Product IDs:**
- Apple: `com.soundbridge.pro.monthly`, `com.soundbridge.pro.yearly`
- Google: `soundbridge_pro_monthly`, `soundbridge_pro_yearly`

**Verify these match your App Store/Play Store configurations.**

---

### **6. Update Subscription Status Polling**

**After IAP purchase:**
1. Call `/api/subscriptions/verify-iap` to verify receipt
2. Poll `/api/subscription/status` every 2 seconds (max 15 attempts = 30 seconds)
3. Show "Activating Pro..." message while polling
4. When `subscription.tier === 'pro'`, update UI immediately
5. If timeout, show manual refresh button

**Example:**
```typescript
const pollSubscriptionStatus = async (maxAttempts = 15) => {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch('/api/subscription/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (data.data?.subscription?.tier === 'pro') {
      // Success! Update UI
      updateUserSubscription(data.data.subscription);
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  }
  
  // Timeout - show manual refresh
  showTimeoutMessage();
};
```

---

## 🗄️ **Database Schema Changes**

### **New/Updated Columns in `user_subscriptions`:**
- `money_back_guarantee_eligible` (BOOLEAN)
- `money_back_guarantee_end_date` (TIMESTAMPTZ)
- `refund_count` (INTEGER)

### **Removed:**
- Enterprise tier references (if any existed)

---

## ✅ **Testing Checklist**

### **For Mobile Team:**
- [ ] Remove all Enterprise tier references from UI
- [ ] Update upload limits display (10/month for Pro, not unlimited)
- [ ] Verify IAP verification works with new subscription structure
- [ ] Test subscription status polling after IAP purchase
- [ ] Verify usage statistics show actual data (not zeros)
- [ ] Test upgrade flow: Free → Pro via IAP
- [ ] Test subscription status endpoint returns correct data
- [ ] Verify feature flags are correct (`unlimitedUploads: false` for Pro)

---

## 🔗 **Related Documentation**

- `MOBILE_IAP_INTEGRATION_GUIDE.md` - IAP setup and integration
- `MOBILE_TEAM_SUBSCRIPTION_TIERS_RESPONSE.md` - Tier structure details
- `TIER_CORRECTIONS.md` - Tier system corrections and limits

---

## 📞 **Support**

If you encounter any issues or need clarification:
1. Check the API responses match the expected structure
2. Verify database schema matches this document
3. Test with a Pro subscription user account
4. Contact web team for any discrepancies

---

## 🎯 **Summary**

**Key Changes:**
1. ✅ Enterprise tier removed - only Free and Pro
2. ✅ Pro = 10 uploads/month (not unlimited)
3. ✅ Usage statistics calculated from actual tables
4. ✅ Money-back guarantee fields added
5. ✅ Feature flags updated (`unlimitedUploads: false`)

**Mobile Team Actions:**
1. Remove Enterprise references
2. Update upload limits display
3. Verify IAP integration works with new structure
4. Test subscription status polling
5. Ensure usage statistics show actual data

**Consistency Goal:** Users should have the same experience whether they upgrade via web (Stripe) or mobile (IAP). Both create subscriptions in the same `user_subscriptions` table with the same structure.

---

**Last Updated:** December 3, 2025  
**Status:** ✅ Ready for Mobile Team Review
