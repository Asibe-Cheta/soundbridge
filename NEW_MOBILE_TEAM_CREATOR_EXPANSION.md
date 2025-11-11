# Creator Type Expansion – Backend Coordination Request

**To:** Web App Team  
**From:** Mobile App Team  
**Date:** November 9, 2025

---

## 1. Background & Goals

We are preparing the SoundBridge mobile app to support the upcoming "Creator Type Expansion & Discovery Enhancement" initiative. The mobile client currently consumes data from Supabase tables founded by the web platform (`profiles`, `audio_tracks`, `events`, `creator_availability`, `tip_analytics`, etc.). Before we touch the app code, we need to make sure the mobile data layer will stay in lockstep with the canonical schema, endpoints, and business rules that the web app team stewards.

The proposed enhancements include:

- Allowing each user to hold **multiple creator types** simultaneously (beyond the existing musician/event organizer roles).
- Introducing **service provider profiles** with offerings, rates, portfolios, availability, and reviews.
- Upgrading the **Discover** and **Search** experiences to surface mixed content (tracks, events, services, venues) with filter pills.
- Preparing for later phases (venues, gear marketplace) without blocking the current release.

To proceed safely we need your guidance on schema, APIs, enums, and auth so we can mirror your implementation exactly.

---

## 2. Decisions & Clarifications Needed

### A. Database Schema

1. **Profiles / User Metadata**  
   - Preferred approach for storing multiple creator types per user?  
     - JSON array column (e.g. `creator_types text[]`),
     - Junction table (`user_creator_types`), or
     - Boolean flags (`is_musician`, `is_dj`, ...).  
   - Please confirm column/table names, data types, and indexes you plan to use.

2. **Service Provider Data Model**  
   - Should we create a dedicated `service_provider_profiles` table?  
   - Required fields (bio, categories, rates, availability, portfolio, verification state, etc.).  
   - Expected relationships (e.g. `service_provider_portfolio_items`, `service_provider_availability`).

3. **Venue Support (Phase 2)**  
   - Anticipated tables (`venues`, `venue_owner_profiles`?) and key columns so mobile can plan ahead.

4. **Reviews & Ratings**  
   - Is there an existing table we should reuse?  
   - Target schema (reviewer, reviewee, rating, comment, service reference, timestamps, moderation flags).

5. **Migrations / Defaults**  
   - How will we migrate existing creators? (e.g. default all current creators to `musician`.)  
   - Handling of current event organizers and any legacy fields.

### B. API Routes & Contracts

Please confirm or provide documentation for the following endpoints (URL, method, request/response payloads, auth scopes):

- **Creator type management**
  - `GET /api/users/{userId}/creator-types`
  - `POST /api/users/{userId}/creator-types`
  - `PATCH /api/users/{userId}/creator-types`
  - `DELETE /api/users/{userId}/creator-types/{type}`

- **Service provider lifecycle**
  - `GET /api/service-providers/{userId}`
  - `POST /api/service-providers`
  - `PATCH /api/service-providers/{userId}`
  - Portfolio CRUD (`/portfolio`), availability (`/availability`), bookings (`/bookings`).

- **Discovery & Search**
  - `GET /api/discover?category={all|music|events|services|venues}&limit=n`
  - `GET /api/search?query=...&type={all|music|events|services|venues}`

- **Reviews**
  - `GET /api/reviews/{providerId}`
  - `POST /api/reviews`
  - `PATCH /api/reviews/{reviewId}`
  - `DELETE /api/reviews/{reviewId}`

If you intend to reuse existing endpoints, please note any required payload changes or new query parameters.

### C. Data Models & Enums

Kindly share the finalized definitions (TypeScript, SQL, or Supabase generated types) for:

- `CreatorType` enum (current draft: `musician`, `podcaster`, `dj`, `event_organizer`, `service_provider`, `venue_owner`).
- `ServiceCategory` enum or lookup table (draft set includes: `sound_engineering`, `music_lessons`, `mixing_mastering`, `session_musician`, `photography`, `videography`, …).
- `ServiceProviderProfile` interface including structure for rates, portfolio entries, availability payload, rating aggregates, verification flags, and timestamps.
- `DiscoverItem` union type covering tracks, events, service providers, and future venues (discriminator field, shared fields, etc.).

### D. Authorization & Workflow Rules

1. Who can modify creator types—any authenticated user, only verified creators, or admin-only?  
2. Does a service provider require manual approval before appearing in discovery/search?  
3. Can listeners (non-creators) submit bookings or reviews, or is creator status required?  
4. Are there role-based restrictions we should enforce client-side (e.g. `service_provider` cannot remove their last required field)?

### E. Integration with Existing Systems

- **Notifications:** Should new booking/review/availability alerts plug into the current notification tables/topics? Any new event types we should anticipate?
- **Payments:** We currently integrate with Stripe for tipping. How should service bookings connect with existing payment flows (one-off charges, escrow, hold-over)?
- **Search/Indexing:** Will service providers and venues be indexed via existing search materialized views/functions, or will new views/functions be provided?

### F. Timeline & Deliverables

- Requested response within **3–5 business days** so we can scope mobile work for the next sprint.  
- We will **not** begin implementation until we receive:
  - ✅ Confirmed database schema & migration plan  
  - ✅ Endpoint specs & auth requirements  
  - ✅ Type definitions/enums  
  - ✅ Clarification on workflows (approval, notifications, payments)

Once we have your direction we will:

1. Mirror the agreed schema/enums in the mobile type system.  
2. Add or update API service modules for the new endpoints.  
3. Implement the UI/UX (mobile-optimized) following the shared data contracts.  
4. Coordinate QA to validate cross-platform consistency.

---

## 3. Supporting Context (Mobile State Today)

- Mobile currently assumes a single primary creator type derived from `profiles.tier` and displays music + events. No service provider artifacts exist yet.
- Discovery and search screens consume the `discover_feed_v1` and `search_content_v1` helpers provided previously; we will update those integrations once we know the new backend contracts.
- Authentication flows rely on Supabase session cookies plus REST endpoints proxied via `https://app.soundbridge.fm`. Any changes to auth strategy (e.g. additional scopes or RLS policies) must be flagged so we can adjust our `apiClient`.

---

## 4. Next Steps

Please reply with the requested details or point us to updated documentation/specs. If workshops or slack threads would accelerate alignment, we’re happy to schedule them.

Thank you for keeping the data layer cohesive across platforms!

— Mobile App Team
