# Critical Client-Reported Bugs — Action Required
**Date:** 2026-03-29
**Priority:** Critical — real paying/early-adopter users blocked
**Source:** Direct client messages + console log screenshots

---

## Bug 1 — Email Verification Not Sending on Signup (Critical)

**Symptom:** New users sign up and receive no confirmation email. Clicking "Resend" also does nothing.

**Impact:** Users cannot verify their account and are effectively locked out of full functionality.

**What to check:**
- Supabase Auth → Email Templates → "Confirm signup" template — is it enabled?
- Is the Supabase SMTP/SendGrid integration still connected? (SendGrid dashboard shows 730 requests this week at 96.3% delivery — so the service itself is working, but the auth hook may not be calling it)
- Check Supabase Auth logs for any errors on `signup` events
- Confirm the `SITE_URL` and `REDIRECT_URL` in Supabase Auth settings match `https://www.soundbridge.live`

**Fix needed:** Ensure Supabase signup trigger fires the confirmation email via SendGrid. Test by creating a new account end-to-end.

---

## Bug 2 — Password Reset Redirect Broken (Previously Reported)

**Symptom:** User clicks "Forgot Password", receives email, clicks the link — it redirects to another **"Request Password Reset"** page instead of the actual **"Enter new password"** form.

**Impact:** Users signed up with email/password cannot reset their password. Google OAuth users trying to add a password (to enable biometric unlock) are completely stuck.

**Additional context:** Google OAuth users have no password set. When they try to enable Face ID / biometric unlock in the app, they're prompted for a password. They then try "Forgot Password" to generate one — and hit this broken redirect. They are fully blocked.

**Fix needed:**
- Password reset link must deep-link to the `/reset-password?token=...` page (the form that accepts a new password), not back to the request page
- Confirm Supabase `PKCE` or `token_hash` flow is configured correctly in the email template
- This was previously reported in `PASSWORD_RESET_HOOK_NOT_TRIGGERING.md` and `WEB_TEAM_PASSWORD_RESET_RESPONSE.md` — it is still not resolved

---

## Bug 3 — Google OAuth Users Cannot Set a Password

**Symptom:** User signed up via Google. Has no password. Cannot enable Face ID / biometric unlock because the app requires a password to set one up. Clicking "Forgot Password" leads to Bug 2 above.

**Fix needed:**
- Add a "Set a password" option in account settings for OAuth users (Supabase supports `updateUser({ password: ... })` for this)
- OR ensure the biometric unlock flow on mobile gracefully handles OAuth-only accounts by using a different auth verification method (e.g. re-authenticate via Google)

---

## Bug 4 — Early Adopter Benefits Not Applied to Accounts

**Symptom:** Client (lagcitykeys) received the early adopter launch email listing benefits (3 months free Premium, Early Adopter badge, 2GB storage, etc.) but none of these are visible or active on their account.

**Impact:** This affects trust significantly — user was promised benefits in an official email and sees none of them.

**What to check:**
- Is the early adopter subscription tier being set in the DB for these users? Check `profiles` or `subscriptions` table for this user
- Is the "Early Adopter" badge being awarded? Check `verification_badges` or equivalent table
- Was the bulk grant script actually run for all early adopter emails, or only some?

**Fix needed:**
- Run a query to identify all users who received the early adopter email and verify their subscription tier is set to `premium` with 3 months expiry
- Ensure the Early Adopter badge is present on their profile
- If missing for some users, apply the fix and confirm with the affected user

---

## Bug 5 — Audio Upload Failing on Web (413 + Storage Errors)

**Symptom:** Web upload flow fails with multiple errors visible in console:
- `413 Payload Too Large` on `POST /api/upload/audio-file`
- `413` on `POST /api/upload/fingerprint` (ACRCloud fingerprinting)
- Storage upload fails ("Temporary upload failed"), falls back to direct upload which also fails
- `400` on `POST /api/copyright/flag`
- ACRCloud fingerprinting: "HTTP error"

**Affected file in screenshot:** `Final Gospel Prevails 2.mp3` — 13.3 MB

**What to check:**
1. **Server body size limit** — Next.js/Express has a default 4MB body limit. A 13.3 MB file exceeds this. Increase the limit in the API route config:
   ```js
   // pages/api/upload/audio-file.js or app/api/upload/audio-file/route.ts
   export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }
   ```
2. **Vercel payload limit** — Vercel Serverless Functions have a 4.5 MB request body limit. For large files, upload must go **directly to Supabase Storage** from the browser (signed URL pattern), not through the API route
3. **ACRCloud fingerprint 413** — Fingerprinting endpoint also has a size limit. Files > ~10 MB should be chunked or trimmed to 30s before fingerprinting
4. **Storage upload "Temporary upload failed"** — Check Supabase Storage bucket policies and whether the signed URL is being generated correctly before upload attempt

