# Creator Expansion Follow-Up Response – Mobile Implementation Guide

**To:** Mobile App Team  
**From:** Web Platform Team  
**Date:** November 12, 2025  
**Re:** Response to `CREATOR_EXPANSION_FOLLOWUP.md`

---

## 1. Executive Summary

All requested endpoints are **production-ready** and available for mobile consumption. The "Become a Service Provider" flow is now fully implemented with a dedicated route. Below are the complete details for each mobile team request.

---

## 2. A. Become a Service Provider – Entry Point ✅

### Route Details

**Endpoint:** `POST /api/users/{userId}/creator-types`  
**Authentication:** Required (Bearer token or session cookie)  
**Authorization:** User must match `{userId}` in URL

### Request Payload

```json
{
  "creatorTypes": ["service_provider", "musician", ...]
}
```

**Notes:**
- `creatorTypes` is an **array of strings** representing the **complete set** of creator types for the user
- The endpoint performs a **full replacement** (not additive) — include all existing types plus `service_provider`
- Valid types: `musician`, `podcaster`, `dj`, `event_organizer`, `service_provider`, `venue_owner`

### Response

**Success (200):**
```json
{
  "success": true,
  "creatorTypes": ["service_provider", "musician"]
}
```

**Error Responses:**
- `400`: Invalid creator type, missing array, or validation failure
- `401`: Authentication required
- `403`: User ID mismatch
- `500`: Database error

### Implementation Notes

1. **First-time provider:** When `service_provider` is added, the backend automatically creates a `service_provider_profiles` record with:
   - `status: 'pending_review'`
   - `is_verified: false`
   - Display name seeded from user's profile (`display_name`, `full_name`, or `username`)
   - Empty categories, null rates

2. **Removal guardrails:** Users cannot remove `service_provider` if:
   - Profile status is `active`
   - Active service offerings exist

3. **Mobile flow recommendation:**
   ```
   1. GET /api/users/{userId}/creator-types → Check if already has service_provider
   2. If not, POST with existing types + "service_provider"
   3. Redirect to service provider onboarding/profile setup
   ```

### New Dedicated Route

We've also created a dedicated onboarding page at `/become-service-provider` that:
- Checks if user already has `service_provider` type
- Provides a UI to add the creator type
- Redirects to dashboard after success

**Mobile can link to:** `/become-service-provider` (web) or implement the API flow directly.

---

## 3. B. Service Provider Profile Management ✅

### Endpoints Available

All endpoints are **production-ready** and match the documentation in `MOBILE_TEAM_CREATOR_EXPANSION_RESPONSE.md`.

#### Profile CRUD

**Create/Update Profile:** `POST /api/service-providers`  
**Get Profile:** `GET /api/service-providers/{userId}?include=offerings,portfolio,availability,reviews`  
**Update Profile:** `PATCH /api/service-providers/{userId}` (via POST with upsert)

**Request Payload (POST):**
```json
{
  "displayName": "John's Audio Services",  // Required
  "headline": "Professional Sound Engineer",  // Optional
  "bio": "10+ years of experience...",  // Optional
  "categories": ["sound_engineering", "mixing_mastering"],  // Optional array
  "defaultRate": 150.00,  // Optional number
  "rateCurrency": "USD"  // Optional, must be valid currency code
}
```

**Validation Rules:**
- `displayName`: Required, non-empty string
- `categories`: Array of valid service categories (see `SERVICE_CATEGORIES` constant)
- `rateCurrency`: Must be in `SUPPORTED_CURRENCIES` list
- `defaultRate`: Optional numeric value

**Required Fields:** Only `displayName` is strictly required. All others are optional.

#### Offerings Management

**List/Create:** `POST /api/service-providers/{userId}/offerings`  
**Update:** `PATCH /api/service-providers/{userId}/offerings/{offeringId}`  
**Delete:** `DELETE /api/service-providers/{userId}/offerings/{offeringId}`

**Request Payload (POST):**
```json
{
  "title": "Mixing & Mastering",  // Required
  "category": "mixing_mastering",  // Required, valid category
  "rate_amount": 200.00,  // Required number
  "rate_currency": "USD",  // Required, valid currency
  "rate_unit": "per_track",  // Required: "per_hour", "per_track", "per_project", "fixed"
  "is_active": true  // Optional boolean, defaults to true
}
```

