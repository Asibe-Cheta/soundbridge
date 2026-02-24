# Urgent Gigs — End-to-End Implementation Verification

This document confirms that all phases (A–D) from `w.md` are wired end-to-end: routes, API responses, services, and navigation.

---

## Phase A — Disputes, Ratings, Project Page

### A.1 Types
- **Location:** `apps/web/src/lib/types/`
- **Files:** `urgent-gig.types.ts`, `user-availability.types.ts`, `gig-rating.types.ts`, `dispute.types.ts`
- **Status:** Present and used by services and pages.

### A.2 Disputes — Wired
| Layer | Detail |
|-------|--------|
| **Pages** | `/dispute/[projectId]` (raise), `/dispute/view/[disputeId]` (view) |
| **Service** | `disputeService.ts`: `raiseDispute` → POST `/api/disputes`, `getDispute` → GET `/api/disputes/:id`, `respondToDispute` → POST `/api/disputes/:id/respond` |
| **API** | POST `/api/disputes` → `{ success, data: { dispute_id } }`; GET `/api/disputes/by-project/:projectId` → `{ success, data: { dispute_id } }`; GET `/api/disputes/:disputeId` → `{ success, data: Dispute }`; POST `/api/disputes/:disputeId/respond` |
| **Navigation** | Project page (delivered) → "Raise a dispute" → `/dispute/[projectId]`; raise page checks by-project → redirects to `/dispute/view/[id]` if exists; after submit → `/dispute/view/[dispute_id]` |

### A.3 Ratings — Wired
| Layer | Detail |
|-------|--------|
| **Page** | `/rate/[projectId]` (PostGigRatingPage) |
| **Service** | `gigRatingService.ts`: `submitRating` → POST `/api/gig-ratings`, `getProjectRatings` → GET `/api/gig-ratings/project/:projectId` |
| **API** | POST `/api/gig-ratings` (409 if already rated); GET `/api/gig-ratings/project/:projectId` → `{ success, data: { has_rated, my_rating, their_rating, both_submitted } }` |
| **Navigation** | Project page (completed) → rating prompt → "Leave review" → `/rate/[projectId]?rateeId=...&rateeName=...&role=...` |

### A.4 Project Page — Wired
| Feature | Implementation |
|---------|----------------|
| **Data** | GET `/api/opportunity-projects/:id` returns project object (used by `/projects/[id]`) |
| **48h auto-release** | Countdown from `updated_at` + 48h when status = delivered |
| **24h reminder** | Same countdown display |
| **Raise a dispute** | Button → `/dispute/[projectId]` (poster and creator when delivered) |
| **Rating prompt** | After completion, `getProjectRatings` → prompt → `/rate/[projectId]` with query params |
| **View payment in Wallet** | Link `href="/wallet"` for creator when status = completed |

---

## Phase B — Provider Availability

### B.1 Availability — Wired
| Layer | Detail |
|-------|--------|
| **Page** | `/settings/availability` (ProviderAvailabilityPage) |
| **Service** | `availabilityService.ts`: `getMyAvailability` → GET `/api/user/availability`, `updateAvailability` → PATCH `/api/user/availability`, `updateLocation` → POST `/api/user/availability/location` |
| **API** | GET/PATCH `/api/user/availability` → `{ success, data }`; POST `/api/user/availability/location` |
| **Navigation** | Settings → "Urgent Gig Availability" link to `/settings/availability`; gig detail (provider) → "Update Availability" → `/settings/availability` |

---

## Phase C — Full Urgent Gig Flow

### C.1 Gig service — Wired
| Method | API | Response shape |
|--------|-----|----------------|
| `createUrgentGig` | POST `/api/gigs/urgent` | `{ success, data: { gig_id, stripe_client_secret, ... } }` |
| `getUrgentGig` | GET `/api/gigs/urgent/:id` | `{ success, data }` (includes `selected_provider_id`, `project_id`, `my_response_status`) |
| `getGigResponses` | GET `/api/gigs/urgent/:id/responses` | `{ success, data: GigResponse[] }` |
| `respondToGig` | POST `/api/gigs/:id/respond` | 200 |
| `selectProvider` | POST `/api/gigs/:id/select` | `{ success, data: { project_id } }` |
| `completeGig` | POST `/api/gigs/:id/complete` | `{ success, data: { released_amount, currency } }` |
| `getMyUrgentGigs` | GET `/api/gigs/urgent/mine` | `{ success, data: array }` |

