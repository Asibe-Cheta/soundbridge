# Onboarding API Endpoints Request - Mobile Team

**Date:** December 2025  
**From:** Mobile App Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH** - Required for New Onboarding Flow  
**Status:** ⏳ **PENDING IMPLEMENTATION**

---

## 📋 **OVERVIEW**

The mobile app has been updated with a new onboarding flow (per `ONBOARDING_NEW_FLOW.md`). This document outlines the API endpoints needed to support this flow.

**Key Changes:**
- ✅ No 7-day free trial (removed per `TIER_CORRECTIONS.md`)
- ✅ 7-day money-back guarantee instead
- ✅ Immediate payment required for Pro upgrades
- ✅ Updated flow: welcome → userType → quickSetup → valueDemo → tierSelection → payment (if Pro) → welcomeConfirmation

---

## 🗄️ **DATABASE SCHEMA REQUIREMENTS**

### **Profiles Table Fields Needed:**

The mobile app expects these fields to exist in the `profiles` table:

```sql
-- Onboarding tracking
onboarding_completed BOOLEAN DEFAULT FALSE
onboarding_completed_at TIMESTAMP
onboarding_user_type VARCHAR(50)  -- Values: 'music_creator', 'podcast_creator', 'industry_professional', 'music_lover', null

-- Subscription fields (if not already present)
subscription_tier VARCHAR(20) DEFAULT 'free'  -- Values: 'free', 'pro'
subscription_status VARCHAR(20) DEFAULT 'active'  -- Values: 'active', 'canceled', 'past_due'
subscription_period VARCHAR(20)  -- Values: 'monthly', 'annual'
subscription_start_date TIMESTAMP
subscription_renewal_date TIMESTAMP
money_back_guarantee_end_date TIMESTAMP  -- NEW: 7 days from subscription_start_date
stripe_customer_id VARCHAR(255)
stripe_subscription_id VARCHAR(255)
```

### **Onboarding Analytics Table (Optional but Recommended):**

```sql
CREATE TABLE onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  event_name VARCHAR(100),
  screen_name VARCHAR(50),
  properties JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_onboarding_analytics_user ON onboarding_analytics(user_id);
CREATE INDEX idx_onboarding_analytics_event ON onboarding_analytics(event_name);
```

---

## 🔌 **REQUIRED API ENDPOINTS**

### **1. POST /api/onboarding/check-username**

**Purpose:** Check if a username is available in real-time

**Request:**
```json
{
  "username": "johnsmith"
}
```

**Response (Success):**
```json
{
  "success": true,
  "available": true,
  "suggestions": []  // Optional: if unavailable, suggest alternatives
}
```

**Response (Unavailable):**
```json
{
  "success": true,
  "available": false,
  "suggestions": ["johnsmith1", "johnsmith2", "johnsmith3"]  // Optional
}
```

**Validation Rules:**
- Minimum 3 characters
- Maximum 30 characters
- Lowercase only
- Alphanumeric + underscore only
- Must be unique

**Authentication:** Optional (Bearer token if available, but endpoint should work without auth for username checking)

---

### **2. GET /api/onboarding/value-demo**

**Purpose:** Return personalized creator profiles for value demonstration screen

**Request Headers:**
```
Authorization: Bearer <access_token>  // Optional but recommended
```

**Query Parameters (Optional):**
- `user_type`: music_creator | podcast_creator | industry_professional | music_lover
- `genres`: Comma-separated genre IDs
- `limit`: Number of creators to return (default: 3)

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
    },
    // ... more creators
  ]
}
```

**Logic:**
- If `user_type` provided, prioritize creators matching that type
- If `genres` provided, prioritize creators in those genres
- Return diverse, successful creators (high engagement, verified if possible)
- Fallback to general successful creators if no matches

**Authentication:** Optional (but recommended for personalization)

---

### **3. POST /api/onboarding/upgrade-pro**

**Purpose:** Create Stripe subscription for Pro tier (immediate payment, no trial)

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
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
  "error_code": "card_declined",  // Stripe error code
  "message": "Your card was declined. Please try a different payment method."
}
```