#### Portfolio Management

**Add Item:** `POST /api/service-providers/{userId}/portfolio`  
**Delete Item:** `DELETE /api/service-providers/{userId}/portfolio/{itemId}`

**Request Payload (POST):**
```json
{
  "media_url": "https://storage.supabase.co/...",  // Required, full URL
  "thumbnail_url": "https://storage.supabase.co/...",  // Optional
  "caption": "Studio setup",  // Optional
  "display_order": 1  // Optional number for sorting
}
```

**File Upload:** Use existing storage API (`/api/storage/upload`) to get `media_url` first, then POST to portfolio endpoint.

#### Availability Management

**Add Slot:** `POST /api/service-providers/{userId}/availability`  
**Delete Slot:** `DELETE /api/service-providers/{userId}/availability/{availabilityId}`

**Request Payload (POST):**
```json
{
  "start_time": "2025-11-15T09:00:00Z",  // Required ISO 8601 datetime
  "end_time": "2025-11-15T17:00:00Z",  // Required ISO 8601 datetime
  "recurrence": "weekly",  // Optional: "none", "daily", "weekly", "monthly"
  "is_bookable": true  // Optional boolean, defaults to true
}
```

### Example Payload Templates

**Minimal Profile:**
```json
{
  "displayName": "My Service Business"
}
```

**Complete Profile:**
```json
{
  "displayName": "Professional Audio Services",
  "headline": "Award-winning sound engineer",
  "bio": "Specializing in mixing and mastering for indie artists...",
  "categories": ["sound_engineering", "mixing_mastering"],
  "defaultRate": 150.00,
  "rateCurrency": "USD"
}
```

---

## 4. C. Verification Workflow & Badges ✅

### Endpoints

**Status Check:** `GET /api/service-providers/{userId}/verification/status`  
**Submit Request:** `POST /api/service-providers/{userId}/verification/request`  
**Badge Insights:** `GET /api/service-providers/{userId}/badges`  
**Update Trust Settings:** `PATCH /api/service-providers/{userId}/badges`

### Verification Status Response

```json
{
  "status": {
    "prerequisites": {
      "profileComplete": true,
      "hasOfferings": true,
      "hasPortfolio": false,
      "hasBookings": false,
      "hasRating": false,
      "stripeConnectReady": false
    },
    "latestRequest": {
      "id": "req_123",
      "status": "pending",
      "submitted_at": "2025-11-10T10:00:00Z",
      "reviewed_at": null
    },
    "badges": {
      "currentTier": "new_provider",
      "badgeUpdatedAt": "2025-11-01T00:00:00Z"
    }
  }
}
```

### Submit Verification Request

**Request Payload:**
```json
{
  "governmentIdUrl": "https://storage.supabase.co/...",  // Required
  "selfieUrl": "https://storage.supabase.co/...",  // Required
  "businessDocUrl": "https://storage.supabase.co/...",  // Optional
  "notes": "Additional information..."  // Optional
}
```

**Prerequisites Validation:**
- Profile must have `displayName`, `headline`, `bio`
- At least one active offering
- At least one portfolio item
- At least one completed booking
- Average rating >= 3.0
- Stripe Connect account linked and enabled

**Status Transitions:**
- `pending` → Admin reviews → `approved` or `rejected`
- On approval: `is_verified: true`, `verification_status: 'verified'`
- On rejection: `verification_status: 'rejected'`, reason stored

### Badge System

**Badge Tiers:**
- `new_provider`: Default (0 completed bookings)
- `rising_star`: 3+ completed bookings, rating >= 4.5
- `established`: 10+ completed bookings, rating >= 4.0
- `top_rated`: 25+ completed bookings, rating >= 4.8

**Badge Response:**
```json
{
  "currentTier": "rising_star",
  "progress": {
    "completedBookings": 5,
    "averageRating": 4.7,
    "nextBadge": {
      "tier": "established",
      "requiredBookings": 10,
      "requiredRating": 4.0
    }
  },
  "trustSettings": {
    "showPaymentProtection": true,
    "firstBookingDiscountEnabled": false,
    "firstBookingDiscountPercent": 0
  },
  "history": [...]
}
```

