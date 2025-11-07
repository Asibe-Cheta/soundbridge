# Mobile Team - UX Improvements Backend Response

**Date:** November 7, 2025  
**From:** Web App Development Team  
**To:** Mobile Development Team  
**Priority:** High  
**Status:** ✅ Most Features Implemented | 🔧 Some New Features Required

---

## EXECUTIVE SUMMARY

Great news! **Most of the backend infrastructure you need is already implemented**. However, we've identified **3 new features** that need to be built to fully support your UX improvements:

### ✅ **Already Implemented (90% of your needs):**
- Genre preferences system
- Location/city storage
- Subscription tier tracking
- Collaboration availability & requests
- Tipping system with analytics
- Play count tracking
- Follower tracking with timestamps

### 🔧 **New Features We'll Implement (10%):**
1. **Distance preference field** for event discovery
2. **Creator earnings summary endpoint** (consolidates tips + streams + followers)
3. **Monthly upload quota tracking** (currently unlimited, need to add tracking)

---

## SECTION 1: USER PROFILE DATA SCHEMA

### 1.1 Distance Preference for Event Discovery

**Status:** 🔧 **NEW FEATURE REQUIRED**

**Current State:** This field doesn't exist yet.

**What We'll Implement:**
```sql
-- Add to profiles table
ALTER TABLE profiles 
ADD COLUMN preferred_event_distance INTEGER DEFAULT 25; -- miles

-- Add index for performance
CREATE INDEX idx_profiles_event_distance ON profiles(preferred_event_distance);
```

**Implementation Details:**
- **Field name:** `preferred_event_distance`
- **Data type:** `INTEGER`
- **Unit:** Miles
- **Default value:** `25` miles
- **Valid range:** 5-100 miles
- **API endpoint:** `PATCH /api/users/[userId]/preferences` (will be created)

**Mobile Integration:**
```typescript
// Update user's event distance preference
PATCH /api/users/{userId}/preferences
Body: {
  preferred_event_distance: 50
}

Response: {
  success: true,
  preferences: {
    preferred_event_distance: 50
  }
}
```

---

### 1.2 Genre Preferences Storage

**Status:** ✅ **FULLY IMPLEMENTED**

**Confirmation:**
- ✅ Genre preferences are stored from onboarding flow
- ✅ Stored in `user_genres` junction table (not directly in profiles)
- ✅ Maximum 5 genres per user (enforced by database trigger)

**Database Structure:**
```sql
-- Junction table (many-to-many relationship)
CREATE TABLE user_genres (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    genre_id UUID REFERENCES genres(id),
    preference_strength INTEGER CHECK (preference_strength BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ,
    UNIQUE(user_id, genre_id)
);

-- Genres lookup table
CREATE TABLE genres (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'music' or 'podcast'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER,
    created_at TIMESTAMPTZ
);
```

**Data Structure:**
- **Storage:** Junction table `user_genres` with foreign keys
- **Genre IDs:** UUIDs referencing `genres` table
- **Lookup table:** `genres` table with 65 pre-populated genres (49 music + 16 podcast)
- **Maximum genres:** 5 per user (enforced by trigger)

**Existing API Endpoints:**
```typescript
// Get user's genre preferences
GET /api/users/{userId}/genres
Response: {
  success: true,
  genres: [
    { id: "uuid", name: "Gospel", category: "music" },
    { id: "uuid", name: "Afrobeat", category: "music" }
  ]
}

// Update user's genre preferences
POST /api/users/{userId}/genres
Body: {
  genre_ids: ["uuid1", "uuid2", "uuid3"]
}
Response: {
  success: true,
  message: "Genre preferences updated"
}
```

---

### 1.3 Location/City Storage

**Status:** ✅ **FULLY IMPLEMENTED**

**Confirmation:**
- ✅ City is stored in the `profiles` table
- ✅ Data type: String (city name)
- ✅ Also includes `country` field (UK/Nigeria)

**Database Fields:**
```sql
-- In profiles table
location VARCHAR(255),  -- Full location string
city VARCHAR(100),      -- City name
country VARCHAR(50) CHECK (country IN ('UK', 'Nigeria'))
```

**Field Details:**
- **City field name:** `city`
- **Location:** `profiles` table
- **Data type:** String (city name, not ID)
- **No lookup table** - stored as plain text
- **Country field:** `country` (enum: 'UK' or 'Nigeria')

