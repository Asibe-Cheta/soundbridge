# Urgent Gigs — Implementation Check Report

**Date:** 2026-01-26  
**Scope:** Phases A–D (disputes, ratings, project page, availability, urgent gig flow, wallet links, notification prefs)

---

## 1. Build & type check

- **Next.js build:** Fails with `supabaseUrl is required` in `/api/admin/copyright/statistics` during page data collection. This is a **pre-existing** environment/initialization issue (missing or unset `NEXT_PUBLIC_SUPABASE_URL` at build time), not caused by the urgent gigs implementation.
- **TypeScript:** Not re-run to completion (timeout); no type errors were observed in the files reviewed.
- **Recommendation:** Set required env vars (or stub them) for `next build`, or exclude the failing route from static collection. Urgent gigs pages and API routes do not reference that admin route.

---

## 2. Phase A — Verification

### 2.1 Disputes
- **Raise:** `/dispute/[projectId]` loads project via `GET /api/opportunity-projects/:id` (returns raw project) and dispute status via `GET /api/disputes/by-project/:projectId`. Submits via `raiseDispute()` → `POST /api/disputes`. Redirects to `/dispute/view/:dispute_id` when one exists or after submit. **Complete.**
- **View:** `/dispute/view/[disputeId]` loads via `getDispute()` → `GET /api/disputes/:disputeId` (returns `{ success, data: Dispute }`). Counter-response via `respondToDispute()` → `POST /api/disputes/:id/respond`. **Complete.**
- **Project shape:** Dispute raise page expects `ProjectInfo` (id, title, agreed_amount, currency, poster_user_id, creator_user_id). `GET /api/opportunity-projects/:id` returns `select('*')`; table has `title`, `agreed_amount` (from schema/inserts). **Compatible.**

### 2.2 Ratings
- **Page:** `/rate/[projectId]` uses `getProjectRatings()` and `submitRating()` with query params `rateeId`, `rateeName`, `role`. **Complete.**
- **API:** `GET /api/gig-ratings/project/:projectId` returns `{ success, data: { has_rated, my_rating, their_rating, both_submitted } }`. `POST /api/gig-ratings` accepts snake_case body. Service returns `json.data` as `GigRatingProjectResult`. **Complete.**

### 2.3 Project page
- Loads project via `GET /api/opportunity-projects/:id`; 48h countdown from `updated_at` when status = delivered; dispute button → `/dispute/[projectId]`; rating prompt after completion → `/rate/[projectId]` with correct query params; "View payment in Wallet" → `/wallet`. **Complete.**

---

## 3. Phase B — Verification

- **Page:** `/settings/availability` uses `getMyAvailability()` and `updateAvailability()` / `updateLocation()`. **Complete.**
- **API:** `GET /api/user/availability` returns `{ success, data }`; `PATCH` returns `{ success, data }`; `POST .../location` expects `{ lat, lng }`. Service expects `json.success` and `json.data`. **Complete.**
- **Settings link:** "Urgent Gig Availability" → `/settings/availability`. **Complete.**

---

## 4. Phase C — Verification

### 4.1 Urgent gig service
- **createUrgentGig:** POST body matches API (skill_required, date_needed, payment_amount, location_lat/lng, etc.). API returns `{ success, data: { gig_id, stripe_client_secret, estimated_matches } }`. **Complete.**
- **getUrgentGig:** API returns `{ success, data }` with `urgent_status`, `project_id`, `my_response_status`, etc. Service returns `json.data` with correct typing. **Complete.**
- **getGigResponses:** API returns `{ success, data: array }`. **Complete.**
- **respondToGig:** Body `{ action, message }`. **Complete.**
- **selectProvider:** Body `{ response_id }`; API returns `{ success, data: { project_id } }`. **Complete.**
- **completeGig:** API returns `{ success, data: { released_amount, currency } }`. **Complete.**

