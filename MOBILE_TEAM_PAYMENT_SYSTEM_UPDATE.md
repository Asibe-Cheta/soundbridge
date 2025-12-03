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
// Always use optional chaining when accessing subscription data
const subscription = data?.data?.subscription;
const features = data?.data?.features;

if (features) {
  // ✅ CORRECT Feature Flags
  {
    unlimitedUploads: false,      // Pro does NOT have unlimited
    unlimitedSearches: features.unlimitedSearches || false,
    unlimitedMessages: features.unlimitedMessages || false,
    advancedAnalytics: features.advancedAnalytics || false,
    customBranding: features.customBranding || false,
    prioritySupport: features.prioritySupport || false,
    revenueSharing: features.revenueSharing || false,
    whiteLabel: false             // No white label feature
  }
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
    
    // ✅ IMPORTANT: Use optional chaining to safely access subscription data
    // Subscription might be null for free users or during loading
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

**⚠️ Important: Defensive Coding Pattern**
Always use optional chaining when accessing subscription data:
- ✅ `data?.subscription?.tier` (safe)
- ❌ `data.subscription.tier` (will crash if subscription is null/undefined)

**Why:** The API may return `subscription: null` for free users, or subscription data may not be loaded yet. Always check for existence before accessing properties.

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

---

## 📧 **Email Notifications System**

The platform uses **SendGrid** to send automated email notifications for subscription events. All emails are sent automatically when subscription status changes occur.

### **Email Types**

#### **1. Subscription Confirmation Email**
**Triggered:** When user successfully subscribes/upgrades to Pro (monthly or yearly)

**Template ID Environment Variable:** `SENDGRID_SUBSCRIPTION_CONFIRMATION_TEMPLATE_ID`

**Sent From:** `checkout.session.completed` webhook event

**Email Contents:**
- Welcome message
- Plan name (Pro Monthly/Yearly)
- Amount paid
- Subscription start date
- Next billing date
- 7-day money-back guarantee reminder
- Dashboard link

**Example Data:**
```json
{
  "user_name": "John Doe",
  "plan_name": "Pro (Monthly)",
  "billing_cycle": "Monthly",
  "amount": "£9.99",
  "currency": "GBP",
  "subscription_start_date": "December 3, 2025",
  "next_billing_date": "January 3, 2026",
  "invoice_url": "https://dashboard.stripe.com/invoices/...",
  "dashboard_url": "https://soundbridge.live/dashboard",
  "money_back_guarantee_text": "7-day money-back guarantee"
}
```

---

#### **2. Payment Receipt Email**
**Triggered:** When subscription payment is successfully processed (monthly/annual renewal)

**Template ID Environment Variable:** `SENDGRID_PAYMENT_RECEIPT_TEMPLATE_ID`

**Sent From:** `invoice.payment_succeeded` webhook event

**Email Contents:**
- Payment confirmation
- Amount paid
- Payment date
- Invoice number
- Invoice link (PDF)
- Next billing date
- Dashboard link

**Example Data:**
```json
{
  "user_name": "John Doe",
  "amount": "£9.99",
  "currency": "GBP",
  "billing_cycle": "Monthly",
  "payment_date": "December 3, 2025, 14:30",
  "invoice_number": "inv_xxx",
  "invoice_url": "https://dashboard.stripe.com/invoices/...",
  "next_billing_date": "January 3, 2026"
}
```

---

#### **3. Payment Failed Email**
**Triggered:** When subscription payment is declined or fails

**Template ID Environment Variable:** `SENDGRID_PAYMENT_FAILED_TEMPLATE_ID`

**Sent From:** `invoice.payment_failed` webhook event

**Email Contents:**
- Payment failure notification
- Amount attempted
- Grace period information (7 days)
- Grace period end date
- Link to update payment method
- Warning that account will downgrade if payment not updated

**Example Data:**
```json
{
  "user_name": "John Doe",
  "amount": "£9.99",
  "currency": "GBP",
  "billing_cycle": "Monthly",
  "payment_date": "December 3, 2025",
  "grace_period_days": 7,
  "grace_period_end_date": "December 10, 2025",
  "update_payment_url": "https://soundbridge.live/dashboard?tab=billing&action=update-payment"
}
```

**Important:** Account status changes to `past_due` when payment fails. User has 7 days (grace period) to update payment method before account is downgraded to Free tier.

---

#### **4. Account Downgraded Email**
**Triggered:** When account is downgraded from Pro to Free tier

**Template ID Environment Variable:** `SENDGRID_ACCOUNT_DOWNGRADED_TEMPLATE_ID`

**Sent From:**
- `customer.subscription.deleted` webhook event (cancellation)
- Cron job `/api/cron/downgrade-past-due` (after grace period expires)

**Email Contents:**
- Downgrade notification
- Reason for downgrade (payment failed, cancelled, expired)
- Date of downgrade
- Information about losing Pro features
- Link to reactivate subscription
- Dashboard link

**Example Data:**
```json
{
  "user_name": "John Doe",
  "downgrade_reason": "Your payment could not be processed and the grace period has ended.",
  "downgrade_date": "December 10, 2025",
  "reactivate_url": "https://soundbridge.live/pricing"
}
```

**Downgrade Reasons:**
- `payment_failed` - Payment could not be processed (grace period expired)
- `cancelled` - User cancelled subscription
- `expired` - Subscription expired

---

### **Email Service Implementation**

**Service Location:** `apps/web/src/services/SubscriptionEmailService.ts`

**Methods:**
- `sendSubscriptionConfirmation(data)` - Subscription confirmation
- `sendPaymentReceipt(data)` - Payment receipt
- `sendPaymentFailed(data)` - Payment failed notification
- `sendAccountDowngraded(data)` - Account downgrade notification
- `getUserInfo(userId)` - Helper to get user email and name

**Integration Points:**
- `apps/web/app/api/stripe/webhook/route.ts` - Webhook handlers
- `apps/web/app/api/cron/downgrade-past-due/route.ts` - Grace period cron job

---

### **Grace Period & Downgrade Process**

**Process:**
1. Payment fails → Status set to `past_due`
2. Payment failed email sent immediately
3. 7-day grace period begins
4. User can update payment method during grace period
5. If payment updated → Status returns to `active`
6. If grace period expires → Cron job downgrades account to Free tier
7. Downgrade email sent to user

**Cron Job:**
- **Endpoint:** `GET /api/cron/downgrade-past-due?secret={CRON_SECRET}`
- **Frequency:** Should run daily (recommended: once per day)
- **Function:** Finds all `past_due` subscriptions older than 7 days and downgrades them

**Setup:**
- Add `CRON_SECRET` environment variable
- Configure Vercel Cron or external cron service to call endpoint daily
- Example Vercel Cron config in `vercel.json`:
  ```json
  {
    "crons": [{
      "path": "/api/cron/downgrade-past-due?secret=YOUR_SECRET",
      "schedule": "0 0 * * *"
    }]
  }
  ```

---

### **Environment Variables Required**

**SendGrid Configuration:**
```
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=contact@soundbridge.live
SENDGRID_FROM_NAME=SoundBridge Team

# Template IDs (set these after creating templates in SendGrid)
SENDGRID_SUBSCRIPTION_CONFIRMATION_TEMPLATE_ID=d-xxxxx
SENDGRID_PAYMENT_RECEIPT_TEMPLATE_ID=d-xxxxx
SENDGRID_PAYMENT_FAILED_TEMPLATE_ID=d-xxxxx
SENDGRID_ACCOUNT_DOWNGRADED_TEMPLATE_ID=d-xxxxx
```

**Cron Job Configuration:**
```
CRON_SECRET=your_secure_random_string
```

**App URLs:**
```
NEXT_PUBLIC_APP_URL=https://soundbridge.live
```

---

### **Pro Feature Access Controls**

**Important:** Pro features are ONLY accessible when subscription status is `'active'`. If status is `'cancelled'`, `'expired'`, or `'past_due'`, user loses Pro privileges immediately.

**Feature Gating:**
- ✅ Upload limits enforced based on tier AND status
- ✅ Search limits enforced based on tier AND status
- ✅ Message limits enforced based on tier AND status
- ✅ Advanced Analytics only for active Pro users
- ✅ Custom Branding only for active Pro users
- ✅ Revenue Sharing only for active Pro users

**Access Check Pattern:**
```typescript
// ✅ CORRECT: Check both tier AND status
const { data: subscription } = await supabase
  .from('user_subscriptions')
  .select('tier, status')
  .eq('user_id', userId)
  .eq('status', 'active')  // ← CRITICAL: Only 'active' status has Pro features
  .single();

const hasProAccess = subscription?.tier === 'pro' && subscription?.status === 'active';
```

**When Downgraded:**
- Account tier → `'free'`
- Account status → `'expired'` or `'cancelled'`
- Pro features immediately unavailable
- Upload limits revert to Free tier (3 lifetime)
- Search/message limits revert to Free tier limits
- User must resubscribe to regain Pro access

---

### **Mobile Team Actions for Email Notifications**

**Note:** Mobile app uses IAP (In-App Purchases) for subscriptions. Email notifications will still be sent when:
1. Web team processes IAP verification via `/api/subscriptions/verify-iap`
2. Subscription status is updated in the database

**Recommended:**
- Display in-app notifications for subscription events (in addition to emails)
- Show payment status in app settings/billing section
- Notify users when payment fails (before grace period expires)
- Show grace period countdown in app

**No Action Required For:**
- Setting up SendGrid templates (web team handles this)
- Email delivery (handled automatically by web backend)

---

## 🎯 **Summary**

**Key Changes:**
1. ✅ Enterprise tier removed - only Free and Pro
2. ✅ Pro = 10 uploads/month (not unlimited)
3. ✅ Usage statistics calculated from actual tables
4. ✅ Money-back guarantee fields added
5. ✅ Feature flags updated (`unlimitedUploads: false`)
6. ✅ **Email notifications for all subscription events**
7. ✅ **Grace period handling (7 days) before downgrade**
8. ✅ **Pro features gated by subscription status = 'active'**

**Mobile Team Actions:**
1. Remove Enterprise references
2. Update upload limits display
3. Verify IAP integration works with new structure
4. Test subscription status polling
5. Ensure usage statistics show actual data
6. **Display in-app notifications for subscription events**
7. **Show payment status and grace period countdown**

**Consistency Goal:** Users should have the same experience whether they upgrade via web (Stripe) or mobile (IAP). Both create subscriptions in the same `user_subscriptions` table with the same structure. Email notifications will be sent regardless of upgrade method.

---

**Last Updated:** December 3, 2025  
**Status:** ✅ Ready for Mobile Team Review