**Implementation Notes:**
1. **Create Stripe Customer** (if doesn't exist)
2. **Create Payment Method** from card details
3. **Create Subscription** (NO trial period):
   ```javascript
   const subscription = await stripe.subscriptions.create({
     customer: customerId,
     items: [{ price: priceId }],  // £9.99/month price ID
     payment_behavior: 'default_incomplete',
     payment_settings: { 
       save_default_payment_method: 'on_subscription' 
     },
     expand: ['latest_invoice.payment_intent']
   });
   ```
4. **Process Payment Immediately** (no trial period)
5. **Update Database:**
   - `subscription_tier = 'pro'`
   - `subscription_status = 'active'`
   - `subscription_start_date = now()`
   - `money_back_guarantee_end_date = now() + 7 days`
   - `stripe_customer_id`
   - `stripe_subscription_id`
6. **Send Welcome Email** (with money-back guarantee reminder)

**Error Handling:**
- Invalid card → Return error with user-friendly message
- Payment declined → Return error with suggestion to try different card
- Network error → Return error with retry suggestion
- Duplicate subscription → Return error if user already has active Pro subscription

---

### **4. POST /api/user/onboarding-progress** (May Already Exist)

**Purpose:** Update onboarding progress (user type selection, current step)

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "uuid",
  "userType": "music_creator",  // Optional: music_creator | podcast_creator | industry_professional | music_lover | null
  "currentStep": "quickSetup"  // Optional: welcome | userType | quickSetup | valueDemo | tierSelection | payment | welcomeConfirmation
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding progress updated",
  "profile": {
    "id": "uuid",
    "onboarding_user_type": "music_creator",
    "onboarding_step": "quickSetup"
  }
}
```

**Note:** This endpoint may already exist. Please confirm and update if needed.

---

### **5. POST /api/user/complete-profile** (May Already Exist)

**Purpose:** Complete user profile setup during onboarding

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "creator",  // Required: 'creator' | 'listener'
  "display_name": "John Smith",  // Required
  "username": "johnsmith",  // Required, must be unique
  "country": "United Kingdom",  // Optional
  "location": "London",  // Optional
  "genres": ["genre-id-1", "genre-id-2", "genre-id-3"],  // Optional: array of genre IDs
  "onboarding_user_type": "music_creator"  // Optional: from user type selection
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "profile": {
    "id": "uuid",
    "username": "johnsmith",
    "display_name": "John Smith",
    // ... other profile fields
  }
}
```

**Validation:**
- `display_name`: Required, 2-50 characters
- `username`: Required, 3-30 characters, unique, lowercase, alphanumeric + underscore
- `genres`: Optional, but if provided, minimum 3 required

**Note:** This endpoint may already exist. Please confirm it accepts `onboarding_user_type` field.

---

### **6. POST /api/user/complete-onboarding** (May Already Exist)

**Purpose:** Mark onboarding as completed

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "profile": {
    "id": "uuid",
    "onboarding_completed": true,
    "onboarding_completed_at": "2024-12-01T10:00:00Z"
  }
}
```

**Implementation:**
- Set `onboarding_completed = true`
- Set `onboarding_completed_at = now()`
- Update `onboarding_step = 'completed'` (if field exists)

**Note:** This endpoint may already exist. Please confirm.

---

## 🔄 **EXISTING ENDPOINTS (Confirmation Needed)**

The following endpoints are referenced in the mobile app. Please confirm they exist and work as expected:

1. **POST /api/user/onboarding-progress** - Update onboarding progress
2. **POST /api/user/complete-profile** - Complete profile setup
3. **POST /api/user/complete-onboarding** - Mark onboarding complete
4. **GET /api/genres?category=music** - Get list of genres
5. **POST /api/users/{userId}/genres** - Save user genre preferences

---

## 💳 **STRIPE INTEGRATION REQUIREMENTS**

### **Product & Price Setup:**

**Pro Monthly:**
- Product Name: "SoundBridge Pro"
- Price: £9.99/month
- Currency: GBP
- Recurring: Monthly

**Pro Annual (Optional for onboarding, but needed for upgrade flow):**
- Product Name: "SoundBridge Pro (Annual)"
- Price: £99/year
- Currency: GBP
- Recurring: Yearly

### **Important: NO TRIAL PERIOD**

**Critical:** Do NOT set `trial_period_days` when creating subscriptions. Payment should be processed immediately.

**Correct Implementation:**
```javascript
// ✅ CORRECT: Immediate payment, no trial
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: monthlyPriceId }],
  payment_behavior: 'default_incomplete',
  payment_settings: { 
    save_default_payment_method: 'on_subscription' 
  }
});
```

**Incorrect Implementation:**
```javascript
// ❌ WRONG: Do NOT do this
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: monthlyPriceId }],
  trial_period_days: 7,  // ❌ NO TRIAL PERIOD
  // ...
});
```

### **Money-Back Guarantee Tracking:**

Store `money_back_guarantee_end_date` in database:
- Calculate: `subscription_start_date + 7 days`
- Use for refund eligibility checks
- Display in user's billing settings

---

## 📧 **EMAIL NOTIFICATIONS NEEDED**

### **1. Pro Upgrade Welcome Email**

**Trigger:** Immediately after successful Pro upgrade

**Subject:** Welcome to SoundBridge Pro! 🎵

**Content:**
```
Hi [Name],

