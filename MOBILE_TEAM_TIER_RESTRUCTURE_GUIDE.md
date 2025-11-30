# Mobile Team - Tier Restructure Implementation Guide

**Date:** December 2024  
**Status:** ✅ **IMPLEMENTATION COMPLETE**  
**For:** Mobile App Team  
**Related:** `TIER_RESTRUCTURE.md`

---

## 📋 Overview

The tier restructure has been fully implemented on the backend. This document provides all the technical details the mobile team needs to integrate with the new tier system, limits, and 7-day money-back guarantee.

**Key Changes:**
- Free tier: 3 lifetime uploads, 5 searches/month, 3 messages/month (outbound)
- Pro tier: 10 total uploads, unlimited searches/messages
- 7-day money-back guarantee (no free trial)
- Limits reset on user's signup anniversary (not calendar month)
- Track visibility management during downgrades

---

## 🗄️ Database Schema Updates

### New Tables

#### 1. `refunds` Table
Tracks refund history for abuse prevention.

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subscription_id UUID REFERENCES user_subscriptions(id),
  stripe_refund_id TEXT,
  amount_refunded DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  refund_reason TEXT,
  refund_date TIMESTAMPTZ,
  refund_count INTEGER, -- Total refunds for this user
  flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
);
```

**Mobile Team Notes:**
- Not directly accessed by mobile app
- Used for abuse prevention (3+ refunds = no guarantee)
- Can query via API if needed for refund history

#### 2. `downgrade_track_selections` Table
Tracks which tracks users selected to keep public during downgrade.

```sql
CREATE TABLE downgrade_track_selections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  downgrade_date TIMESTAMPTZ,
  from_tier VARCHAR(10), -- 'pro'
  to_tier VARCHAR(10), -- 'free'
  selected_track_ids UUID[], -- Array of 3 track IDs
  auto_selected BOOLEAN,
  reason VARCHAR(50) -- 'refund', 'cancellation', etc.
);
```

**Mobile Team Notes:**
- Used during refund/downgrade flow
- Mobile app should show track selection UI when downgrading with >3 tracks

#### 3. `usage_tracking` Table
Tracks monthly usage for searches and messages.

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  usage_type VARCHAR(20), -- 'search' or 'message'
  count INTEGER DEFAULT 0,
  period_start_date TIMESTAMPTZ,
  period_end_date TIMESTAMPTZ,
  last_reset_date TIMESTAMPTZ,
  UNIQUE(user_id, usage_type, period_start_date)
);
```

**Mobile Team Notes:**
- Automatically managed by backend
- Resets on user's signup anniversary (not calendar month)
- Query via API endpoint, don't access directly

### Updated Tables

#### `user_subscriptions` Table - New Fields

```sql
ALTER TABLE user_subscriptions ADD COLUMN:
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_start_date TIMESTAMPTZ, -- For 7-day guarantee calculation
  subscription_renewal_date TIMESTAMPTZ,
  money_back_guarantee_eligible BOOLEAN DEFAULT true,
  refund_count INTEGER DEFAULT 0;
```

**Status Enum Updated:**
- Removed: `'trial'` (no free trials)
- Values: `'active'`, `'cancelled'`, `'expired'`, `'past_due'`

#### `audio_tracks` Table - New Fields

```sql
ALTER TABLE audio_tracks ADD COLUMN:
  visibility VARCHAR(10) DEFAULT 'public', -- 'public', 'private', 'unlisted'
  uploaded_during_tier VARCHAR(10), -- 'free', 'pro', 'enterprise'
  deleted_at TIMESTAMPTZ; -- Soft delete
```

**Mobile Team Notes:**
- `visibility` controls track visibility (use in queries)
- `uploaded_during_tier` used for track restoration on upgrade
- Always filter by `deleted_at IS NULL` in queries

---

## 🔌 API Endpoints

### 1. Get User Subscription Status

**Endpoint:** `GET /api/user/subscription-status`

**Response:**
```json
{
  "success": true,
  "subscription": {
    "tier": "free" | "pro" | "enterprise",
    "status": "active" | "cancelled" | "expired" | "past_due",
    "billing_cycle": "monthly" | "yearly",
    "subscription_start_date": "2024-12-01T00:00:00Z",
    "subscription_renewal_date": "2025-01-01T00:00:00Z",
    "money_back_guarantee_eligible": true,
    "refund_count": 0
  }
}
```

