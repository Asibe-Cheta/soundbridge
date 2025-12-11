# SoundBridge Backend Implementation Summary

**Version:** 1.0
**Date:** December 11, 2025
**Implementation Status:** ✅ Complete

---

## Overview

This document summarizes all backend changes implemented for the SoundBridge pricing tier restructure. All code has been written and is ready for deployment.

**Pricing Structure:**
- **FREE:** 3 tracks lifetime, basic features (£0)
- **PREMIUM:** 7 tracks/month, advanced features (£6.99/month or £69.99/year)
- **UNLIMITED:** Unlimited tracks, premium features (£12.99/month or £129.99/year)

---

## Files Created/Modified

### 1. Database Schema Files

#### `database/stream_events_schema.sql` ✅
**Purpose:** Track detailed listening events for Premium/Unlimited analytics

**Tables Created:**
- `stream_events` - Main tracking table with:
  - Core identifiers (track, listener, creator)
  - Listening behavior (duration, completion%)
  - Geographic data (IP, country, city, coordinates)
  - Referral tracking (UTM, referrer type)
  - Device info (mobile/tablet/desktop, iOS/Android/web)
  - Engagement flags (liked, shared, followed, tipped, ticket purchased)
  - Session tracking

**Materialized View:**
- `stream_event_stats` - Pre-aggregated daily stats for performance

**Helper Functions:**
- `get_creator_top_countries()` - Geographic analytics
- `get_creator_peak_hours()` - Listening time patterns
- `get_creator_referrer_stats()` - Traffic source analysis
- `get_creator_demographics()` - Age/gender breakdown

**Indexes:**
- Performance indexes on creator_id, track_id, played_at, country_code, engagement
- Composite indexes for dashboard queries

**RLS Policies:**
- Creators can view own stream events
- Service role can insert events
- No updates/deletes (immutable analytics data)

#### `database/subscription_tier_schema.sql` ✅
**Purpose:** Add subscription management to profiles table

**Columns Added to `profiles`:**
- `subscription_tier` (free/premium/unlimited)
- `subscription_period` (monthly/annual)
- `subscription_status` (active/cancelled/expired/past_due/trial)
- `subscription_start_date`, `subscription_renewal_date`, `subscription_cancel_date`
- `uploads_this_period`, `upload_period_start`, `total_uploads_lifetime`
- `custom_username`, `custom_username_last_changed`
- `featured_count_this_month`, `last_featured_date`, `next_featured_date`
- `stripe_customer_id`, `revenuecat_customer_id`

**Helper Functions:**
- `check_upload_limit(user_id)` - Returns can_upload, uploads_used, uploads_limit, limit_type, reset_date
- `increment_upload_count(user_id)` - Increments both period and lifetime counters
- `reset_monthly_uploads(user_id)` - Resets monthly counter (called by cron)
- `can_change_custom_username(user_id)` - Checks tier + 90-day limit
- `update_custom_username(user_id, username)` - Updates username with validation

**Indexes:**
- `idx_profiles_subscription_tier`
- `idx_profiles_subscription_status`
- `idx_profiles_custom_username` (unique)
- `idx_profiles_featured_tracking`

#### `database/increment_play_count_function.sql` ✅
**Purpose:** Atomically increment play_count for tracks

**Function:**
- `increment_play_count(track_id)` - Updates play_count for basic analytics (Free tier)

---

### 2. API Endpoints

#### `apps/web/app/api/analytics/stream-event/route.ts` ✅
**Purpose:** Log stream events from audio player

**Method:** POST

**Functionality:**
- Accepts stream event data (track ID, duration listened, platform, device)
- Performs GeoIP lookup using ip-api.com (free tier, 45 req/min)
- Stores detailed event in `stream_events` table
- Increments basic `play_count` for Free tier users
- Handles both authenticated and anonymous listeners

