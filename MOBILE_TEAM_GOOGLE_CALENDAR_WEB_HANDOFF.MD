# Mobile Team → Web Team: Google Calendar Integration Handoff

**Date:** 2026-06-08  
**Spec:** `GOOGLE_CALENDAR_ADDITION.MD`  
**Mobile status:** Connect/disconnect UI + API client implemented — **blocked on web backend**

---

## Summary

Mobile implements **Part 1 (connect UI)** and **Part 5 (settings status)** only.  
**Parts 2–4 (FreeBusy gating, pattern learning, server jobs)** are **web/backend only**.

Mobile **never** stores Google OAuth tokens. All token encryption, FreeBusy API calls, and `user_behaviour_profiles` calendar columns are web-owned per spec.

---

## What mobile built

| Item | Location |
|------|----------|
| Connected Apps section | `ProfileScreen` → Settings tab |
| Google Calendar card | `src/components/GoogleCalendarConnectCard.tsx` |
| Privacy notice modal | `src/components/GoogleCalendarPrivacyModal.tsx` |
| API client | `src/services/CalendarIntegrationService.ts` |
| Poll calendar insight (display only) | `PollResultsScreen` — shows when API returns copy |

### OAuth flow (mobile)

1. User taps **Connect Google Calendar**
2. Privacy modal → **I understand, continue**
3. `GET /api/calendar/google/connect-url` → open URL in `WebBrowser.openAuthSessionAsync`
4. Web completes Google OAuth, stores encrypted tokens, redirects to:
   **`soundbridge://calendar/google/callback?success=1`**
5. Mobile refreshes `GET /api/calendar/google/status`

### Disconnect flow (mobile)

1. User taps **Disconnect** → confirm
2. `POST /api/calendar/google/disconnect`
3. Web revokes Google token, deletes rows, clears calendar patterns

---

## APIs web must implement

All endpoints: **Bearer auth** (`Authorization: Bearer {supabase_access_token}`), CORS for mobile.

### 1. `GET /api/calendar/google/status`

```json
{
  "success": true,
  "connected": true,
  "calendar_connected_at": "2026-06-08T12:00:00Z",
  "last_synced_at": "2026-06-08T14:30:00Z",
  "needs_reconnect": false
}
```

- `needs_reconnect: true` when refresh token invalid/revoked (mobile shows in-app toast)

### 2. `GET /api/calendar/google/connect-url`

```json
{
  "success": true,
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Requirements:**
- Scope **only:** `https://www.googleapis.com/auth/calendar.freebusy`
- `state` must bind to authenticated `user_id`
- Redirect URI registered with Google for web callback
- After success, redirect to `soundbridge://calendar/google/callback?success=1`
- On error: `soundbridge://calendar/google/callback?error=...`

### 3. `POST /api/calendar/google/disconnect`

```json
{}
```

Response:

```json
{
  "success": true,
  "message": "Google Calendar disconnected"
}
```

**Must:**
- Revoke token with Google
- Delete `calendar_integrations` row (or equivalent)
- Set `calendar_connected = false`
- Clear `calendar_free_days`, `calendar_free_times`, `calendar_pattern_confidence` on `user_behaviour_profiles`
- Do **not** delete unrelated behaviour profile fields

### 4. `GET /api/calendar/poll-availability-insight?campaignId={uuid}`

Optional for poll dashboard (Part 3). Return `404` until ready.

```json
{
  "success": true,
  "insight": "Based on calendar availability data from your interested listeners, Saturday evenings have the highest free slot rate at 78%."
}
```

---

## Database (web deploys)

### `calendar_integrations`

```sql
CREATE TABLE calendar_integrations (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,          -- encrypted at rest
  refresh_token TEXT NOT NULL,         -- encrypted at rest
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_connected BOOLEAN NOT NULL DEFAULT false,
  calendar_connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: users read own row status fields only — **never** expose tokens to client.

### `user_behaviour_profiles` additions

```sql
ALTER TABLE user_behaviour_profiles
  ADD COLUMN IF NOT EXISTS calendar_free_days TEXT[],
  ADD COLUMN IF NOT EXISTS calendar_free_times TEXT[],
  ADD COLUMN IF NOT EXISTS calendar_pattern_confidence DECIMAL,
  ADD COLUMN IF NOT EXISTS calendar_pattern_updated_at TIMESTAMPTZ;
```

---

## Web/backend responsibilities (not mobile)

### Part 2 — Availability checking (event notifications)

Before sending event push to a user with `calendar_connected = true`:

1. Refresh access token if expired
2. `POST https://www.googleapis.com/calendar/v3/freeBusy` for event window ± 2 hours
3. If **free** → send notification
4. If **busy** → hold; recheck 24h before event
5. If still busy at 24h → skip notification
6. Store only binary free/busy result per check — **not** raw API response

Integrate with existing `send-event-notifications` edge function / queue.

### Part 3 — Pattern learning (after 4 weeks)

- Aggregate free/busy checks into `calendar_free_days`, `calendar_free_times`
- Update `calendar_pattern_confidence` (0–1)
- Feed demand-led poll dashboard copy (mobile displays via insight API)

### Part 4 — Privacy policy

- **Justice must update** `soundbridge.live/legal/privacy` before feature goes live
- Mobile privacy modal is in-app only — does not replace policy update

---

## Conflicts avoided (mobile)

| Existing feature | How we avoided conflict |
|------------------|-------------------------|
| **Collaboration Availability** (`AvailabilityCalendarScreen`) | Separate label + note on card |
| **Urgent Gig Availability** (`ProviderAvailabilityScreen`) | Not touched |
| **Live interest self-report** (`live_interest_responses`) | Complementary — web merges in insights |
| **Google Sign-In** (`AuthContext.signInWithGoogle`) | Separate OAuth flow + scope — not bundled with login |

---

## Web settings parity

Add matching **Connected Apps → Google Calendar** section on web user settings when APIs are live.

---

## Test checklist (joint)

- [ ] Connect URL returns valid Google OAuth (FreeBusy scope only)
- [ ] Callback stores encrypted tokens; mobile callback opens app
- [ ] Status shows connected + last_synced_at
- [ ] Disconnect revokes + clears DB
- [ ] FreeBusy gate delays/skips notifications correctly
- [ ] Pattern job runs after 4 weeks (staging shortcut OK)
- [ ] Poll insight API returns copy for campaigns with calendar-connected fans
- [ ] Privacy policy updated before production flag

---

## Mobile open questions for web

1. **Google Cloud OAuth client:** Same client as Supabase Google login or separate client for Calendar?
2. **Connect URL:** Will web use apex or `www` for callback base URL?
3. **Feature flag:** Should mobile hide Connected Apps until APIs return non-404?

---

## Files changed (mobile)

- `src/services/CalendarIntegrationService.ts` (new)
- `src/components/GoogleCalendarConnectCard.tsx` (new)
- `src/components/GoogleCalendarPrivacyModal.tsx` (new)
- `src/screens/ProfileScreen.tsx`
- `src/screens/PollResultsScreen.tsx`
- `MOBILE_TEAM_GOOGLE_CALENDAR_WEB_HANDOFF.MD` (this file)