**Recommended fix:**
- Use Supabase Storage signed URL upload from the browser directly (bypass the API route for the binary file)
- Only send metadata (title, genre, etc.) through the API route
- This is the same pattern already working on mobile

---

## Bug 6 — `/api/user/subscription` and `/api/user/onboarding-status` Returning 401 in Loop

**Symptom:** Console logs show these two endpoints returning 401 repeatedly — even after the user is authenticated (`SIGNED_IN` state confirmed in logs).

**Impact:**
- Subscription status cannot load → premium features may not gate correctly
- Onboarding check loops → wastes network requests, potential performance impact

**What to check:**
- These endpoints likely require the Supabase JWT in the `Authorization` header. Is the token being passed correctly from the web client?
- Is the session timing out and not being refreshed before these calls? Check if `supabase.auth.getSession()` is being awaited before making these requests
- The logs show `SIGNED_IN` event firing repeatedly (auth provider resetting session from "SIGNED_IN" → "event") — this suggests a session refresh loop. Check if there's a `onAuthStateChange` listener that's triggering re-fetches incorrectly

---

## Summary — Priority Order

| # | Bug | Severity | Owner |
|---|-----|----------|-------|
| 1 | Email verification not sending | Critical | Web/Supabase |
| 2 | Password reset redirect broken | Critical | Web |
| 3 | Google OAuth users can't set password | High | Web |
| 4 | Early adopter benefits not applied | High | Web/DB |
| 5 | Audio upload 413 on web | High | Web |
| 6 | 401 auth loop on subscription/onboarding | Medium | Web |

Please confirm when each is resolved. Client (lagcitykeys) is actively waiting on bugs 2, 3, and 4.

— Mobile team

---

## Web team — resolution notes (2026-03-29 follow-up)

### Bug 1 — Email verification (ops + Supabase)

Code cannot force Supabase to send mail if Auth is misconfigured. Confirm in **Supabase Dashboard**:

1. **Authentication → Providers → Email**: enabled; “Confirm email” / secure email change as required by product.
2. **Authentication → URL configuration**: **Site URL** = `https://www.soundbridge.live` (or the canonical URL you use in production). **Redirect URLs** must include `https://www.soundbridge.live/**` and `https://soundbridge.live/**` if both are used.
3. **Email**: either **SMTP** (SendGrid) is connected and test-send works, **or** Supabase default mail is enabled.
4. **SendGrid auth hook** (if used): `POST /api/auth/send-email` with `SUPABASE_AUTH_HOOK_SECRET` and SendGrid template IDs set in Vercel; Auth **Hooks** in Supabase must point at this URL and fire on signup.

After changes, run an end-to-end test signup with a fresh address and confirm inbox + spam.

### Bug 2 — Password reset redirect (web)

- **Request form** lives at **`/forgot-password`** (was wrongly implemented on `/reset-password`).
- **Recovery links** should open **`/reset-password?token_hash={{ .TokenHash }}&type=recovery`** (Supabase template variables). The app verifies OTP client-side, then routes to **`/update-password`** to set the new password.
- **Alternative** (still supported): **`/auth/callback?token_hash=…&type=recovery&next=/update-password`** (server-side cookie exchange).
- **SendGrid hook** (`/api/auth/send-email`): `reset_url` now uses the **`/reset-password?token_hash=…&type=recovery`** shape; `auth_callback_recovery_url` is also passed for templates that prefer the callback route.
- **Middleware**: `/reset-password` is no longer treated as a “logged-in users leave” route so recovery works even with an existing session.

### Bug 3 — OAuth users, set password (web)

- **`/settings/security`**: “Account password” block for users **without** an `email` identity (e.g. Google-only). Uses **`supabase.auth.updateUser({ password })`**.

### Bug 4 — Early adopter + Premium (DB)

- Migration: **`supabase/migrations/20260329120000_profiles_early_adopter.sql`** adds **`profiles.early_adopter`**.
- Script: **`scripts/early-adopter-premium-grant-2026.sql`** — preview queries + commented apply blocks aligned with **`waitlist_premium_3mo_2026`** and the existing premium dates pattern. Uncomment and run in SQL Editor after verifying previews; for a single user (e.g. lagcitykeys), use section 4 with their **email** (replace placeholder).

**Badge UI:** there was no `early_adopter` column in repo before this migration; mobile can read **`profiles.early_adopter`** (and existing **`subscription_tier`**) once migration is applied. If the app expected a separate “verification_badges” table, align that product-side — this migration is the profile flag for the cohort.