**Mobile Integration:**
- Call this to check user's tier
- Use `tier` to determine feature access
- Check `money_back_guarantee_eligible` for refund eligibility

---

### 2. Get Usage Limits

**Endpoint:** `GET /api/user/usage-limits`

**Response:**
```json
{
  "success": true,
  "data": {
    "tier": "free",
    "uploads": {
      "used": 2,
      "limit": 3,
      "remaining": 1,
      "is_unlimited": false
    },
    "searches": {
      "used": 3,
      "limit": 5,
      "remaining": 2,
      "reset_date": "2024-12-15T00:00:00Z",
      "is_unlimited": false
    },
    "messages": {
      "used": 1,
      "limit": 3,
      "remaining": 2,
      "reset_date": "2024-12-15T00:00:00Z",
      "is_unlimited": false
    }
  }
}
```

**Mobile Integration:**
- Display remaining uploads/searches/messages in UI
- Show upgrade prompt when `remaining === 0`
- Use `reset_date` to show when limits reset
- For Pro users, `is_unlimited: true` means no limits

---

### 3. Upload Track

**Endpoint:** `POST /api/upload`

**Limit Checking:**
- Backend automatically checks upload limit
- Free: 3 lifetime uploads
- Pro: 10 total uploads
- Enterprise: Unlimited

**Error Response (Limit Exceeded):**
```json
{
  "error": "Upload limit exceeded",
  "details": "You have reached your limit of 3 lifetime uploads. Upgrade to Pro for 10 uploads.",
  "limit": {
    "tier": "free",
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "is_unlimited": false
  },
  "upgrade_required": true
}
```

**Status Code:** `429 Too Many Requests`

**Mobile Integration:**
- Check for `upgrade_required: true` in error response
- Show upgrade prompt/modal when limit reached
- Display remaining uploads before upload attempt

---

### 4. Professional Search

**Endpoint:** `GET /api/search?q=query&type=professionals`

**Limit Checking:**
- Backend automatically checks search limit
- Free: 5 searches per month (resets on signup anniversary)
- Pro: Unlimited

**Error Response (Limit Exceeded):**
```json
{
  "success": false,
  "error": "Search limit reached",
  "limit": {
    "used": 5,
    "limit": 5,
    "remaining": 0,
    "reset_date": "2024-12-15T00:00:00Z",
    "upgrade_required": true,
    "message": "You have used all 5 of your monthly professional searches. Upgrade to Pro for unlimited searches."
  }
}
```

**Status Code:** `429 Too Many Requests`

**Mobile Integration:**
- Check for `upgrade_required: true` in error response
- Show upgrade prompt when limit reached
- Display remaining searches in search UI
- Show `reset_date` to indicate when limit resets

**Important:** Search limit resets on user's **signup anniversary**, not calendar month. Example: User signs up Jan 15 → Limits reset on 15th of each month.

---

### 5. Send Message

**Endpoint:** Via `MessagingService.sendMessage()` or direct API call

**Limit Checking:**
- Backend automatically checks message limit
- Free: 3 outbound messages per month (incoming unlimited)
- Pro: Unlimited

**Error Response (Limit Exceeded):**
```json
{
  "data": null,
  "error": {
    "code": "MESSAGE_LIMIT_REACHED",
    "message": "You have used all 3 of your monthly direct messages. Upgrade to Pro for unlimited messaging.",
    "limit": {
      "used": 3,
      "limit": 3,
      "remaining": 0,
      "reset_date": "2024-12-15T00:00:00Z",
      "upgrade_required": true
    }
  }
}
```

**Mobile Integration:**
- Check for `error.code === "MESSAGE_LIMIT_REACHED"`
- Show upgrade prompt when limit reached
- Display remaining messages in messaging UI
- **Note:** Only outbound messages count toward limit (incoming messages are unlimited)

---

### 6. Upgrade to Pro

**Endpoint:** `POST /api/stripe/create-checkout-session`

**Request:**
```json
{
  "plan": "pro",
  "billingCycle": "monthly" | "yearly"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxxxx",
  "url": "https://checkout.stripe.com/..."
}
```

**Mobile Integration:**
- Redirect user to Stripe checkout URL
- Handle success/cancel callbacks
- On success, subscription is automatically created via webhook

**Pricing:**
- Monthly: £9.99/month
- Annual: £99/year (saves £20.88, 17% discount)

---

### 7. Cancel Subscription / Request Refund

**Endpoint:** `POST /api/subscription/cancel`