**Update Trust Settings (PATCH):**
```json
{
  "showPaymentProtection": true,
  "firstBookingDiscountEnabled": true,
  "firstBookingDiscountPercent": 10  // 0-50, only applies to first booking
}
```

---

## 5. D. Booking & Payments (Consumer + Provider) ✅

### Consumer: Create Booking

**Endpoint:** `POST /api/bookings`

**Request Payload:**
```json
{
  "providerId": "uuid-here",
  "serviceOfferingId": "offering-uuid",  // Optional if custom booking
  "venueId": "venue-uuid",  // Optional
  "scheduledStart": "2025-12-01T14:00:00Z",  // Required ISO 8601
  "scheduledEnd": "2025-12-01T18:00:00Z",  // Required ISO 8601
  "timezone": "America/New_York",  // Optional, defaults to UTC
  "totalAmount": 200.00,  // Required number
  "currency": "USD",  // Required, valid currency code
  "bookingNotes": "Need mixing for 5 tracks",  // Optional
  "bookingType": "service"  // Required: "service" or "venue"
}
```

**Response:**
```json
{
  "booking": {
    "id": "booking-uuid",
    "status": "pending",
    "provider_id": "...",
    "booker_id": "...",
    "total_amount": 200.00,
    "currency": "USD",
    "platform_fee": 20.00,
    "provider_payout": 180.00,
    ...
  }
}
```

### Payment Intent (Stripe PaymentSheet)

**Endpoint:** `POST /api/bookings/{bookingId}/payment-intent`

**Prerequisites:**
- Booking status must be `confirmed_awaiting_payment`
- Provider must have Stripe Connect account linked and enabled

**Response:**
```json
{
  "paymentIntentId": "pi_...",
  "clientSecret": "pi_..._secret_...",
  "status": "requires_payment_method"
}
```

**Mobile Integration:**
1. Call this endpoint to get `clientSecret`
2. Use Stripe PaymentSheet SDK with `clientSecret`
3. On payment success, call `/api/bookings/{bookingId}/confirm-payment` (webhook also handles this)

**Metadata:** The payment intent includes metadata:
- `bookingId`: Booking UUID
- `providerId`: Provider user ID
- `bookerId`: Booker user ID

### Provider: Manage Bookings

**List Bookings:** `GET /api/service-providers/{userId}/bookings`

**Response includes:**
- Full booking details
- Booker profile (id, display_name, username, avatar_url)
- Offering details (if applicable)
- Venue details (if applicable)

**Status Transitions:** `PATCH /api/service-providers/{userId}/bookings?bookingId={bookingId}`

**Request Payload:**
```json
{
  "status": "confirmed_awaiting_payment",  // Required: valid BookingStatus
  "notes": "Confirmed, ready for payment"  // Optional
}
```

**Valid Status Transitions:**
- `pending` → `confirmed_awaiting_payment` | `cancelled`
- `confirmed_awaiting_payment` → `paid` | `cancelled`
- `paid` → `completed` | `disputed`
- `completed` → (final)
- `cancelled` → (final)
- `disputed` → (final)

**Provider Actions:**
- **Confirm:** Set status to `confirmed_awaiting_payment` (triggers notification to booker)
- **Decline:** Set status to `cancelled` with notes
- **Complete:** Set status to `completed` (after service delivery)

**Booking Ledger & Notifications:**
- All status changes are logged in `booking_activity` table
- Notifications are queued via `BookingNotificationService` → SendGrid
- Mobile should poll booking status or use webhooks (if implemented)
- Recommended poll interval: 5-10 seconds during active booking flows

---

## 6. E. Recommendations & Search Details ✅

### Discovery Endpoints

**Services Tab:** `GET /api/discover?tab=services`

**Response:**
```json
{
  "services": [
    {
      "user_id": "uuid",
      "display_name": "Provider Name",
      "headline": "Professional...",
      "badge_tier": "rising_star",
      "average_rating": 4.7,
      "review_count": 12,
      "categories": ["sound_engineering"],
      "price_band": "150-200",
      "is_verified": true,
      "show_payment_protection": true
    }
  ]
}
```

