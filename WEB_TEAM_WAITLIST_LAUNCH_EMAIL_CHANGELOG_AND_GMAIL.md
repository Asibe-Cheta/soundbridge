# Handoff: Waitlist “general” launch email, Gmail Promotions, and recent web changes

**Audience:** Mobile team (and anyone owning SendGrid / deliverability).  
**Context:** Admin “preset” waitlist launch email is sent from the **web** app via `POST /api/admin/waitlist/broadcast-launch` using fixed HTML from `buildWaitlistLaunchEmailHtml()` in `apps/web/src/lib/emails/waitlist-launch-email.ts`. SendGrid bills per message.

**Important:** Gmail’s **Primary vs Promotions** decision is **proprietary and unstable** (content, links, engagement, history, bulk patterns). **No code change can guarantee Primary.** If placement shifted after a deploy, treat **correlation as unproven** unless you A/B with the same recipient and controlled sends.

---

## 1. What changed in the “general” email (copy only) — commit `81894e85`

**File:** `apps/web/src/lib/emails/waitlist-launch-email.ts`

| Item | Before (`81894e85^`) | After (`81894e85`, current `main`) |
|------|----------------------|--------------------------------------|
| **Subject** | `SoundBridge is live — and we just made it better` | `SoundBridge is live` |
| **Body** | Two paragraphs about early users, a **sign-in issue at launch**, fix, and **“App Store within 48 hours”**; plus “If you tried to log in and hit an error…” | Single paragraph: thanks for being early; download when ready; sign in with the **same email as the waitlist**. |
| **Layout / CTAs / footer** | Unchanged (same table structure, logo, bullets, two App Store buttons, unsubscribe). | Same. |

**Net:** Only **subject + two body paragraphs** differ. The HTML shell, images, external links (App Store, site), and List-Unsubscribe behavior from SendGrid were **not** changed by `81894e85`.

---

## 2. Full HTML — **previous** general email (before `81894e85`)

Below is the **literal template** returned by `buildWaitlistLaunchEmailHtml` at parent of `81894e85`. Placeholders for a real send:

- `${name}` → HTML-escaped display name from email (e.g. `Asibe`).
- `${escapeHtml(logoUrl)}` → e.g. `https://www.soundbridge.live/images/logo-trans-lockup.svg` (from `NEXT_PUBLIC_SITE_URL` / default site base).
- `${escapeHtml(IOS_APP_STORE_URL)}` → `https://apps.apple.com/gb/app/soundbridge/id6754335651` (from `apps/web/src/lib/app-store-url.ts`).
- `${unsubHref}` → mailto unsubscribe (HTML-escaped `&` in `href`).
- `${escapeHtml(baseNoSlash)}` → site base for footer link.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>SoundBridge</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0A;">
  <tr>
    <td align="center" style="padding:28px 16px 32px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <img src="…logoUrl…" alt="SoundBridge" width="200" height="auto" style="display:block;max-width:220px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
        <tr>
          <td style="color:#FFFFFF;font-size:17px;line-height:1.55;">
            <p style="margin:0 0 20px;">Hey …name…,</p>
            <p style="margin:0 0 20px;">You're on the SoundBridge waitlist — and the app is <strong>live</strong>.</p>
            <p style="margin:0 0 20px;">We opened to early users this week. A small technical issue affected sign-ins for some people right at launch — we caught it, fixed it, and an update is hitting the App Store within 48 hours.</p>
            <p style="margin:0 0 20px;">If you tried to log in and hit an error, that's on us. It's sorted.</p>
            <p style="margin:0 0 12px;font-weight:600;">Here's what's waiting for you on SoundBridge:</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Upload and sell your music directly to fans</td></tr>
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Creator profiles with tracks, albums, and drops</td></tr>
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Live audio sessions with tipping</td></tr>
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Connect and collaborate with other musicians</td></tr>
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Messages, events, opportunities and more</td></tr>
            </table>
            <p style="margin:0 0 28px;color:#D4D4D4;font-size:16px;line-height:1.55;">We're a small team moving fast and building something we genuinely believe in. Your early support means everything.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 0 16px;">
            <a href="…App Store URL…" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#991B1B;color:#FFFFFF !important;text-decoration:none;font-weight:600;font-size:17px;line-height:1.2;padding:16px 36px;border-radius:10px;min-width:240px;text-align:center;border:1px solid #B91C1C;">Download on the App Store</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 0 32px;">
            <a href="…App Store URL…" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#171717;color:#FAFAFA !important;text-decoration:none;font-weight:600;font-size:16px;line-height:1.2;padding:14px 32px;border-radius:10px;min-width:220px;text-align:center;border:1px solid #404040;">Create your account</a>
          </td>
        </tr>
        <tr>
          <td style="color:#A3A3A3;font-size:16px;line-height:1.55;padding-top:8px;">
            <p style="margin:0;">— Justice, SoundBridge</p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:40px;border-top:1px solid #262626;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#737373;text-align:center;">
              <a href="…unsubscribe mailto…" style="color:#A3A3A3;text-decoration:underline;">Unsubscribe</a>
              &nbsp;·&nbsp;
              <a href="…site base…" style="color:#A3A3A3;text-decoration:underline;">soundbridge.live</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