**Request:**
```json
{
  "requestRefund": true, // If within 7-day window
  "selectedTrackIds": ["uuid1", "uuid2", "uuid3"] // If user has >3 tracks
}
```

**Response (Requires Track Selection):**
```json
{
  "success": false,
  "requiresTrackSelection": true,
  "tracks": [
    { "id": "uuid1", "title": "Track 1" },
    { "id": "uuid2", "title": "Track 2" },
    // ... up to 10 tracks
  ],
  "message": "You have 8 tracks. Please select 3 tracks to keep public when downgrading to Free tier."
}
```

**Response (Refund Processing):**
```json
{
  "success": true,
  "refundRequested": true,
  "message": "Refund request received. Processing refund and downgrading account...",
  "nextStep": "process_refund"
}
```

**Mobile Integration:**
1. Check if user is within 7-day window (use `/api/subscription/status`)
2. If yes, show refund option
3. If user has >3 tracks, show track selection UI
4. Call `/api/subscription/refund` with selected tracks
5. Handle refund confirmation

---

### 8. Process Refund

**Endpoint:** `POST /api/subscription/refund`

**Request:**
```json
{
  "selectedTrackIds": ["uuid1", "uuid2", "uuid3"] // Required if user has >3 tracks
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refund": {
      "id": "uuid",
      "amount": 9.99,
      "currency": "GBP",
      "stripe_refund_id": "re_xxxxx",
      "processed_at": "2024-12-01T12:00:00Z"
    },
    "subscription": {
      "tier": "free",
      "status": "cancelled"
    },
    "tracks": {
      "public": 3,
      "private": 5
    },
    "message": "Refund of £9.99 processed successfully. Your account has been downgraded to Free tier.",
    "refundCount": 1,
    "moneyBackGuaranteeEligible": true
  }
}
```

**Error Response (Outside 7-Day Window):**
```json
{
  "error": "Refund window has expired. Refunds are only available within 7 days of subscription start.",
  "daysSinceStart": 8
}
```

**Error Response (3+ Refunds):**
```json
{
  "error": "Money-back guarantee is no longer available for this account due to multiple refund requests."
}
```

**Mobile Integration:**
- Show track selection UI if user has >3 tracks
- Validate exactly 3 tracks selected
- Show confirmation before processing
- Display refund amount and processing time (3-5 business days)

---

### 9. Get Subscription Status (Detailed)

**Endpoint:** `GET /api/subscription/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "tier": "pro",
      "status": "active",
      "billing_cycle": "monthly",
      "subscription_start_date": "2024-12-01T00:00:00Z",
      "subscription_renewal_date": "2025-01-01T00:00:00Z",
      "money_back_guarantee_eligible": true,
      "refund_count": 0
    },
    "limits": {
      "uploads": { "used": 5, "limit": 10, "remaining": 5, "is_unlimited": false },
      "searches": { "used": 0, "limit": -1, "remaining": -1, "is_unlimited": true },
      "messages": { "used": 0, "limit": -1, "remaining": -1, "is_unlimited": true }
    },
    "moneyBackGuarantee": {
      "eligible": true,
      "withinWindow": true,
      "daysRemaining": 3
    },
    "features": {
      "unlimitedUploads": false,
      "unlimitedSearches": true,
      "unlimitedMessages": true,
      "advancedAnalytics": true,
      "customBranding": true,
      "prioritySupport": true
    }
  }
}
```

**Mobile Integration:**
- Use `moneyBackGuarantee.withinWindow` to show refund option
- Display `daysRemaining` countdown in UI
- Use `limits` to show usage indicators
- Use `features` to enable/disable features in app

---

## 📊 Limit Details

### Upload Limits

| Tier | Limit | Type | Reset |
|------|-------|------|-------|
| Free | 3 | Lifetime | Never |
| Pro | 10 | Total | Never |
| Enterprise | Unlimited | - | - |

**Important:**
- Free tier: 3 **lifetime** uploads (not monthly)
- Pro tier: 10 **total** uploads (not monthly)
- Count includes all tracks (excluding soft-deleted)

### Search Limits

| Tier | Limit | Type | Reset |
|------|-------|------|-------|
| Free | 5 | Per month | Signup anniversary |
| Pro | Unlimited | - | - |
| Enterprise | Unlimited | - | - |

**Important:**
- Resets on user's **signup anniversary** (not calendar month)
- Example: User signs up Jan 15 → Resets on 15th of each month
- Only professional searches count (not general content search)