**Payload Example:**
```json
{
  "trackId": "uuid",
  "durationListened": 120,
  "totalDuration": 180,
  "platform": "web",
  "deviceType": "desktop",
  "referrerUrl": "https://google.com",
  "referrerType": "search",
  "utmSource": "google",
  "sessionId": "session-123"
}
```

#### `apps/web/app/api/analytics/advanced/route.ts` ✅
**Purpose:** Get advanced analytics for Premium/Unlimited users

**Method:** GET

**Query Params:**
- `period`: "7d" | "30d" | "90d" | "1y" | "all"
- `trackId`: (optional) filter by specific track

**Authorization:**
- Checks user's subscription tier
- Returns 403 if Free tier
- Only Premium/Unlimited can access

**Response Includes:**
- Overview stats (total plays, unique listeners, listening time, completion rate, countries)
- Geographic data (top countries with play counts)
- Peak listening hours (by hour of day)
- Referrer stats (traffic sources with conversion rates)
- Demographics (age/gender breakdown)
- Top tracks (ranked by completion rate)
- Engagement metrics (likes, shares, follows, tips, tickets)
- Listening trends (daily breakdown)

#### `apps/web/app/api/upload/check-limit/route.ts` ✅
**Purpose:** Check if user can upload based on tier limits

**Method:** GET

**Functionality:**
- Calls `check_upload_limit()` database function
- Returns upload status with user-friendly messages

**Response Example:**
```json
{
  "can_upload": true,
  "uploads_used": 2,
  "uploads_limit": 3,
  "limit_type": "lifetime",
  "reset_date": null,
  "subscription_tier": "free",
  "message": "You've uploaded 2 of 3 free tracks"
}
```

**Usage:**
- Call before showing upload form
- If `can_upload` is false, show upgrade prompt

#### `apps/web/app/api/profile/custom-username/route.ts` ✅
**Purpose:** Manage custom usernames (Premium/Unlimited only)

**Methods:**
- **GET** - Check if user can change username
- **POST** - Set or update username
- **PUT** - Check username availability

**Validation:**
- 3-30 characters, alphanumeric + hyphens
- Checks tier eligibility (Premium/Unlimited)
- 90-day change limit
- Reserved username blacklist
- Real-time availability check

**Reserved Usernames:**
admin, api, app, blog, dashboard, discover, events, explore, feed, help, home, login, logout, pricing, privacy, profile, search, settings, signup, soundbridge, support, terms, upload, user, users, about, contact, legal, moderator, mod, root, system, test, null, undefined, www

#### `apps/web/app/api/webhooks/subscription/route.ts` ✅
**Purpose:** Handle subscription events from RevenueCat/Stripe

**Method:** POST

**Supports:**
- RevenueCat webhooks (mobile app purchases)
- Stripe webhooks (web subscriptions)

**Events Handled:**

**RevenueCat:**
- `INITIAL_PURCHASE` - New subscription
- `RENEWAL` - Subscription renewed
- `CANCELLATION` - User cancelled (still has access until expiration)
- `EXPIRATION` - Subscription expired, revert to free
- `BILLING_ISSUE` - Payment failed

**Stripe:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

**Actions:**
- Updates user's subscription tier, status, dates
- Resets upload counters on activation
- Removes custom username on expiration
- Sends email notifications (TODO: implement email sending)

**Security:**
- Validates webhook signatures
- Uses service role to bypass RLS

#### `apps/web/app/api/cron/subscription-management/route.ts` ✅
**Purpose:** Daily cron job for subscription management

**Trigger:** Should be called daily (e.g., via Vercel Cron or external service)

**Authorization:** Requires `Bearer ${CRON_SECRET}` in Authorization header

**Tasks:**

1. **Reset Monthly Upload Counters**
   - For Premium users whose renewal date has passed
   - Sets `uploads_this_period = 0`
   - Updates `upload_period_start` and `subscription_renewal_date`

2. **Expire Subscriptions**
   - Finds active/cancelled subscriptions past renewal date
   - Reverts to free tier
   - Removes custom username
   - Sends expiration email