**API Access:**
```typescript
// Get user profile (includes city)
GET /api/profile/{userId}
Response: {
  id: "uuid",
  username: "artist123",
  display_name: "Artist Name",
  city: "Lagos",
  country: "Nigeria",
  location: "Lagos, Nigeria"
  // ... other fields
}
```

---

### 1.4 Subscription Tier

**Status:** ✅ **FULLY IMPLEMENTED**

**Confirmation:**
- ✅ Subscription tier is tracked in separate `user_subscriptions` table
- ✅ Possible values: `'free'`, `'pro'`, `'enterprise'`
- ✅ Join required to get tier with user data

**Database Structure:**
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tier TEXT CHECK (tier IN ('free', 'pro', 'enterprise')),
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Field Details:**
- **Field name:** `tier`
- **Possible values:** `'free'`, `'pro'`, `'enterprise'`
- **Table:** `user_subscriptions` (separate table)
- **Join:** `user_subscriptions.user_id = profiles.id`

**API Endpoint:**
```typescript
// Get user subscription
GET /api/subscription
Headers: { Authorization: `Bearer ${token}` }

Response: {
  tier: "free",
  status: "active",
  billing_cycle: "monthly",
  subscription_ends_at: "2025-12-07T00:00:00Z"
}
```

---

### 1.5 Upload Tracking

**Status:** 🔧 **PARTIALLY IMPLEMENTED - NEEDS ENHANCEMENT**

**Current State:**
- ✅ Upload counts are tracked in `user_usage` table
- ❌ No monthly reset logic (currently unlimited uploads)
- ❌ No "uploads this month" calculation

**What We'll Implement:**

```sql
-- Add monthly tracking fields to user_usage table
ALTER TABLE user_usage
ADD COLUMN current_month_uploads INTEGER DEFAULT 0,
ADD COLUMN billing_cycle_start_date TIMESTAMP DEFAULT NOW(),
ADD COLUMN last_upload_reset_date TIMESTAMP DEFAULT NOW();

-- Function to check upload quota
CREATE OR REPLACE FUNCTION check_upload_quota(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_uploads_this_month INTEGER;
  v_upload_limit INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Get user tier
  SELECT tier INTO v_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id;
  
  -- Set upload limits based on tier
  v_upload_limit := CASE 
    WHEN v_tier = 'free' THEN 3
    WHEN v_tier = 'pro' THEN 10
    WHEN v_tier = 'enterprise' THEN 999999
    ELSE 3
  END;
  
  -- Get uploads this month
  SELECT COUNT(*) INTO v_uploads_this_month
  FROM audio_tracks
  WHERE creator_id = p_user_id
    AND created_at >= date_trunc('month', CURRENT_DATE);
  
  v_remaining := GREATEST(v_upload_limit - v_uploads_this_month, 0);
  
  RETURN jsonb_build_object(
    'tier', v_tier,
    'upload_limit', v_upload_limit,
    'uploads_this_month', v_uploads_this_month,
    'remaining', v_remaining,
    'reset_date', date_trunc('month', CURRENT_DATE) + interval '1 month'
  );
END;
$$ LANGUAGE plpgsql;
```

**Implementation Details:**
- **Tracking method:** Calculated query counting rows in `audio_tracks` with `created_at` filter
- **"This month" definition:** Calendar month (resets on 1st of each month)
- **Upload limits per tier:**
  - Free: 3 tracks/month
  - Pro: 10 tracks/month
  - Enterprise: Unlimited

**New API Endpoint:**
```typescript
// Get upload quota status
GET /api/upload/quota
Headers: { Authorization: `Bearer ${token}` }

Response: {
  tier: "free",
  upload_limit: 3,
  uploads_this_month: 1,
  remaining: 2,
  reset_date: "2025-12-01T00:00:00Z"
}
```

---

## SECTION 2: CREATOR/ARTIST PROFILE DATA SCHEMA

### 2.1 Collaboration Availability

**Status:** ✅ **FULLY IMPLEMENTED**

**Confirmation:**
- ✅ Collaboration system is fully implemented with calendar
- ✅ Availability status stored in `creator_availability` table
- ✅ Requests stored in `collaboration_requests` table

