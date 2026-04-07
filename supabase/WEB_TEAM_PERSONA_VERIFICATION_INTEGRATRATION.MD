# WEB TEAM: Persona Identity Verification Integration

**From:** Mobile team  
**Date:** 2026-04-07  
**Priority:** High — mobile UI is ready and waiting on this API contract

---

## Context

We are integrating Persona (app.withpersona.com) for identity verification on the Service Provider Dashboard. The KYC solution (Government ID + Selfie liveness check) is already added to the Persona Production account.

The mobile app already has:
- `GET /api/service-providers/:userId/verification/status` — already implemented and working
- The 4-state verification UI in `ServiceProviderDashboardScreen`
- State 3 (Premium + unverified) currently shows a placeholder — **this is where the Persona flow gets launched**

---

## What We Need From You

### 1. New Endpoint: Start Persona Inquiry

```
POST /api/service-providers/:userId/verification/start
Authorization: Bearer <session token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inquiry_url": "https://withpersona.com/verify?inquiry-id=inq_xxxx",
    "inquiry_id": "inq_xxxx"
  }
}
```

**What this endpoint should do on your side:**
1. Check the user has an active Premium subscription (guard — return 403 if not)
2. Call Persona's API to create a new Inquiry using the KYC template already set up in Production
3. Store `inquiry_id` against the user in DB (for webhook matching later)
4. Return the `inquiry_url` to mobile

**If an inquiry already exists and is pending:**  
Return the existing `inquiry_url` rather than creating a duplicate.

---

### 2. Persona Webhook Handler

Set up a webhook in the Persona dashboard pointing to your backend.

**Events to handle:**
- `inquiry.completed` — user finished the flow, awaiting review
- `inquiry.approved` — verification passed → set `verification_status = 'approved'` for the user
- `inquiry.declined` — verification failed → set `verification_status = 'rejected'`
- `inquiry.expired` — inquiry expired without completion → reset to `not_requested` or keep `pending`

**DB update:** The existing `verification_status` field on the service provider record should be updated. The existing `GET /api/service-providers/:userId/verification/status` endpoint already returns this — just keep the response shape consistent:

```json
{
  "status": {
    "verificationStatus": "not_requested" | "pending" | "approved" | "rejected"
  }
}
```

---

### 3. Existing Status Endpoint — No Changes Needed

`GET /api/service-providers/:userId/verification/status` already works. Mobile re-calls this after the Persona sheet closes. No changes needed unless the shape changes.

---

## Mobile behaviour (as implemented)

When the user taps **"Start Verification"** (State 3 — Premium + not verified):

1. Call `POST /api/service-providers/:userId/verification/start`
2. Receive `inquiry_url` (and optional flags below)
3. Open **`inquiry_url`** with **`expo-web-browser`** (`openBrowserAsync`) — in-app browser sheet (SFSafariViewController on iOS, Chrome Custom Tabs on Android), not `Linking.openURL`. Camera/mic work inside the sheet for selfie liveness.
4. When the sheet closes, **re-fetch verification status** (primary: `await` on `openBrowserAsync`; **AppState** as fallback).
5. If status is **`pending`** or **`approved`**, update the UI accordingly.

**Response flags (no extra client branching required):**

- **`pending_resume`:** Treat like a normal flow — `inquiry_url` is valid; open it the same way.
- **`already_verified`**, **`under_review`:** Handle per existing product rules.

Loading spinner during `/start` and clear errors on failure remain as planned.

---

## Error Cases We'll Handle on Mobile

| HTTP Status | Meaning | Mobile behaviour |
|---|---|---|
| 403 | Not Premium | Should not happen (we gate the button), but show "Premium required" alert |
| 409 | Inquiry already in progress | Use returned `inquiry_url` to resume |
| 500 | Persona API error | Show "Something went wrong, please try again" |

---

## Persona Dashboard Reference

- Environment: **Production** (not sandbox)
- Solution: **KYC** (already added — "Solution is already added" confirmed)
- Template: Government ID + Selfie liveness
- 500 free verifications, small per-verification fee after

Please share the Persona template ID / flow ID when setting up the backend so we can reference it if needed.

---

## Production domain (canonical: **www**)

SoundBridge’s public site is **`https://www.soundbridge.live`**. Use this host (not the bare apex) anywhere Persona, Meta, or email tooling asks for an **allowed domain**, **redirect URL**, or **webhook URL**, unless you intentionally rely on apex → www redirects.

| Item | Value |
|------|--------|
| **Persona webhook (Production)** | `https://www.soundbridge.live/api/webhooks/persona` |
| **Vercel / server `NEXT_PUBLIC_SITE_URL`** | `https://www.soundbridge.live` |
| **Optional: `PERSONA_INQUIRY_REDIRECT_URI`** | e.g. `https://www.soundbridge.live/` — only if you pass `redirect-uri` on inquiry create; domain must be allowlisted in Persona. |

If the Persona template uses a **post-inquiry redirect** or “allowed domains,” add **`www.soundbridge.live`** (and any deep link host the mobile team uses, if different).

---

## Questions for You

1. Is there already a `verification_status` column on the service providers table, or is it tracked elsewhere? **→ Yes: `service_provider_profiles.verification_status`.**
2. Should we support resuming an in-progress inquiry (i.e. user started but didn't finish — same `inquiry_url` returned on next `POST /start`)? **→ Yes; `pending_resume` indicates resume with the same URL.**
3. Any rate limiting on the `/verification/start` endpoint we should handle on mobile? **→ None added server-side; Persona limits still apply.**

---

**Status:** Production API + Persona webhook wired; mobile ready for end-to-end testing. Ping web if `/start` payloads or webhook-driven status look wrong after a test inquiry.