3. **Reset Featured Counters**
   - On 1st of each month
   - Resets `featured_count_this_month = 0` for all Premium/Unlimited users

4. **Featured Artist Rotation**
   - Selects 3-5 Premium/Unlimited users to feature
   - Premium: Max 1x/month
   - Unlimited: Max 2x/month
   - Featured duration: 48 hours
   - Removes users featured >48 hours ago

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-12-11T10:00:00Z",
  "results": {
    "uploadCountersReset": 12,
    "subscriptionsExpired": 3,
    "featuredCountersReset": 156,
    "newFeaturedUsers": 5
  }
}
```

#### `apps/web/app/api/cron/collaboration-matching/route.ts` ✅
**Purpose:** Weekly cron job for AI-powered collaboration matching

**Trigger:** Should be called weekly (e.g., every Monday 9AM UTC)

**Authorization:** Requires `Bearer ${CRON_SECRET}` in Authorization header

**Algorithm (Multi-Factor Weighted):**
- **Genre overlap:** 50% weight
- **Location proximity:** 25% weight
- **Role compatibility:** 15% weight (Artist+Producer=high, Artist+Venue=high)
- **Activity level:** 10% weight
- **Bonuses:** Mutual connections (+10%), Similar career stage (+5%)
- **Minimum score:** 60/100 to suggest

**Process:**
1. Fetch all Premium/Unlimited active users
2. For each user, calculate match scores with all other users
3. Select top 5 matches (score >= 60)
4. Create notifications (TODO: implement)
5. Send email with match details (TODO: implement)

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-12-11T09:00:00Z",
  "usersProcessed": 450,
  "matchesCreated": 2250
}
```

---

### 3. Frontend Components

#### `apps/web/src/components/analytics/AdvancedAnalytics.tsx` ✅
**Purpose:** React component for displaying advanced analytics

**Features:**
- Upgrade prompt for Free users
- Period selector (7d, 30d, 90d, 1y, all)
- Overview stats cards (plays, listeners, listening time, completion, countries)
- Geographic breakdown (top countries with play counts)
- Engagement dashboard (likes, shares, follows, tips, tickets, engagement rate)
- Top tracks by completion rate
- Responsive design

**Props:**
```typescript
interface AdvancedAnalyticsProps {
  userId: string;
  subscriptionTier: 'free' | 'premium' | 'unlimited';
}
```

**Usage:**
```typescript
import { AdvancedAnalytics } from '@/src/components/analytics/AdvancedAnalytics';

<AdvancedAnalytics userId={user.id} subscriptionTier={user.subscription_tier} />
```

---

### 4. Audio Player Service Updates

#### `apps/web/src/lib/audio-player-service.ts` ✅
**Purpose:** Enhanced audio player with stream event tracking

**New Features:**

**Stream Event Tracking:**
- Automatically tracks listening duration
- Starts on play, updates on pause
- Logs event when track ends or user switches tracks
- Only logs if listened for 3+ seconds
- Groups plays in same session

**Device Detection:**
- Detects mobile/tablet/desktop from user agent
- Detects iOS/Android/web platform

**Referrer Tracking:**
- Captures document.referrer
- Categorizes as: direct, social, search, external, internal
- Supports UTM parameters (utm_source, utm_medium, utm_campaign)

**Engagement Tracking:**
- Public method: `audioPlayerService.logEngagement('like' | 'share' | 'follow' | 'tip' | 'ticket')`
- Call when user performs engagement actions
- Enriches stream event with engagement data

**Example Usage:**
```typescript
import audioPlayerService from '@/src/lib/audio-player-service';

// When user likes a track
audioPlayerService.logEngagement('like');

// When user tips creator
audioPlayerService.logEngagement('tip');

// When user buys event ticket
audioPlayerService.logEngagement('ticket');
```