**Search:** `GET /api/search?query=audio+mixing`

**Response:**
```json
{
  "results": [
    {
      "type": "service",
      "id": "uuid",
      "display_name": "...",
      "badge_tier": "...",
      ...
    },
    {
      "type": "track",
      "id": "uuid",
      "title": "...",
      ...
    }
  ]
}
```

### Additional Filters (Future)

Currently, discovery/search supports:
- `tab`: Filter by content type (`services`, `music`, `events`, etc.)
- `query`: Search term

**Planned enhancements:**
- `category`: Filter services by category
- `minRating`: Minimum average rating
- `priceRange`: Price band filter
- `verifiedOnly`: Boolean flag
- `badgeTier`: Filter by badge tier
- Pagination: `page`, `limit` (currently returns all results)

We'll notify mobile team when these filters are available.

---

## 7. Outstanding Backend Work

### ✅ Complete
- All core endpoints are production-ready
- Creator type management
- Service provider CRUD
- Booking lifecycle
- Payment integration
- Verification workflow
- Badge system

### 🔄 In Progress / Planned
- **Webhooks for booking status changes** (Phase 7) — Currently mobile should poll
- **Dispute resolution UI** (Phase 7) — Admin-only for now
- **Advanced search filters** — See section 6E above
- **Real-time notifications** — WebSocket support planned

**None of these block the mobile roadmap.** Mobile can proceed with polling and existing endpoints.

---

## 8. Next Steps for Mobile Team

### Recommended Implementation Order

1. **Creator Type Management**
   - Implement `GET /api/users/{userId}/creator-types`
   - Implement `POST /api/users/{userId}/creator-types` for "Become a Service Provider"
   - Add UI toggle in profile settings

2. **Service Provider Profile**
   - Create profile management UI
   - Implement offerings CRUD
   - Implement portfolio management
   - Implement availability slots

3. **Verification Flow**
   - Build verification status UI
   - Implement document upload → verification request
   - Show badge insights and progress

4. **Booking Flow (Consumer)**
   - Service provider discovery/search
   - Booking request form
   - Payment integration with Stripe PaymentSheet
   - Booking status tracking

5. **Booking Management (Provider)**
   - Booking list/dashboard
   - Status transition UI (confirm/decline/complete)
   - Revenue tracking

### Testing Checklist

- [ ] Creator type add/remove works
- [ ] Service provider profile creation/update
- [ ] Offerings CRUD operations
- [ ] Portfolio item upload/delete
- [ ] Availability slot creation/deletion
- [ ] Verification request submission
- [ ] Booking creation as consumer
- [ ] Payment intent retrieval and PaymentSheet integration
- [ ] Provider booking status transitions
- [ ] Badge tier progression

---

## 9. Support & Questions

If you encounter any issues or need clarification:
- Check `MOBILE_TEAM_CREATOR_EXPANSION_RESPONSE.md` for schema details
- Review API route files in `apps/web/app/api/`
- Contact web team via Slack/email for urgent issues

**All endpoints are CORS-enabled** and ready for mobile consumption.

---

## 10. Additional Updates & Optimizations (November 12, 2025)

### 10.1 Service Provider Discovery Optimization ✅

**Trending Algorithm Implementation:**
- Enhanced trending algorithm for service providers with weighted scoring:
  - **Completed Bookings (40%)**: Providers with more completed bookings rank higher
  - **Average Rating (30%)**: Higher-rated providers get better placement
  - **Verification Status (15%)**: Verified providers receive boost
  - **Recency (15%)**: Recently updated profiles prioritized
  - **Review Bonus**: Additional boost for providers with 20+ reviews

**Homepage Integration:**
- Added "Find Services" card to homepage Quick Actions section
- Service providers now appear in trending content alongside music and events
- Improved visibility and discoverability

**Search & Filtering:**
- Service providers included in global search results
- Sorting options: Trending, Latest, Popular (by review count)
- Category filtering available in search

### 10.2 Dashboard Integration ✅