---

## Mobile team — status update (follow-up)

### Bug 2 — Password reset (web **done**; Supabase **required** for E2E)

Web flow is deployed. **Last steps in Supabase Dashboard:**

1. **Authentication → Email Templates → “Reset password”** (or your custom recovery template): set the action / recovery link to exactly:
   ```text
   https://www.soundbridge.live/reset-password?token_hash={{ .TokenHash }}&type=recovery
   ```
2. **Authentication → URL Configuration → Redirect URLs**: add  
   **`https://www.soundbridge.live`**  
   (and any wildcard patterns you already use, e.g. `https://www.soundbridge.live/**`, if your project requires them).

Until both are saved, links from email may still fail or redirect incorrectly.

### Bug 3 — Google OAuth + biometric (**mobile done**)

Mobile fix is shipped (OTA on iOS and Android): OAuth accounts (`app_metadata.provider !== 'email'`) skip the password prompt; biometrics use device + active Supabase session with an oauth marker in SecureStore.

Web still offers optional **“Set a password”** under **Settings → Security** for OAuth-only users who want an email/password credential.

### Bug 4 — Early adopter grants (**Supabase / ops**)

1. Apply migration **`20260329120000_profiles_early_adopter.sql`** if not already applied.  
2. Run preview queries, then **`scripts/early-adopter-premium-grant-steps-1-2-3.sql`** (or **`early-adopter-premium-grant-2026.sql`**) — STEP 3 for cohort; §4 in the older script for a **single email** (set **lagcitykeys**’ real signup email).  
3. **Confirm directly with the user** once their row shows `premium` + `early_adopter` as expected.

### Bug 1 — Email verification (**most urgent — Supabase config**)

Blocked until Auth is configured:

| Check | Action |
|-------|--------|
| Confirm signup | **Authentication → Email Templates → “Confirm signup”** — enabled / not suppressed |
| SMTP | **SendGrid** connected under Auth → **SMTP** (or equivalent); credentials valid |
| Site URL | **`https://www.soundbridge.live`** under **Authentication → URL Configuration** |
| Test | New signup with a **fresh** address; check inbox + spam |

Code paths (e.g. auth hook `confirmation_url` to `/auth/callback`) only help **after** Supabase actually sends the message.

---

## Mobile team — email issues (Supabase configuration)

Mobile uses `signUp` with `emailRedirectTo: 'soundbridge://auth/callback'`. **Supabase** must allow that redirect and actually send mail; no mobile code change required for the items below.

### Issue #1 — Signup confirmation not sending

Mobile app code is fine. Check **Supabase Dashboard**:

| Step | Where | What to verify |
|------|--------|----------------|
| 1 | **Authentication → Providers → Email** | **Confirm email** toggle is **ON** |
| 2 | **Authentication → Email Templates → Confirm signup** | Template saved; if using SendGrid hook, dynamic data uses `confirmation_url` (see `send-email` route). |
| 3 | **Project Settings → Auth → SMTP** (or **Authentication** SMTP) | If using **custom SMTP** (SendGrid, Resend, etc.), credentials are valid and **Test** succeeds |
| 4 | **Authentication → Logs** | Filter **signup**; look for errors on the email send step |
| 5 | Rate limits | On **free** tier, Supabase **built-in** email is heavily rate-limited (~**4 emails/hour** per project). Use **custom SMTP** (e.g. Resend/SendGrid) for production volume |

**Send Email hook:** If auth mail goes through `/api/auth/send-email`, the hook must be **enabled** in **Authentication → Auth Hooks**.

### Issue #2 — Password reset link opens web instead of the app

**Cause:** Supabase only honors `redirectTo` from `resetPasswordForEmail` if that URL is in the **allowed Redirect URLs** list. If `soundbridge://auth/callback` is not allowed, Supabase falls back to **Site URL** (`https://www.soundbridge.live`), so `{{ reset_url }}` in the email becomes a **web** URL.

**Fix — Authentication → URL Configuration → Redirect URLs** — add:

```text
soundbridge://auth/callback
soundbridge://**
```

After this, `resetPasswordForEmail(..., { redirectTo: 'soundbridge://auth/callback' })` is honored, recovery emails can contain the **deep link**, and the app can handle **PASSWORD_RECOVERY** in AuthContext. **No** mobile code or SendGrid HTML changes required for this specific issue—purely **Supabase URL allowlist**.

**Web users** still use `https://www.soundbridge.live/...` recovery links; keep existing **https** redirect entries as well.
