## Web Team Response – Creator Type Expansion & Discovery Enhancements

**Date:** November 10, 2025  
**To:** Mobile App Team  
**From:** Web App Team  
**Status:** Draft – pending your feedback before implementation

---

### 1. Overview

We propose a phased rollout that introduces multi-creator support, service provider profiles, extended discovery/search, and review mechanics while keeping compatibility with existing Supabase schema and APIs. Nothing below is live yet; this is the contract we intend to build unless we receive blocking feedback.

---

### 2. Database Design (Phase 1 scope)

| Area | Proposed tables / columns | Notes |
| --- | --- | --- |
| Creator types | `user_creator_types`<br>• `user_id UUID` (FK → `profiles.id`)<br>• `creator_type text` (enum-like)<br>• `created_at timestamptz` | Composite PK `(user_id, creator_type)`. RLS: users manage their own records; admin full access. |
| Service providers | `service_provider_profiles`<br>• `user_id UUID` (PK/FK)<br>• `display_name text`<br>• `headline text`<br>• `bio text`<br>• `categories text[]` (from `ServiceCategory` enum)<br>• `default_rate numeric(10,2)`<br>• `rate_currency text`<br>• `is_verified boolean`<br>• `status text` (`draft`, `pending_review`, `active`, `suspended`)<br>• `average_rating numeric(3,2)`<br>• `review_count integer`<br>• `created_at`, `updated_at` | Mirrors creator profile info; rate metadata optional. `status` drives visibility in discovery. |
| Service offerings | `service_offerings`<br>• `id UUID`<br>• `provider_id UUID` (FK → `service_provider_profiles.user_id`)<br>• `title text`<br>• `category text`<br>• `description text`<br>• `rate_amount numeric(10,2)`<br>• `rate_currency text`<br>• `rate_unit text` (`hour`, `project`, `session`, etc.)<br>• `is_active boolean`<br>• `created_at`, `updated_at` | Separate offerings so providers can list multiple services. |
| Portfolio | `service_portfolio_items`<br>• `id UUID`<br>• `provider_id UUID`<br>• `media_url text`<br>• `thumbnail_url text`<br>• `caption text`<br>• `display_order integer`<br>• `created_at` | Media stored via existing storage buckets; enforce max count via application rules. |
| Availability | `service_provider_availability`<br>• `id UUID`<br>• `provider_id UUID`<br>• `start_time timestamptz`<br>• `end_time timestamptz`<br>• `is_recurring boolean`<br>• `recurrence_rule text` (RFC 5545 string, nullable)<br>• `is_bookable boolean`<br>• `created_at` | We reuse existing `creator_availability` logic where possible but keep separation for service offerings. |
| Reviews | `service_reviews`<br>• `id UUID`<br>• `provider_id UUID`<br>• `reviewer_id UUID`<br>• `rating smallint` (1–5)<br>• `title text`<br>• `comment text`<br>• `booking_reference UUID` (nullable)<br>• `status text` (`published`, `pending`, `flagged`, `removed`)<br>• `created_at`, `updated_at` | Aggregate triggers update `service_provider_profiles.average_rating` / `review_count`. |
| Venues (Phase 2 placeholder) | `venues` (draft)<br>• `id UUID`<br>• `owner_id UUID`<br>• `name text`<br>• `description text`<br>• `address jsonb` (line1, line2, city, state, postal_code, country)<br>• `capacity integer`<br>• `amenities text[]`<br>• `primary_contact jsonb`<br>• `status text` (`draft`, `active`, `archived`)<br>• `created_at`, `updated_at` | We will create empty migrations but gate writes/reads behind a feature flag. No mobile consumption yet. |

**Migrations / Backfill**

- Add `user_creator_types` with seed data: for every profile where `role = 'creator'` add `creator_type = 'musician'`; where legacy organizer flag exists (via events created) add `creator_type = 'event_organizer'`.  
- Introduce Postgres enum `creator_type_enum` for safety (`musician`, `podcaster`, `dj`, `event_organizer`, `service_provider`, `venue_owner`).  
- Add `service_category_enum` for `service_offerings.category` and `service_provider_profiles.categories`. Draft set: `sound_engineering`, `music_lessons`, `mixing_mastering`, `session_musician`, `photography`, `videography`, `lighting`, `event_management`, `other`.
- Create RLS policies mirroring `profiles`: owners manage their own rows, admins bypass via service role. Reviews allow providers to read reviews against them and reviewers to manage their submissions.

---

### 3. API Contracts (Phase 1)

All routes will live under `apps/web/app/api`. Authentication: Supabase JWT or session cookie; we will reuse the bearer-token helper we deployed for tipping.