**Event Payload Sent to API:**
```json
{
  "trackId": "uuid",
  "durationListened": 120,
  "totalDuration": 180,
  "deviceType": "desktop",
  "platform": "web",
  "referrerUrl": "https://google.com",
  "referrerType": "search",
  "utmSource": "google",
  "utmMedium": "organic",
  "sessionId": "session-abc123",
  "likedTrack": true,
  "sharedTrack": false,
  "followedCreator": false,
  "tippedCreator": false,
  "purchasedTicket": false
}
```

---

## Environment Variables Required

Add these to your `.env` file:

```bash
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe Price IDs (Justice to provide after creating in Stripe Dashboard)
# IMPORTANT: Use Price IDs (price_xxxxx), NOT Product IDs (prod_xxxxx)!
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_UNLIMITED_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_UNLIMITED_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx

# Webhook Secrets
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
REVENUECAT_WEBHOOK_SECRET=xxxxxxxxxxxxx

# Cron Secret (for background jobs)
CRON_SECRET=your_secret_key_here
```

---

## Deployment Steps

### 1. Run Database Migrations

Execute SQL files in this order:

```bash
# 1. Stream events schema (if not already run)
psql $DATABASE_URL -f database/stream_events_schema.sql

# 2. Subscription tier schema
psql $DATABASE_URL -f database/subscription_tier_schema.sql

# 3. Increment play count function
psql $DATABASE_URL -f database/increment_play_count_function.sql
```

### 2. Set Environment Variables

Add the required environment variables to your hosting platform (Vercel, Railway, etc.):

```bash
# Via Vercel CLI
vercel env add CRON_SECRET
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add REVENUECAT_WEBHOOK_SECRET

# Via Railway
railway variables set CRON_SECRET=your_secret
```

### 3. Deploy Backend

```bash
# Deploy to Vercel
vercel --prod

# Or push to main branch if using auto-deployment
git add .
git commit -m "feat: implement pricing tier restructure"
git push origin main
```

### 4. Set Up Cron Jobs

**Option A: Vercel Cron**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/subscription-management",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/collaboration-matching",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

**Option B: External Cron Service**

Use cron-job.org or similar:

```
# Daily at midnight UTC
0 0 * * * curl -H "Authorization: Bearer ${CRON_SECRET}" https://soundbridge.live/api/cron/subscription-management

# Weekly Monday 9AM UTC
0 9 * * 1 curl -H "Authorization: Bearer ${CRON_SECRET}" https://soundbridge.live/api/cron/collaboration-matching
```

### 5. Configure Webhooks

**Stripe:**
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://soundbridge.live/api/webhooks/subscription`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy signing secret and add to `STRIPE_WEBHOOK_SECRET`

**RevenueCat:**
1. Go to RevenueCat Dashboard > Project Settings > Integrations > Webhooks
2. Add endpoint: `https://soundbridge.live/api/webhooks/subscription`
3. Select all subscription events
4. Copy authorization header and add to `REVENUECAT_WEBHOOK_SECRET`

---

## Testing Checklist

### Database Functions

- [ ] `check_upload_limit()` returns correct values for Free/Premium/Unlimited
- [ ] `increment_upload_count()` increments both counters
- [ ] `reset_monthly_uploads()` resets Premium users correctly
- [ ] `can_change_custom_username()` enforces tier and 90-day limit
- [ ] `update_custom_username()` validates and updates username
- [ ] `increment_play_count()` updates play_count atomically

### API Endpoints

- [ ] `/api/analytics/stream-event` logs events correctly
- [ ] `/api/analytics/advanced` returns data for Premium/Unlimited, 403 for Free
- [ ] `/api/upload/check-limit` returns correct upload status
- [ ] `/api/profile/custom-username` (GET) checks eligibility
- [ ] `/api/profile/custom-username` (POST) updates username
- [ ] `/api/profile/custom-username` (PUT) checks availability
- [ ] `/api/webhooks/subscription` handles RevenueCat events
- [ ] `/api/webhooks/subscription` handles Stripe events

### Cron Jobs