### Message Limits

| Tier | Limit | Type | Reset | Notes |
|------|-------|------|-------|-------|
| Free | 3 | Per month (outbound) | Signup anniversary | Incoming unlimited |
| Pro | Unlimited | - | - | - |
| Enterprise | Unlimited | - | - | - |

**Important:**
- Only **outbound** messages count toward limit
- **Incoming** messages are always unlimited
- Resets on user's **signup anniversary**

### Storage Limits

| Tier | Limit |
|------|-------|
| Free | 150MB |
| Pro | 500MB |
| Enterprise | 2GB |

---

## 🔄 Track Visibility Management

### Visibility States

- `public` - Visible to everyone, appears in search/profile
- `private` - Only visible to creator, hidden from public
- `unlisted` - Accessible via direct link only (future feature)

### Downgrade Flow

**When user downgrades from Pro to Free:**

1. If user has ≤3 tracks: All remain public
2. If user has >3 tracks:
   - User selects 3 tracks to keep public
   - Remaining tracks → `visibility: 'private'`
   - Tracks are **never deleted** (only hidden)

**When user re-upgrades to Pro:**

- All previously private tracks automatically restore to `public`
- Triggered automatically via database trigger

**Mobile Integration:**
- Show track selection UI during downgrade/refund
- Display private tracks in user's library with "Upgrade to make public" prompt
- Don't show private tracks in public profiles/search

---

## 💰 7-Day Money-Back Guarantee

### Eligibility

- Available for **all Pro upgrades** (monthly and annual)
- Only within **7 days** of subscription start date
- Disabled after **3 refunds** (abuse prevention)

### Refund Process

1. User cancels subscription within 7 days
2. If user has >3 tracks → Show track selection UI
3. User selects 3 tracks to keep public
4. Refund processed via Stripe (3-5 business days)
5. Account downgraded to Free tier
6. Non-selected tracks set to private

### Abuse Prevention

- Tracks refund count per user
- After 2 refunds: Manual review
- After 3 refunds: Money-back guarantee disabled
- Tracks payment method and IP for pattern detection

**Mobile Integration:**
- Check `money_back_guarantee_eligible` from subscription status
- Check `moneyBackGuarantee.withinWindow` to show refund option
- Display countdown: "X days remaining for refund"
- Show track selection UI if needed

---

## 🚨 Error Handling

### Common Error Responses

**Limit Exceeded (429):**
```json
{
  "error": "Upload limit exceeded" | "Search limit reached" | "Message limit reached",
  "details": "User-friendly message",
  "limit": {
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "is_unlimited": false,
    "reset_date": "2024-12-15T00:00:00Z" // For searches/messages
  },
  "upgrade_required": true
}
```

**Refund Window Expired (400):**
```json
{
  "error": "Refund window has expired. Refunds are only available within 7 days of subscription start.",
  "daysSinceStart": 8
}
```

**Refund Not Eligible (403):**
```json
{
  "error": "Money-back guarantee is no longer available for this account due to multiple refund requests."
}
```

**Track Selection Required (200):**
```json
{
  "success": false,
  "requiresTrackSelection": true,
  "tracks": [...],
  "message": "Please select 3 tracks to keep public"
}
```

### Mobile Error Handling

1. **Check status code:**
   - `429` = Limit exceeded → Show upgrade prompt
   - `400` = Bad request → Show error message
   - `403` = Not eligible → Show explanation

2. **Check `upgrade_required` flag:**
   - If `true`, show upgrade modal/prompt

3. **Check `requiresTrackSelection` flag:**
   - If `true`, show track selection UI

---

## 📱 Mobile UI Recommendations

### 1. Usage Indicators

**Show in:**
- Upload screen: "2 of 3 uploads remaining"
- Search screen: "3 of 5 searches remaining this month"
- Messaging screen: "1 of 3 messages remaining this month"

**When limit reached:**
- Show upgrade prompt/modal
- Disable action button
- Show "Upgrade to Pro" CTA

### 2. Upgrade Prompts

**Show when:**
- User hits upload limit
- User hits search limit
- User hits message limit
- User tries to use Pro-only feature

**Content:**
- Explain what limit was hit
- Show Pro benefits
- Link to upgrade flow
- Mention 7-day money-back guarantee

### 3. Subscription Status Display

**Show:**
- Current tier badge
- Next billing date (for Pro users)
- Money-back guarantee countdown (if within 7 days)
- Usage statistics

