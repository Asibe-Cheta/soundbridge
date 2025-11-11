# Creator Expansion – Final Backend Spec (Web → Mobile)

**To:** Mobile App Team  
**From:** Web Platform Team  
**Date:** November 11, 2025  

---

## 1. TL;DR

The creator-expansion work is live across schema, APIs, and business logic. Mobile can now consume the service-provider experience (offerings, bookings, verification, badges, payment trust messaging) using the contracts below. No further design unknowns on the backend.

---

## 2. Database & Schema Summary

> All tables live in the `public` schema; migrations are committed in `database/creator_expansion_schema.sql`. Supabase row-level security (RLS) is enabled everywhere.

### 2.1 Creator Types

- Lookup: `creator_type_lookup (id TEXT PRIMARY KEY)`
- Junction: `user_creator_types (user_id UUID, creator_type TEXT, created_at TIMESTAMPTZ)`
- RLS: user can read/update their own rows; service role bypass.

### 2.2 Service Provider Core

`service_provider_profiles`  
Required columns:
- `display_name`, `headline`, `bio`, `categories TEXT[]`, `default_rate NUMERIC`, `rate_currency`
- Lifecycle flags: `status` (`draft|pending_review|active|suspended`), `is_verified`
- Verification fields: `verification_status`, timestamps, reviewer metadata, `id_verified`
- Ratings snapshot: `average_rating NUMERIC(3,2)`, `review_count INTEGER` (kept in sync via trigger)
- Badge & trust: `badge_tier`, `badge_updated_at`, `completed_booking_count`, `show_payment_protection`, `first_booking_discount_enabled`, `first_booking_discount_percent`

Supporting tables:
- `service_offerings` (title, category, rate, unit, is_active)
- `service_portfolio_items` (media URL, optional thumb/caption/order)
- `service_provider_availability` (start/end, recurrence, `is_bookable`)
- `service_reviews` (rating 1–5, status, optional booking reference) + trigger `refresh_service_provider_rating`
- `provider_badge_history` (audit trail of badge transitions) + trigger `refresh_provider_badges`

### 2.3 Booking Stack (Phase 1–4)

- `service_bookings` (status lifecycle: `pending → confirmed_awaiting_payment → paid → completed`; branches to `cancelled/disputed`)
- Activity log: `booking_activity`
- Escrow ledger: `booking_ledger`
- Notifications: `booking_notifications`
- Stripe Connect accounts: `provider_connect_accounts`

Key trigger functions:
- `refresh_provider_badges(provider_id)` – recomputes badge tier, completed counts, reviews, writes history.
- `trg_refresh_service_provider_rating` – keeps `average_rating`/`review_count` in sync on review changes.
- `refresh_provider_badges` is invoked on booking status changes (insert/update/delete) and review insert/update/delete.

### 2.4 Venues (Phase 2 groundwork)

- `venues` table provisioned (owner, description, address, status). Currently dormant but ready for mobile planning.

---

## 3. API Contracts

> Routes are Next.js API handlers (`apps/web/app/api/**`). Auth is via Supabase session cookies or bearer token; see `src/lib/api-auth.ts`. Every route enforces owner/admin access using RLS-friendly queries.

### 3.1 Creator Type Management

| Action | Route | Notes |
| --- | --- | --- |
| Fetch types | `GET /api/users/[userId]/creator-types` | Returns `{ types: string[] }` |
| Replace list | `PATCH /api/users/[userId]/creator-types` | Body: `{ types: string[] }` |
| Add/remove single | `POST`/`DELETE` variants exist but PATCH is primary |

### 3.2 Service Provider Lifecycle

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/service-providers` | `POST` | Create profile (caller must have `service_provider` creator type). |
| `/api/service-providers/[userId]` | `GET` | Public fetch. Query param `include=` accepts comma list (`offerings,portfolio,availability,reviews`). Non-owners only see `status=active` profiles + published assets. |
| `/api/service-providers/[userId]` | `PATCH` | Owner-only updates. Payload matches profile fields; `isVerified` reserved for admins. |
| `/api/service-providers/[userId]/offerings` | `POST/PATCH/DELETE` | CRUD for offerings (owner). |
| `/api/service-providers/[userId]/portfolio` | `POST/DELETE` | Asset management. |
| `/api/service-providers/[userId]/availability` | `POST/DELETE` | Availability slots. |
| `/api/service-providers/[userId]/bookings` | `GET` | Provider booking list with participants, pricing, status. |
| `/api/service-providers/[userId]/bookings/[bookingId]` | `PATCH` | Status transitions (`confirm`, `decline`, `complete`). |

### 3.3 Booking Initiation & Payments

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/bookings` | `POST` | Booker creates pending request. |
| `/api/bookings/[bookingId]/status` | `PATCH` | Booker/provider cancellation/dispute flows. |
| `/api/bookings/[bookingId]/payment-intent` | `POST` | Booker obtains Stripe client secret (only when status `confirmed_awaiting_payment`). |
| `/api/bookings/[bookingId]/release` | `POST` | Post-completion payout release (admin/system). |
| `/api/bookings/[bookingId]/dispute` | `POST` | Booker initiates dispute. |

Notifications are queued through `BookingNotificationService` -> SendGrid; templates listed in `docs/sendgrid-templates.md`.

### 3.4 Verification Workflow