- [ ] `/api/cron/subscription-management` resets upload counters
- [ ] `/api/cron/subscription-management` expires subscriptions
- [ ] `/api/cron/subscription-management` resets featured counters
- [ ] `/api/cron/subscription-management` rotates featured artists
- [ ] `/api/cron/collaboration-matching` finds matches with correct algorithm

### Audio Player

- [ ] Stream events logged on play/pause/end
- [ ] Device and platform detected correctly
- [ ] Referrer tracking works (direct, social, search)
- [ ] UTM parameters captured
- [ ] Engagement tracking (like, share, follow, tip, ticket)
- [ ] Only logs if listened 3+ seconds

### Advanced Analytics Component

- [ ] Shows upgrade prompt for Free users
- [ ] Displays full analytics for Premium/Unlimited
- [ ] Period selector works
- [ ] All charts render correctly

---

## Stripe Product Configuration

Justice needs to create these products in Stripe Dashboard:

### Products to Create

1. **SoundBridge Premium Monthly**
   - Product Name: "SoundBridge Premium"
   - Price: £6.99 GBP
   - Billing Period: Monthly
   - Type: Recurring
   - Copy Product ID: `prod_xxxxx`

2. **SoundBridge Premium Annual**
   - Product Name: "SoundBridge Premium Annual"
   - Price: £69.99 GBP
   - Billing Period: Yearly
   - Type: Recurring
   - Copy Product ID: `prod_xxxxx`

3. **SoundBridge Unlimited Monthly**
   - Product Name: "SoundBridge Unlimited"
   - Price: £12.99 GBP
   - Billing Period: Monthly
   - Type: Recurring
   - Copy Product ID: `prod_xxxxx`

4. **SoundBridge Unlimited Annual**
   - Product Name: "SoundBridge Unlimited Annual"
   - Price: £129.99 GBP
   - Billing Period: Yearly
   - Type: Recurring
   - Copy Product ID: `prod_xxxxx`

After creating, provide the Product IDs as environment variables.

---

## Next Steps (Not Implemented Yet)

The following features are mentioned in the specification but not yet implemented:

1. **Email Notifications**
   - Welcome email (new subscription)
   - Renewal confirmation
   - Cancellation confirmation
   - Expiration warning (7 days before)
   - Expiration notice
   - Payment failed
   - Upload limit reminder (6 of 7 used)
   - Upload limit reset
   - Featured notification
   - Collaboration matches (weekly)

   **Recommendation:** Use Resend, SendGrid, or similar email service

2. **Web UI Components**
   - Pricing page (/pricing route)
   - Subscription management in settings
   - Upload counter in upload page
   - Tier badges throughout app
   - Upgrade prompts/modals
   - Featured section on Discover page

3. **Feed Priority Algorithm**
   - Boost Premium posts by 30-50%
   - Boost Unlimited posts by 50-80%
   - Implementation in feed ranking

4. **Future Features (marked "Coming Soon")**
   - API access (Unlimited)
   - White-label profile (Unlimited)
   - Dedicated account manager (Unlimited)
   - Social media post generator (Unlimited)
   - Custom promo codes (Unlimited)
   - Email list export (Unlimited)

---

## Summary

✅ **Completed:**
- Database schema for subscriptions and stream events
- Webhook handler for RevenueCat/Stripe
- Upload limit enforcement
- Custom username management
- Advanced analytics API
- Stream event tracking in audio player
- Background jobs (cron) for tier management
- Collaboration matching algorithm
- Advanced analytics React component

📋 **Pending (Your Responsibilities):**
- Create Stripe products and provide Product IDs
- Set up App Store Connect and Google Play Console
- Configure RevenueCat offerings
- Set environment variables
- Deploy code
- Configure webhooks
- Set up cron jobs

📱 **Mobile Team:**
- Follow `MOBILE_IMPLEMENTATION_GUIDE.md`
- Integrate new product IDs
- Implement tier-based features
- Test all flows

**All backend code is ready for deployment. No further development needed from backend team until UI/email implementations begin.**