### 4. Refund Flow UI

**Steps:**
1. Check if within 7-day window
2. Show refund option in cancel flow
3. If >3 tracks: Show track selection screen
4. Confirm refund request
5. Show processing message
6. Show confirmation with refund amount

### 5. Track Selection UI

**When needed:**
- User downgrading with >3 tracks
- User requesting refund with >3 tracks

**Requirements:**
- Show all user's tracks
- Allow selecting exactly 3 tracks
- Show which tracks will be private
- Confirm selection before processing

---

## 🔐 Authentication

All endpoints use **Bearer token authentication** (same as existing mobile app).

**Header:**
```
Authorization: Bearer <supabase_access_token>
```

**Alternative headers (supported):**
```
x-authorization: Bearer <token>
x-auth-token: <token>
x-supabase-token: <token>
```

---

## 📅 Reset Logic Details

### Signup Anniversary Reset

**How it works:**
- User signs up on Jan 15, 2024
- Search/message limits reset on **15th of each month**
- Not calendar month (1st of month)

**Example:**
- User signs up: Jan 15
- Current date: Jan 20
- Next reset: Feb 15 (not Feb 1)

**Mobile Integration:**
- Use `reset_date` from API response
- Display: "Resets on [date]" in UI
- Don't assume calendar month reset

---

## 🧪 Testing Checklist

### Upload Limits
- [ ] Free user uploads 3 tracks → Success
- [ ] Free user tries 4th upload → Blocked with upgrade prompt
- [ ] Pro user uploads 10 tracks → Success
- [ ] Pro user tries 11th upload → Blocked

### Search Limits
- [ ] Free user performs 5 searches → Success
- [ ] Free user tries 6th search → Blocked with upgrade prompt
- [ ] Pro user has unlimited searches → Success
- [ ] Limits reset on signup anniversary (not calendar month)

### Message Limits
- [ ] Free user sends 3 messages → Success
- [ ] Free user tries 4th message → Blocked with upgrade prompt
- [ ] Free user receives messages (unlimited) → Success
- [ ] Pro user has unlimited messages → Success

### Refund Flow
- [ ] User upgrades to Pro → Success
- [ ] User requests refund within 7 days → Success
- [ ] User with >3 tracks selects tracks → Success
- [ ] Refund processed → Account downgraded
- [ ] Tracks beyond limit set to private → Success

### Track Restoration
- [ ] User downgrades (tracks hidden) → Success
- [ ] User re-upgrades → Tracks restored → Success

---

## 🔄 Migration Notes

### Breaking Changes

1. **Upload Limits:**
   - **Before:** Free = 3/month, Pro = 10/month
   - **After:** Free = 3 lifetime, Pro = 10 total
   - **Action:** Update mobile app to reflect lifetime/total limits

2. **Reset Logic:**
   - **Before:** Calendar month reset
   - **After:** Signup anniversary reset
   - **Action:** Use `reset_date` from API, don't assume calendar month

3. **Trial System:**
   - **Before:** 7-day free trial
   - **After:** No trial, 7-day money-back guarantee
   - **Action:** Remove trial references, add guarantee messaging

### Backward Compatibility

- All existing API endpoints still work
- New fields are optional/nullable
- Existing subscriptions remain valid
- No breaking changes to authentication

---

## 📞 Support & Questions

**For technical questions:**
- Refer to `TIER_RESTRUCTURE.md` for business requirements
- Refer to `TIER_RESTRUCTURE_IMPLEMENTATION_COMPLETE.md` for implementation details
- Check API endpoint responses for error details

**Common Issues:**
- Limits not resetting → Check signup anniversary date
- Refund not processing → Verify within 7-day window
- Tracks not restoring → Check `uploaded_during_tier` field

---

## ✅ Integration Checklist

- [ ] Update subscription status API calls
- [ ] Add usage limits display in UI
- [ ] Handle limit exceeded errors (429)
- [ ] Show upgrade prompts at limit points
- [ ] Implement refund flow UI
- [ ] Implement track selection UI (for downgrades)
- [ ] Update pricing display (GBP, not USD)
- [ ] Remove free trial references
- [ ] Add 7-day money-back guarantee messaging
- [ ] Test all limit scenarios
- [ ] Test refund flow
- [ ] Test track visibility changes

---

**All backend infrastructure is ready. Mobile app can now integrate using the documented API endpoints and error responses.**