Your Pro subscription is now active! Here's what you can do:

✅ Upload up to 10 tracks per month
✅ Search unlimited creators
✅ Message anyone without limits
✅ Get detailed analytics
✅ Access payment protection

🛡️ Remember: You have 7 days to request a full refund if you're not satisfied. 
Simply visit Settings → Billing → Cancel Subscription within 7 days.

Questions? Reply to this email - we're here to help!

[Start Uploading Your Music]
```

---

## 🧪 **TESTING REQUIREMENTS**

### **Test Cards (Stripe Test Mode):**

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVV: Any 3 digits

**Declined Payment:**
- Card: `4000 0000 0000 0002`
- Expiry: Any future date
- CVV: Any 3 digits

**Insufficient Funds:**
- Card: `4000 0000 0000 9995`
- Expiry: Any future date
- CVV: Any 3 digits

---

## 📊 **ANALYTICS EVENTS (Optional but Recommended)**

If implementing `onboarding_analytics` table, track these events:

1. **onboarding_started** - When user reaches welcome screen
2. **user_type_selected** - When user selects user type
3. **profile_created** - When quick setup is completed
4. **value_demo_viewed** - When value demo screen is viewed
5. **tier_selected** - When user chooses Free or Pro
6. **payment_method_added** - When payment form is submitted
7. **onboarding_completed** - When onboarding is finished

**Event Properties:**
- `screen_name`: Current screen
- `user_type`: Selected user type
- `selected_tier`: 'free' | 'pro'
- `time_spent`: Time on screen (seconds)
- `properties`: Additional JSONB data

---

## ⚠️ **IMPORTANT NOTES**

1. **No Trial Period:** All Pro subscriptions must charge immediately. No `trial_period_days` in Stripe.

2. **Money-Back Guarantee:** Track the 7-day window in database (`money_back_guarantee_end_date`), not in Stripe.

3. **Refund Processing:** Refunds should be handled via existing refund endpoint (not part of onboarding, but needed for guarantee).

4. **Username Validation:** Real-time checking is critical for good UX. Consider caching or rate limiting.

5. **Error Messages:** Provide user-friendly error messages for payment failures.

6. **Security:** Never log or store full card numbers. Use Stripe's secure tokenization.

---

## ✅ **ACCEPTANCE CRITERIA**

The endpoints are considered complete when:

- [ ] Username checking works in real-time (< 500ms response)
- [ ] Value demo returns 3+ diverse creator profiles
- [ ] Pro upgrade processes payment immediately (no trial)
- [ ] Database stores `money_back_guarantee_end_date` correctly
- [ ] Welcome email sent after Pro upgrade
- [ ] Error handling works for declined cards
- [ ] All existing endpoints confirmed working
- [ ] Stripe webhooks configured for subscription events

---

## 📞 **QUESTIONS OR CLARIFICATIONS**

If you have questions about:
- Database schema requirements
- Stripe integration details
- Error handling expectations
- Email template content

Please reach out to the mobile team for clarification.

---

## 🔗 **RELATED DOCUMENTS**

- `ONBOARDING_NEW_FLOW.md` - Complete onboarding flow specification
- `TIER_CORRECTIONS.md` - Pricing structure (no trial, money-back guarantee)
- `MOBILE_TEAM_AUTH_COMPLETE_GUIDE.md` - Authentication patterns

---

**END OF DOCUMENT**