| Route | Method | Notes |
| --- | --- | --- |
| `/api/service-providers/[userId]/verification/status` | `GET` | Returns prerequisites (profile completeness, offerings, portfolio, bookings, rating, Stripe Connect readiness), latest request, badges. |
| `/api/service-providers/[userId]/verification/request` | `POST` | Submit docs: `{ governmentIdUrl, selfieUrl, businessDocUrl?, notes }`. Validates prerequisites before creating `pending` request. |
| `/api/admin/service-providers/verification` | `GET` | Admin list of pending requests. |
| `/api/admin/service-providers/verification/[requestId]` | `PATCH` | Admin approve/reject; updates `service_provider_profiles` flags and sends SendGrid notifications. |

### 3.5 Badges & Trust Messaging (NEW Phase 6)

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/service-providers/[userId]/badges` | `GET` | Owner-only badge insights: current tier, progress, next badge deltas, trust settings, history. |
| `/api/service-providers/[userId]/badges` | `PATCH` | Update `showPaymentProtection`, `firstBookingDiscountEnabled`, `firstBookingDiscountPercent`. Validates pct 0–50 and first-booking eligibility. |

Badge tiers: `new_provider`, `rising_star`, `established`, `top_rated`. Auto-calculated from completed bookings + rating thresholds (3/4.5, 10/–, 25/4.8).

### 3.6 Discovery & Search

Existing endpoints enhanced to include service providers:
- `GET /api/discover?tab=services` – returns curated cards with `display_name`, `badge_tier`, rating, categories, price band, trust flags.
- `GET /api/search?query=...` – union of tracks, events, services; each record contains discriminator field.
Mobile can continue consuming `discover_feed_v1`/`search_content_v1` views; we extended them to join service provider data.

### 3.7 Reviews

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/service-reviews/[providerId]` | `GET` | Published reviews for a provider (booker identity scrubbed if private). |
| `/api/service-reviews` | `POST` | Booker submits review after completion. |
| `/api/service-reviews/[reviewId]` | `PATCH/DELETE` | Owner moderation, booker edits. |

---

## 4. TypeScript Interfaces / Enums

> Source of truth: `apps/web/src/lib/types.ts`

- `CreatorType = 'musician' | 'podcaster' | 'dj' | 'event_organizer' | 'service_provider' | 'venue_owner'`
- `ServiceCategory` matches `service_category_lookup`
- `ProviderBadgeTier = 'new_provider' | 'rising_star' | 'established' | 'top_rated'`
- `ServiceProviderProfileTable` / `ServiceBookingTable` / etc. exported for direct typing.

Frontend helper types:
- `BookingStatus` = `pending | confirmed_awaiting_payment | paid | completed | cancelled | disputed`
- Verification prerequisite objects shape matches `VerificationStatusResponse` used in provider dashboard.

---

## 5. Authorization Model

| Actor | Capabilities |
| --- | --- |
| Authenticated user | View public providers/services, create bookings, submit reviews, manage their creator types. |
| Service provider | Manage own profile, offerings, portfolio, availability, bookings, trust settings, verification requests. |
| Admin | Approve verification, oversee disputes (Phase 7 work upcoming), force status changes. |
| Anonymous | Only discover/search public content (RLS filtered). |

Stripe Connect onboarding is required (`provider_connect_accounts`) before booking payment intent can be created.

---

## 6. Notifications & SendGrid

`BookingNotificationService` drives all lifecycle emails. Environment variables required are enumerated in `docs/sendgrid-templates.md` (16 booking templates + verification approval/rejection).  
We also documented manual QA in `docs/booking-notification-testing.md` (seed accounts, forced reminders, completion prompts).

---

## 7. Mobile Implementation Guidance

1. **Data fetching**  
   - Use the same routes listed above; they return JSON ready for mobile consumption.  
   - Ensure auth tokens (Supabase session) accompany requests; RLS enforces privacy.

2. **Offline/Type Safety**  
   - Mirror TypeScript types from `src/lib/types.ts` (particularly `ServiceProviderProfile`, `ServiceBooking`, badge insights).

3. **UI parity**  
   - Surface badges with tiers + progress copy (see values in `ServiceProviderDashboard`).  
   - Trust messaging: replicate payment-protection banner and first-booking discount if `firstBookingDiscountEnabled`.

4. **Bookings**  
   - Booking request flow matches the web: booker creates pending, provider confirms, booker pays, escrow releases.  
   - Payment: mobile can reuse Stripe PaymentSheet using the client secret from `/payment-intent`.

5. **Verification**  
   - Provider settings should show prerequisites, status chips, and submission form mirroring `VerificationStatusResponse`.

6. **Search/Discover**  
   - Display the new sections for services (cards include `badge_tier`, categories, price/rating).

7. **Future dispute dashboard**  
   - Admin dispute tooling is slated for next phase (post-Phase 6). Mobile consumer flows already handle `status='disputed'` messaging.

---

## 8. Open Items / Roadmap

- **Phase 7: Admin Dispute Management** – new tables (`booking_disputes`), admin dashboards, additional notifications. Not yet implemented.
- **Venues** – backend placeholder only. Mobile should design but wait on final API contract.
- **SMS / Push Notifications** – to be outlined once we integrate with notification microservice.

---

## 9. Contacts & Support

- Web backend POC: @web-platform (Slack)  
- Schema questions: refer to `database/creator_expansion_schema.sql` or ping @data-eng  
- Stripe/Payments: @payments  
- QA coordination: `docs/booking-notification-testing.md`

Let us know if you need sample payloads or Postman collections. Happy shipping! 🚀