**Database Structure:**
```sql
-- Availability calendar
CREATE TABLE creator_availability (
    id UUID PRIMARY KEY,
    creator_id UUID REFERENCES profiles(id),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    max_requests_per_slot INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Collaboration requests
CREATE TABLE collaboration_requests (
    id UUID PRIMARY KEY,
    requester_id UUID REFERENCES profiles(id),
    creator_id UUID REFERENCES profiles(id),
    availability_id UUID REFERENCES creator_availability(id),
    proposed_start_date TIMESTAMPTZ NOT NULL,
    proposed_end_date TIMESTAMPTZ NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    response_message TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ
);
```

**Field Details:**
- **Availability status field:** `is_available` (boolean) in `creator_availability` table
- **Calendar data field:** Stored as multiple rows in `creator_availability` (one row per time slot)
- **Calendar structure:** Relational table (not JSON)
  - Each row represents a time slot
  - `start_date` and `end_date` define the slot
  - `is_available` indicates if slot is open
  - `max_requests_per_slot` limits concurrent requests

**Existing API Endpoints:**
```typescript
// Get creator's availability slots
GET /api/availability?creatorId={uuid}
Response: {
  data: [
    {
      id: "uuid",
      creator_id: "uuid",
      start_date: "2025-11-10T09:00:00Z",
      end_date: "2025-11-10T12:00:00Z",
      is_available: true,
      max_requests_per_slot: 1,
      notes: "Studio session available"
    }
  ]
}

// Create collaboration request
POST /api/collaboration
Body: {
  creator_id: "uuid",
  availability_id: "uuid",
  proposed_start_date: "2025-11-10T09:00:00Z",
  proposed_end_date: "2025-11-10T12:00:00Z",
  subject: "Recording Collaboration",
  message: "Would love to collaborate..."
}
Response: {
  success: true,
  request: { id: "uuid", status: "pending", ... }
}
```

---

### 2.2 Creator Genre and Location

**Status:** ✅ **FULLY IMPLEMENTED**

**Confirmation:**
- ✅ Creator genre uses same `user_genres` table as user preferences
- ✅ Creators can have multiple genres (up to 5)
- ✅ Location uses same `city` and `country` fields as users

**Field Details:**
- **Creator genre:** Same field as Section 1.2 (`user_genres` junction table)
- **Multiple values:** Yes, up to 5 genres
- **Display recommendation:** Show all genres, or primary genre (first one with highest `preference_strength`)
- **Location fields:** Same as Section 1.3 (`city`, `country`, `location` in `profiles` table)

---

## SECTION 3: EVENT DATA SCHEMA

### 3.1 Event Genres/Tags

**Status:** ✅ **FULLY IMPLEMENTED**

**Database Structure:**
```sql
-- Events table has genre field
CREATE TABLE events (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES profiles(id),
    genre VARCHAR(100),  -- Single genre field
    tags TEXT[],         -- Array of tags
    event_date TIMESTAMPTZ,
    location VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(50),
    // ... other fields
);
```

**Field Details:**
- **Genre field name:** `genre` (single value)
- **Tags field name:** `tags` (array of strings)
- **Data structure:**
  - `genre`: Single string (e.g., `"Gospel"`)
  - `tags`: Array of strings (e.g., `["Gospel", "R&B", "Live"]`)
- **Multiple genres:** Use `tags` array for multiple categories
- **Maximum:** No hard limit on tags array

**API Access:**
```typescript
// Get event details
GET /api/events/{eventId}
Response: {
  id: "uuid",
  title: "Gospel Night",
  genre: "Gospel",
  tags: ["Gospel", "R&B", "Live", "Worship"],
  city: "Lagos",
  country: "Nigeria"
  // ... other fields
}
```

---

## SECTION 4: API ENDPOINTS

### 4.1 Tips Count Endpoint

**Status:** ✅ **FULLY IMPLEMENTED**

**Existing Endpoint:**
```typescript
// Get creator's tip analytics
GET /api/user/tip-analytics?start_date=2025-11-01&end_date=2025-11-30
Headers: { Authorization: `Bearer ${token}` }

Response: {
  analytics: {
    total_tips: 15,              // Count of tips
    total_amount: 150.00,        // Total $ amount
    total_earnings: 138.00,      // After platform fees
    total_fees: 12.00,
    average_tip: 10.00,
    tips_by_tier: {
      free: 5,
      pro: 8,
      enterprise: 2
    }
  },
  recentTips: [
    {
      id: "uuid",
      tipper_id: "uuid",
      tipper_tier: "pro",
      tip_amount: 15.00,
      platform_fee: 1.20,
      creator_earnings: 13.80,
      tip_message: "Amazing track!",
      is_anonymous: false,
      created_at: "2025-11-05T10:00:00Z",
      status: "completed"
    }
  ]
}
```