**"Become a Service Provider" Card:**
- Added conditional card in dashboard overview section
- Only displays for users who don't already have `service_provider` creator type
- Links to `/become-service-provider` onboarding page
- Styled with orange/pink gradient to match service provider theme

**Service Provider Tab:**
- Integrated into main `/dashboard` page (not separate dashboard)
- Accessible via "Service Provider" tab in dashboard navigation
- Full `ServiceProviderDashboard` component available once creator type is added

### 10.3 Portfolio & Video Showcase Enhancement ✅

**Video Embedding Support:**
- Created `PortfolioItem` component with video detection
- Automatically detects YouTube and Vimeo URLs
- Converts video URLs to embed format
- Displays embedded video player in modal overlay
- Thumbnail preview with play button overlay for videos
- Maintains backward compatibility with image portfolio items

**Video Platforms Supported:**
- **YouTube**: Detects `youtube.com`, `youtu.be` URLs, converts to embed
- **Vimeo**: Detects `vimeo.com` URLs, converts to embed
- **Other URLs**: Falls back to external link behavior

**User Experience:**
- Click video thumbnail → Opens modal with embedded player
- Click image → Opens in new tab (existing behavior)
- Visual indicators distinguish videos from images
- Responsive modal design for mobile and desktop

### 10.4 Reviews & Ratings System Status ✅

**Confirmed Working:**
- Review submission endpoint: `POST /api/reviews`
- Automatic rating updates via database trigger `trg_refresh_service_provider_rating`
- Reviews update `average_rating` and `review_count` in real-time
- Only `published` reviews count toward ratings
- Review status workflow: `pending` → `published` → (optional) `flagged`/`removed`

**Review Features:**
- Customers can submit reviews after booking completion
- Rating scale: 1-5 stars
- Optional title and comment fields
- Can link reviews to specific bookings via `booking_reference`
- Reviewers can edit/delete their own reviews
- Providers can view all reviews on their profile

### 10.5 Offerings Management ✅

**Deletion Confirmed:**
- **Endpoint**: `DELETE /api/service-providers/{userId}/offerings/{offeringId}`
- Fully functional and tested
- Authorization: Only provider can delete their own offerings
- Guard rails: Cannot remove `service_provider` creator type if active offerings exist

**CRUD Operations:**
- ✅ Create: `POST /api/service-providers/{userId}/offerings`
- ✅ Read: `GET /api/service-providers/{userId}/offerings`
- ✅ Update: `PATCH /api/service-providers/{userId}/offerings/{offeringId}`
- ✅ Delete: `DELETE /api/service-providers/{userId}/offerings/{offeringId}`

---

## 11. Summary of All Improvements

### ✅ Completed Optimizations

1. **Trending Algorithm**: Multi-factor scoring system for service provider discovery
2. **Homepage Integration**: Service providers visible in Quick Actions and trending sections
3. **Dashboard Card**: "Become a Service Provider" card for non-providers
4. **Video Embedding**: YouTube/Vimeo support in portfolio showcase
5. **Search Enhancement**: Service providers included in global search with filtering

### 📋 Verified Functionality

- ✅ Offerings can be deleted
- ✅ Reviews/ratings system fully operational with automatic updates
- ✅ Service provider dashboard integrated into main dashboard
- ✅ Portfolio supports both images and videos (with embedding)
- ✅ Creator type management working (add/remove `service_provider`)

### 🎯 Mobile Implementation Notes

**For Video Portfolio Items:**
- Mobile should detect video URLs (YouTube/Vimeo patterns)
- Use platform-specific embed URLs:
  - YouTube: `https://www.youtube.com/embed/{videoId}`
  - Vimeo: `https://player.vimeo.com/video/{videoId}`
- Display thumbnail with play button overlay
- Open embedded player in modal/fullscreen on tap

**For Trending Algorithm:**
- Mobile can use the same scoring weights when implementing local sorting
- Consider caching trending scores for performance
- Refresh scores periodically (recommended: every 5-10 minutes)

**For Dashboard Integration:**
- Check user's creator types before showing "Become a Service Provider" prompt
- Use same conditional logic: `if (!creatorTypes.includes('service_provider'))`

---

**Status:** ✅ All Optimizations Complete  
**Last Updated:** November 12, 2025