| Route | Method | Request | Response | Notes |
| --- | --- | --- | --- | --- |
| `/api/users/{userId}/creator-types` | `GET` | Authenticated user matching `{userId}` or admin | `{ creatorTypes: string[] }` | Reads from `user_creator_types`. |
| `/api/users/{userId}/creator-types` | `POST` | `{ creatorTypes: string[] }` | `{ success: true, creatorTypes: [...] }` | Replaces full set; validation against enum; adds audit log. |
| `/api/users/{userId}/creator-types/{type}` | `DELETE` | none | `{ success: true }` | Prevents removing `service_provider` while active listings exist. |
| `/api/service-providers` | `POST` | `{ displayName, headline, bio, categories, defaultRate, rateCurrency }` | `{ provider: ServiceProviderProfile }` | Creates profile + optional offerings. |
| `/api/service-providers/{userId}` | `GET` | Query params `include=offerings,portfolio,availability,reviews` | `{ provider, offerings?, portfolioItems?, availability?, reviews? }` | Lazy-load sections to control payload size. |
| `/api/service-providers/{userId}` | `PATCH` | Partial profile payload | `{ provider: ... }` | Writes to `service_provider_profiles`. |
| `/api/service-providers/{userId}/offerings` | `POST/GET/PATCH/DELETE` | Standard CRUD | Standard 200/204 responses | Offerings list includes rate unit. |
| `/api/service-providers/{userId}/portfolio` | `POST/DELETE` | Upload metadata; assets handled via existing storage API | | |
| `/api/service-providers/{userId}/availability` | `POST/DELETE` | Slots payload (`start_time`, `end_time`, recurrence) | | Shares validation with collaboration availability. |
| `/api/reviews` | `POST` | `{ providerId, rating, title?, comment, bookingReference? }` | `{ review: ... }` | Requires authenticated listener/creator who booked. |
| `/api/reviews/{reviewId}` | `PATCH`/`DELETE` | | | Provider can respond (follow-up route TBD). |
| `/api/reviews/{providerId}` | `GET` | Pagination params | `{ reviews: [...], pagination }` | Public read; only published reviews returned. |
| `/api/discover` | `GET` | `category=all|music|events|services|venues`, `limit`, `cursor?`, `filters?` | `{ items: DiscoverItem[], nextCursor? }` | Services branch returns provider summaries + top offering. |
| `/api/search` | `GET` | `query`, optional `type` filter | `{ tracks: [], events: [], services: [], venues: [] }` or typed union | Backed by updated materialized views. |

*We will version endpoints if we need to break compatibility (`/api/service-providers/v1`).*

---

### 4. Shared Type Definitions

We will extend `apps/web/src/lib/types.ts` with:

```ts
export type CreatorType =
  | 'musician'
  | 'podcaster'
  | 'dj'
  | 'event_organizer'
  | 'service_provider'
  | 'venue_owner';

export type ServiceCategory =
  | 'sound_engineering'
  | 'music_lessons'
  | 'mixing_mastering'
  | 'session_musician'
  | 'photography'
  | 'videography'
  | 'lighting'
  | 'event_management'
  | 'other';

export interface ServiceProviderProfile {
  userId: string;
  displayName: string;
  headline?: string;
  bio?: string;
  categories: ServiceCategory[];
  defaultRate?: number;
  rateCurrency?: CurrencyType;
  status: 'draft' | 'pending_review' | 'active' | 'suspended';
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export type DiscoverItem =
  | { type: 'track'; track: TrackSummary }
  | { type: 'event'; event: EventSummary }
  | { type: 'service'; provider: ServiceProviderSummary }
  | { type: 'venue'; venue: VenueSummary };
```

Mobile can mirror these once confirmed.

---

### 5. Authorization & Workflow Rules

1. **Creator type management** – users manage their own types; `service_provider` and `venue_owner` insertions require profile completeness and auto-create a record in `service_provider_profiles` / `venues` with `status = 'pending_review'`. Admins can approve by switching `status` to `active`.
2. **Service provider visibility** – only `status = 'active'` and `is_verified = true` appear in discovery/search. Draft/pending entries remain hidden.
3. **Bookings & reviews** – bookings (Phase 1.5) will require authenticated listener or creator; reviews require either a completed booking or manual override flag (`allow_public_reviews`).  
4. **Notifications** – new notification types: `service_booking_request`, `service_booking_update`, `service_review_received`. We will extend `notifications.type` enum (currently string) with these values; no schema change needed.
5. **Payments** – reuse Stripe. `createServiceBooking` endpoint (Phase 2) will create PaymentIntent in `amount * 1.0` USD/NGN/GBP with optional platform fee; confirm step mirrors tipping but attaches booking metadata.

---

### 6. Search & Discovery Architecture

| Component | Plan |
| --- | --- |
| Materialized views | Add `service_search_index` (provider + offerings + categories) and `venue_search_index` (placeholder). These will be refreshed via cron or trigger. |
| Feed | Update existing `feed/personalized` route to union new items; add filters for `services` and `venues`. |
| Filtering | Query params map to SQL scopes: `category=services` filters to service providers with `status = active`. Additional filters (`location`, `rate_min`, `rate_max`, `availability_window`) follow in Phase 1.5. |

---

### 7. Timeline & Dependencies

| Week | Deliverables |
| --- | --- |
| Week of Nov 11 | Finalize schema & enums → ship migrations (behind feature flag), add shared TS types, implement `user_creator_types` endpoints. |
| Week of Nov 18 | Ship service provider CRUD + availability, extend discovery/search, add RLS policies & tests. |
| Week of Nov 25 | Implement reviews API, notification hooks, Stripe booking draft (if finance ready). |
| Phase 2 (Dec) | Venue tables + APIs, booking payment flow GA, deeper analytics dashboards. |

All changes will be rolled out behind feature flags/environment checks so we can coordinate release timing with mobile.

---

### 8. Next Steps

- Please review the schema/API plan and let us know within 3 business days if any contract changes are required.  
- Once we receive approval, we’ll begin implementing migrations and endpoints, sharing incremental PRs for visibility.  
- Mobile can start preparing type definitions and service modules based on the contracts above; we will notify you of any deviations during implementation.

Thank you! We'll stay in sync via this doc and follow-up updates as we move through each phase.