**Details:**
- **Route:** `GET /api/user/tip-analytics`
- **Time period:** Query parameters `start_date` and `end_date` (ISO 8601 format)
- **Default:** If no dates provided, returns current month
- **Response format:** See above
- **Authentication:** JWT bearer token required
- **Currency:** Stored as decimal (dollars/pounds, not cents)

---

### 4.2 Creator Earnings Summary Endpoint

**Status:** 🔧 **NEW FEATURE REQUIRED**

**Current State:**
- ✅ Tips data available via `/api/user/tip-analytics`
- ✅ Stream counts available in `audio_tracks.play_count`
- ✅ Follower counts available in `profiles.followers_count`
- ❌ No consolidated endpoint combining all three

**What We'll Implement:**

```typescript
// New consolidated endpoint
GET /api/creator/earnings-summary
Headers: { Authorization: `Bearer ${token}` }
Query: {
  month?: "2025-11" // Optional, defaults to current month
}

Response: {
  month: "2025-11",
  tips: {
    amount: 150.50,      // Total tips received (after fees)
    count: 15,           // Number of tips
    currency: "USD"
  },
  streams: {
    count: 1250,         // Total plays this month
    tracks: [
      { id: "uuid", title: "Track 1", plays: 500 },
      { id: "uuid", title: "Track 2", plays: 750 }
    ]
  },
  followers: {
    new_count: 45,       // New followers this month
    total_count: 320     // Total followers
  },
  engagement: {
    likes: 89,
    comments: 34,
    shares: 12
  }
}
```

**Implementation Details:**
- **Route:** `GET /api/creator/earnings-summary`
- **Time period:** Defaults to current month, accepts `month` query parameter
- **Field names:** `tips.amount`, `streams.count`, `followers.new_count`
- **All metrics included:** Yes (tips, streams, followers, engagement)
- **Stream counts:** Aggregated from `audio_tracks.play_count` with date filter
- **Follower growth:** Calculated from `follows` table with `created_at` filter
- **Currency:** Decimal format (dollars/pounds)

---

### 4.3 Collaboration Request Endpoint

**Status:** ✅ **FULLY IMPLEMENTED**

**Existing Endpoint:**
```typescript
// Submit collaboration request
POST /api/collaboration
Headers: {
  Authorization: `Bearer ${token}`,
  Content-Type: 'application/json'
}

Body: {
  creator_id: "uuid",
  availability_id: "uuid",
  proposed_start_date: "2025-11-15T10:00:00Z",
  proposed_end_date: "2025-11-15T12:00:00Z",
  subject: "Recording Collaboration",
  message: "Let's collaborate on a new track..."
}

Response: {
  success: true,
  request: {
    id: "uuid",
    requester_id: "uuid",
    creator_id: "uuid",
    availability_id: "uuid",
    proposed_start_date: "2025-11-15T10:00:00Z",
    proposed_end_date: "2025-11-15T12:00:00Z",
    subject: "Recording Collaboration",
    message: "Let's collaborate...",
    status: "pending",
    created_at: "2025-11-07T15:30:00Z"
  }
}

// Error responses
400: { error: "This time slot has reached maximum request limit" }
404: { error: "Availability slot not found" }
500: { error: "Failed to create collaboration request" }
```

**Details:**
- **Route:** `POST /api/collaboration`
- **Required parameters:** All fields in body example above are required
- **Field names:** Exactly as shown (snake_case)
- **Project type:** Not currently tracked (can be added to `subject` or `message`)
- **Date format:** ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- **Success response:** Returns full request object with `id` and `status: "pending"`
- **Error responses:** See above

**Note:** The `projectType` field you mentioned doesn't exist. Collaboration type is described in the `subject` and `message` fields. We can add a dedicated `project_type` enum field if needed.

---

### 4.4 Tipping/Tips Submission Endpoint

**Status:** ✅ **FULLY IMPLEMENTED**

**Existing Endpoints:**