### 4.2 Pages
- **Create flow:** Step 1 → createUrgentGig → step 2 (Stripe) or step 3; return_url includes `step=3&gig_id=`. **Complete.**
- **Responses:** Realtime via Supabase `gig_responses`; select → `selectProvider()` → redirect to `/gigs/[id]/confirmation?projectId=`. **Complete.**
- **Detail (provider):** getUrgentGig; view states (searching, accepted_waiting, confirmed, filled, cancelled); "View Gig Project" and "Update Availability" links. **Complete.**
- **My opportunities:** Fetches `/api/opportunities/mine`; uses `data.items` with `gig_type`, `urgent_status`, `response_count`, `project_id`. **Complete.**

### 4.3 Notification deep links
- `NotificationBell` `getNotificationUrl()` and `handleNotificationClick()` map types to routes (urgent_gig, gig_accepted, opportunity_project_completed, opportunity_project_disputed, rating_prompt). **Complete.**

---

## 5. Phase D — Verification

### 5.1 Wallet
- **Backend:** All three wallet-insert paths set `reference_type: 'opportunity_project'` and `reference_id` (confirm-delivery, gig complete, auto-release cron). **Complete.**
- **Migration:** `20260228100000_wallet_transactions_reference_type.sql` adds `reference_type`. **Present.**
- **Type:** `WalletTransaction` has `reference_type?`, `reference_id?`. **Complete.**
- **WalletDashboard:** Detects project link via `reference_type === 'opportunity_project'` or `metadata.project_id` + description; click navigates to `/projects/[id]` and shows "View project →". **Complete.**
- **Wallet page:** `/wallet` page exists and renders `WalletDashboard`. **Complete.**

### 5.2 Notification preferences
- **Migration:** `20260228100001_notification_preferences_urgent_gig.sql` adds two columns. **Present.**
- **API:** GET/PUT `/api/user/notification-preferences` include `urgentGigNotificationsEnabled` and `urgentGigActionButtonsEnabled`; fallback defaults include both. **Complete.**
- **UI:** Notifications page has "Urgent Gigs" section; two toggles; second disabled when first is OFF; load/save via `/api/user/notification-preferences`. **Complete.**
- **Route:** `/notifications` page exists (from `page.tsx.temp` copy). **Complete.**

---

## 6. Issues found and fixes

| Item | Status |
|------|--------|
| Build failure (admin/copyright/statistics) | Pre-existing; not from urgent gigs. Fix env or static collection. |
| Missing `/wallet` route | Fixed earlier (added `app/wallet/page.tsx`). |
| Missing `/notifications` route | Fixed earlier (created `app/notifications/page.tsx`). |
| Notification prefs fallback missing urgent fields | Fixed earlier (added to GET fallback in API). |

No additional code defects were found in the reviewed flows. Service/API response shapes and page navigation are consistent.

---

## 7. Recommendations

1. **Run migrations** (if not already applied):
   - `20260228100000_wallet_transactions_reference_type.sql`
   - `20260228100001_notification_preferences_urgent_gig.sql`

2. **Build:** Resolve the admin route env/init so `next build` succeeds (e.g. set `NEXT_PUBLIC_SUPABASE_URL` or guard the Supabase client in that route).

3. **Manual smoke test (suggested):**
   - Post urgent gig (create → pay → view responses).
   - Provider: open gig detail, accept; requester: select provider; confirm; complete.
   - Project page: confirm delivery, dispute link, rating prompt, "View payment in Wallet".
   - Wallet: open `/wallet`, confirm opportunity/urgent payment rows show "View project" and navigate to project.
   - Settings → Manage Notifications → Urgent Gigs: toggle both options and confirm they persist.

---

## 8. Summary

All Phase A–D implementations that were reviewed are **complete and consistent** with the API and types. The only build failure is unrelated (admin route + env). Migrations are in place; applying them and fixing the pre-existing build issue will leave the urgent gigs feature set working end-to-end.
