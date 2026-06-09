# Web Team → Mobile Team: Google Calendar Response

**Date:** 2026-06-08  
**Handoff in:** `MOBILE_TEAM_GOOGLE_CALENDAR_WEB_HANDOFF.MD`

---

## Answers to open questions

### 1. Separate Google OAuth client for Calendar vs Supabase login?

**Yes — use a dedicated Google Cloud OAuth client for Calendar.**

| Flow | Client | Scopes |
|------|--------|--------|
| Supabase Google login | Supabase-managed | `openid`, `email`, `profile` |
| Calendar connect | **New** `GOOGLE_CALENDAR_CLIENT_ID` | `https://www.googleapis.com/auth/calendar.freebusy` only |

Reasons: least-privilege, independent revocation, no scope creep on login, cleaner consent screen (“SoundBridge wants to view your calendar availability” vs “Sign in”).

**Web env vars (Vercel):**
```
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=https://www.soundbridge.live/api/calendar/google/callback
GOOGLE_CALENDAR_STATE_SECRET=   # optional; openssl rand -hex 32
```

Register redirect URI in Google Cloud Console (authorized redirect URIs). Use **www** as canonical (`NEXT_PUBLIC_SITE_URL`).

Token encryption reuses existing `TOTP_ENCRYPTION_KEY` + `encryptSecret` / `decryptSecret`.

---

### 2. Feature flag — hide Connected Apps until APIs return non-404?

**No feature flag required on mobile.**

Web ships these endpoints to return **200** (not 404) immediately:

| Endpoint | Disconnected state |
|----------|-------------------|
| `GET /api/calendar/google/status` | `{ success: true, connected: false, ... }` |
| `GET /api/calendar/google/connect-url` | `503` only if Google env not configured (staging) |
| `POST /api/calendar/google/disconnect` | `{ success: true }` (idempotent) |
| `GET /api/calendar/poll-availability-insight` | **404** until pattern job ships (optional UI) |

Mobile can show Connected Apps now. Connect will fail gracefully with `503` until Justice adds Google OAuth credentials in prod.

---

### 3. Poll insight — per `campaignId` or creator-wide?

**Per `campaignId`, aggregated across calendar-connected fans who expressed interest in that poll.**

- `campaignId` scopes the insight to one demand-led poll (creator must own the campaign).
- Aggregation is across **fans** with `calendar_connected = true` + interest in that campaign — not creator’s own calendar.
- Returns **404** until the 4-week pattern job is live; mobile should hide the insight block on 404.

---

## What web implemented (this pass)

| Item | Status |
|------|--------|
| Migration `20260608120000_google_calendar_integration.sql` | ✅ Ready to apply |
| `calendar_integrations` + `calendar_availability_checks` tables | ✅ |
| `user_behaviour_profiles` calendar columns | ✅ |
| `GET /api/calendar/google/status` | ✅ |
| `GET /api/calendar/google/connect-url` | ✅ |
| `POST /api/calendar/google/disconnect` | ✅ |
| `GET /api/calendar/google/callback` → `soundbridge://calendar/google/callback?success=1` | ✅ |
| `GET /api/calendar/poll-availability-insight?campaignId=` | ✅ (404 until patterns) |
| `src/lib/google-calendar.ts` (OAuth, encrypt, refresh, FreeBusy helper) | ✅ |
| FreeBusy gate in `send-event-notifications` | ⏳ Next |
| 4-week pattern aggregation job | ⏳ Next |
| Web settings Connected Apps UI | ⏳ Next |
| Privacy policy update (`/legal/privacy`) | ⏳ Justice before prod flag |

---

## Deploy checklist (web)

1. Apply migration on prod Supabase (`aunxdbqukbxyyiusaeqi`).
2. Create Google Cloud OAuth client (Calendar only, FreeBusy scope).
3. Set Vercel env vars (see above) + confirm `TOTP_ENCRYPTION_KEY` is set.
4. Deploy web app.
5. Mobile smoke test: connect → callback → status → disconnect.

---

## OAuth callback

- Web callback: `https://www.soundbridge.live/api/calendar/google/callback`
- Success redirect: `soundbridge://calendar/google/callback?success=1`
- Error redirect: `soundbridge://calendar/google/callback?error={code}`

`state` is HMAC-signed, binds to `user_id`, 30-minute TTL.

---

## Still web-owned (Parts 2–4)

**Event notifications:** Before push to a user with `calendar_connected = true`, call FreeBusy for event window ±2h. Free → send. Busy → hold + recheck 24h before event. Still busy → skip. Helper exists in `google-calendar.ts`; edge function integration is next.

**Pattern learning:** Cron after 4 weeks of `calendar_availability_checks` → update `user_behaviour_profiles.calendar_free_*` → power poll insight API.

**Privacy:** Justice updates `soundbridge.live/legal/privacy` before enabling in production.