```typescript
// Step 1: Create tip payment intent
POST /api/payments/create-tip
Headers: {
  Authorization: `Bearer ${token}`,
  Content-Type: 'application/json'
}

Body: {
  creatorId: "uuid",
  amount: 10.00,           // In dollars/pounds (not cents)
  currency: "USD",
  message: "Great music!",
  isAnonymous: false,
  userTier: "pro",         // 'free', 'pro', 'enterprise'
  paymentMethod: "card"    // 'card', 'apple_pay', 'google_pay'
}

Response: {
  success: true,
  paymentIntentId: "pi_xxx",
  clientSecret: "pi_xxx_secret_xxx",
  tipId: "uuid",
  platformFee: 0.80,
  creatorEarnings: 9.20
}

// Step 2: Confirm tip payment
POST /api/payments/confirm-tip
Headers: {
  Authorization: `Bearer ${token}`,
  Content-Type: 'application/json'
}

Body: {
  paymentIntentId: "pi_xxx"
}

Response: {
  success: true,
  message: "Tip sent successfully!"
}

// Error responses
400: { error: "Invalid amount" }
404: { error: "Creator not found" }
500: { error: "Payment processing failed" }
```

**Details:**
- **Routes:** 
  - Create: `POST /api/payments/create-tip`
  - Confirm: `POST /api/payments/confirm-tip`
- **Field names:** Exactly as shown (camelCase)
- **Amount format:** Decimal (10.00 = $10.00, not cents)
- **Stripe integration:** 
  - Backend creates PaymentIntent
  - Mobile receives `clientSecret`
  - Mobile completes payment with Stripe SDK
  - Mobile calls confirm endpoint after payment succeeds
- **Success response:** See above
- **Error responses:** See above

---

## SECTION 5: EXISTING FEATURES - CONFIRMATION

### 5.1 User Profile Data
- ✅ Genre preferences stored from onboarding (`user_genres` table)
- ✅ User location/city stored (`city`, `country` in `profiles` table)
- ✅ User role (creator/listener) stored (`role` field in `profiles` table)

### 5.2 Creator Stats
- ✅ Follower count accessible (`followers_count` in `profiles` table)
- ✅ Track count accessible (`tracks_count` in `profiles` table)
- ✅ Stats displayed on profile (via `/api/profile/{userId}` endpoint)

### 5.3 Event Data
- ✅ Events have location data (`city`, `country`, `location` fields)
- ✅ Events filterable by location (via `/api/events` with query params)
- ✅ Events have date/time (`event_date` field)

### 5.4 Collaboration System
- ✅ Collaboration requests table exists (`collaboration_requests`)
- ✅ Availability calendar system exists (`creator_availability`)
- ✅ Collaboration messaging exists (via `message` and `response_message` fields)

---

## SECTION 6: POTENTIAL NEW REQUIREMENTS

### 6.1 Stream Count Tracking

**Status:** ✅ **FULLY IMPLEMENTED**

**Confirmation:**
- ✅ Individual streams/plays are tracked per track
- **Table:** `audio_tracks`
- **Field:** `play_count` (INTEGER)
- **Update mechanism:** 
  - Incremented via `POST /api/audio/update-play-count`
  - Called when track playback completes
  - Also accessible via `audio_tracks.play_count` field

**Structure:**
```sql
-- In audio_tracks table
play_count INTEGER DEFAULT 0
```

**API:**
```typescript
// Update play count
POST /api/audio/update-play-count
Body: { trackId: "uuid" }
Response: { success: true, playCount: 125 }
```

---

### 6.2 Follower Growth Tracking

**Status:** ✅ **FULLY IMPLEMENTED**

**Confirmation:**
- ✅ Can query new followers in specific time period
- **Table:** `follows`
- **Field:** `created_at` (TIMESTAMPTZ)
- **Query method:** Filter `follows` table by `created_at` date range

**Query Example:**
```sql
-- Get new followers this month
SELECT COUNT(*) as new_followers
FROM follows
WHERE following_id = 'user-uuid'
  AND created_at >= date_trunc('month', CURRENT_DATE);
```

**API Access:**
```typescript
// Get followers with date filter (via profile analytics)
GET /api/profile/analytics
Response: {
  followers: {
    total: 320,
    new_this_month: 45
  }
}
```

---

### 6.3 Monthly Upload Reset Logic

**Status:** 🔧 **NEW FEATURE REQUIRED**

**Current State:**
- ❌ No automated reset logic (uploads are currently unlimited)
- ✅ Can calculate uploads per month via query

**What We'll Implement:**
- Database function to check quota (see Section 1.5)
- API endpoint to validate uploads before processing
- No automated reset needed (calculated on-demand)

---

## SECTION 7: WEB APP CONSISTENCY

**Answer:** YES, please document these as you implement them!