```

---

## 3. Full HTML — **current** general email (after `81894e85`)

Same shell as above; **only** these inner lines differ in the main content block:

```html
<p style="margin:0 0 20px;">Hey …name…,</p>
<p style="margin:0 0 20px;">You're on the SoundBridge waitlist — and the app is <strong>live</strong>.</p>
<p style="margin:0 0 20px;">Thank you for being early. Download the app when you're ready and sign in with the email you used on the waitlist.</p>
<p style="margin:0 0 12px;font-weight:600;">Here's what's waiting for you on SoundBridge:</p>
```

(All following rows: feature bullets, closing paragraph, two App Store buttons, sign-off, footer — **unchanged** from section 2.)

---

## 4. Other web changes that touch the **same** send path (not HTML body of preset, but pipeline)

These commits are on `main` and affect **waitlist / broadcast** or **SendGrid** behavior around the same time as the launch email work.

| Commit | Summary |
|--------|---------|
| `a20c09cc` | SendGrid: HTML sends also get auto **plain-text** part; default **categories** adjusted toward transactional (see repo diff on `sendgrid-service.ts` and admin waitlist routes). |
| `30b8f745` | App Store URL constant + waitlist API / placeholders; launch template still server-built. |
| `594ac84f` | Legacy **`/auth/sign-up`** href rewrite in custom HTML; **`{{app_store_url}}`**; **`next.config`** redirects `/auth/sign-up` → `/signup`; **SendGrid `categories` on broadcast-launch** simplified (see below); pricing/help link fixes; admin “load template” for **custom** HTML only. |
| `81894e85` | Launch email **copy + subject** only (this doc §1–3). |

### 4.1 SendGrid `categories` on **preset** launch (`broadcast-launch/route.ts`)

**Before commit `594ac84f`:**

- Test send: `['waitlist_launch', 'waitlist_broadcast', 'transactional', 'waitlist_launch_test']`
- Bulk send: `['waitlist_launch', 'waitlist_broadcast', 'transactional']`

**After `594ac84f` (still true at time of writing):**

- Test send: `['transactional', 'waitlist_launch_test']`
- Bulk send: `['transactional']`

**Note:** SendGrid `categories` are primarily for **SendGrid reporting**. Whether Gmail reads them is **not documented** by Google; treat as **unknown** for Promotions.

### 4.2 Headers on HTML sends (`sendgrid-service.ts`)

`sendHtmlEmail` / batch sends include **List-Unsubscribe** (mailto) and **List-Unsubscribe-Post** where implemented. Bulk/marketing-style messages often carry List-Unsubscribe; Gmail may still route to Promotions for other reasons (links, copy, volume).

---

## 5. Cost and ownership

- **SendGrid** charges by message; **web** admin triggers bulk sends to the waitlist dedupe list (`broadcast-launch` / `send-custom`).
- **Mobile** is not required to change app code for this preset HTML, but **deliverability** (SPF/DKIM/DMARC on the From domain, From alignment, reputation, throttling) is a shared ops concern with whoever owns DNS + SendGrid.

---

## 6. Suggested next steps for the team

1. **Revert launch copy only** if product prefers the old subject/body: restore `81894e85^` version of `waitlist-launch-email.ts` (or cherry-pick inverse of `81894e85`). That is **independent** of Promotions but restores prior wording.
2. **A/B test** same recipient, two sends days apart, old vs new HTML — single variable.
3. **SendGrid + Google Postmaster** for domain reputation; confirm **From** domain matches authenticated sending domain.
4. If desired, **restore prior SendGrid `categories`** on `broadcast-launch` for parity with pre-`594ac84f` (low risk, mainly analytics).

---

## 7. Source map (web)

| Piece | Path |
|-------|------|
| Preset HTML + subject | `apps/web/src/lib/emails/waitlist-launch-email.ts` |
| API that sends preset | `apps/web/app/api/admin/waitlist/broadcast-launch/route.ts` |
| SendGrid transport | `apps/web/src/lib/sendgrid-service.ts` |
| Admin UI (preset + custom) | `apps/web/src/components/admin/WaitlistEmailCampaignsPanel.tsx` |

---

*Document generated for internal handoff. Commit references are from `main` as of the waitlist email workstream.*