### C.2 Pages & navigation — Wired
| Route | Purpose | In/out links |
|-------|---------|--------------|
| `/gigs/new` | Gig type selection | → "Post Urgent Gig" → `/gigs/urgent/create`; "My gigs" → `/gigs/my` |
| `/gigs/urgent/create` | 3-step create + Stripe; step 3 success | → "View Responses" → `/gigs/[gigId]/responses` |
| `/gigs/[gigId]/responses` | Requester: list responses, select provider | Select → `/gigs/[gigId]/confirmation?projectId=...`; realtime via Supabase `gig_responses` |
| `/gigs/[gigId]/confirmation` | Post-selection | "View Gig Project" → `/projects/[projectId]` |
| `/gigs/[gigId]/detail` | Provider: 5 states, accept/decline, view project | "View Gig Project" → `/projects/[projectId]`; "Update Availability" → `/settings/availability` |
| `/gigs/my` | My opportunities (tabs: All / Active / Urgent / Completed) | Fetches `/api/opportunities/mine`; "Post Urgent Gig" → `/gigs/urgent/create`; "View Responses" → `/gigs/[id]/responses`; "View Project" → `/projects/[project_id]` |

### C.3 API — My opportunities
- **GET `/api/opportunities/mine`** returns `{ items }` with per-item: `gig_type`, `urgent_status`, `response_count`, `accepted_count`, `project_id` for urgent rows. Used by `/gigs/my`.

### C.4 Notifications — Deep links
- **NotificationBell** `getNotificationUrl()` and `handleNotificationClick()`:
  - `urgent_gig` / `gig_confirmed` / `gig_starting_soon` → `/gigs/[gigId]/detail`
  - `gig_accepted` → `/gigs/[gigId]/responses`
  - `confirm_completion` / `opportunity_project_completed` → `/projects/[projectId]`
  - `opportunity_project_disputed` → `/dispute/view/[disputeId]` (metadata.dispute_id)
  - `rating_prompt` → `/rate/[projectId]?rateeId=...&rateeName=...`

---

## Phase D — Wallet & Notification Preferences

### D.1 Wallet transaction → project link — Wired
| Layer | Detail |
|-------|--------|
| **Backend** | `reference_type: 'opportunity_project'` and `reference_id` (project id) set in: `confirm-delivery`, `gigs/[id]/complete`, `cron/urgent-gigs/auto-release` |
| **Migration** | `20260228100000_wallet_transactions_reference_type.sql` adds `reference_type` to `wallet_transactions` |
| **Type** | `WalletTransaction` includes `reference_type?`, `reference_id?` |
| **UI** | `WalletDashboard`: for rows with `reference_type === 'opportunity_project'` (or `metadata.project_id` + opportunity/urgent payment description), row is clickable → `router.push(/projects/[id])` and shows "View project →" |

### D.2 View in Wallet (project page)
- Project page already has "View payment in Wallet →" linking to `/wallet` for creator when completed.

### D.3 Notification preferences — Urgent Gig toggles — Wired
| Layer | Detail |
|-------|--------|
| **Migration** | `20260228100001_notification_preferences_urgent_gig.sql` adds `urgent_gig_notifications_enabled`, `urgent_gig_action_buttons_enabled` to `notification_preferences` |
| **API** | GET/PUT `/api/user/notification-preferences`: response and body include `urgentGigNotificationsEnabled`, `urgentGigActionButtonsEnabled`; fallback defaults include both |
| **UI** | Notifications preferences page: "Urgent Gigs" section with "Urgent Gig Alerts" and "Notification Action Buttons" (second disabled when first OFF); loads/saves via `/api/user/notification-preferences` |

---

## Fixes applied during verification

- **`/wallet` route:** Added `app/wallet/page.tsx` that renders `WalletDashboard` so "View payment in Wallet" and "View Wallet" work.
- **`/notifications` route:** `app/notifications/page.tsx` was created (from `page.tsx.temp`) so "Manage All Notifications" and the Urgent Gigs toggles are reachable.

## Follow-up: migrations

Run the two Phase D migrations so `wallet_transactions.reference_type` and `notification_preferences` urgent-gig columns exist:

- `20260228100000_wallet_transactions_reference_type.sql`
- `20260228100001_notification_preferences_urgent_gig.sql`

---

## Summary

| Phase | Status | Notes |
|-------|--------|------|
| A | Wired | Disputes, ratings, project page with countdown, dispute link, rating flow, wallet link |
| B | Wired | Availability service, settings page, API, link from Settings and gig detail |
| C | Wired | Full urgent gig create → responses → select → confirmation → project; detail page for provider; my opportunities; notification deep links |
| D | Wired | Wallet transactions get `reference_type`/`reference_id`; WalletDashboard shows "View project"; notification prefs API + Urgent Gigs section in UI |

End-to-end flows are connected. Resolving the two route gaps above will make the wallet and notification preferences (including Urgent Gigs toggles) fully reachable from the UI.