We want to maintain consistency between mobile and web apps. Please share:
1. **UI/UX patterns** - Screenshots or Figma designs
2. **Copy/messaging** - Exact text for labels and descriptions
3. **Business logic** - Any calculations or rules
4. **User flows** - Step-by-step interaction patterns

We'll mirror these features on the web app to ensure a consistent experience across platforms.

---

## IMPLEMENTATION TIMELINE

### 🔴 **CRITICAL - Implementing Now (2-3 days)**

**New Features We're Building:**

1. **Distance Preference Field**
   - Database migration
   - API endpoint: `PATCH /api/users/[userId]/preferences`
   - Default: 25 miles

2. **Creator Earnings Summary Endpoint**
   - Consolidates tips + streams + followers
   - API endpoint: `GET /api/creator/earnings-summary`
   - Monthly aggregation

3. **Upload Quota Tracking**
   - Database function for quota checking
   - API endpoint: `GET /api/upload/quota`
   - Calendar month reset logic

**Timeline:**
- Database changes: 0.5 days
- API endpoints: 1 day
- Testing: 0.5 days
- Documentation: 0.5 days
- **Total: 2.5 days**

### ✅ **Already Available (0 days)**

Everything else is ready for immediate use:
- Genre preferences system
- Location/city storage
- Subscription tier tracking
- Collaboration system
- Tipping system
- Play count tracking
- Follower tracking

---

## NEXT STEPS

### For Mobile Team:
1. ✅ **Start implementing** with existing endpoints (90% of features)
2. ⏳ **Wait 2-3 days** for new endpoints (distance, earnings summary, upload quota)
3. 📝 **Share UI/UX designs** so we can mirror on web app
4. 🧪 **Test integration** with our staging environment

### For Web Team (Us):
1. 🔧 **Implement 3 new features** (distance, earnings, quota)
2. 📚 **Create API documentation** with full examples
3. 🧪 **Test all endpoints** with mobile-like requests
4. 📱 **Mirror mobile UX** on web app after seeing your designs

---

## DETAILED API DOCUMENTATION

We'll create a comprehensive API documentation file with:
- Full request/response examples
- Error handling
- Authentication details
- Rate limiting
- CORS configuration
- Mobile-specific considerations

**Document:** `MOBILE_TEAM_UX_API_DOCUMENTATION.md` (coming in 2-3 days)

---

## QUESTIONS FOR MOBILE TEAM

Before we finalize implementation, please confirm:

1. **Distance Units:** Is miles acceptable, or do you need kilometers option?
2. **Upload Quota:** Confirm limits (Free: 3, Pro: 10, Enterprise: Unlimited)?
3. **Earnings Currency:** USD for all users, or multi-currency support needed?
4. **Date Formats:** ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`) acceptable everywhere?
5. **Project Type:** Should we add `project_type` enum to collaboration requests?

---

## CONTACT

If you have questions or need clarification on any endpoint, please reach out. We're committed to making this integration seamless!

**Web App Development Team**

---

## APPENDIX: QUICK REFERENCE

### All Existing API Endpoints

```typescript
// User & Profile
GET  /api/profile/{userId}
GET  /api/users/{userId}/genres
POST /api/users/{userId}/genres
GET  /api/subscription

// Collaboration
GET  /api/availability?creatorId={uuid}
POST /api/collaboration

// Tipping
POST /api/payments/create-tip
POST /api/payments/confirm-tip
GET  /api/user/tip-analytics

// Audio
POST /api/audio/update-play-count

// Analytics
GET  /api/profile/analytics
```

### New API Endpoints (Coming in 2-3 days)

```typescript
// User Preferences
PATCH /api/users/{userId}/preferences

// Creator Earnings
GET /api/creator/earnings-summary

// Upload Quota
GET /api/upload/quota
```

### Database Tables Reference

```
✅ profiles - User/creator profiles
✅ user_subscriptions - Subscription tiers
✅ user_genres - Genre preferences (junction)
✅ genres - Genre lookup
✅ audio_tracks - Music tracks with play_count
✅ events - Events with location
✅ follows - Follower relationships
✅ creator_availability - Collaboration calendar
✅ collaboration_requests - Collaboration requests
✅ tip_analytics - Tip tracking
✅ creator_tips - Tip transactions
🔧 user_usage - Upload tracking (needs enhancement)
```

---

**Status:** ✅ Response Complete | 🔧 Implementation Starting Now

