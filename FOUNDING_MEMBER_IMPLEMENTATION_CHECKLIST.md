# Founding Member Implementation Checklist

First 100 waitlist (excluding asibechetachukwu@gmail.com and soundbridgeliveuk@gmail.com): anticipatory email, 10% off forever on Premium/Unlimited, Founding Member badge. No manual promo code; backend/app logic only.

---

## Your tasks (you)

Do these first so Web and Mobile have what they need.

### 1. SendGrid: Founding Member email template

- [ ] In [SendGrid](https://app.sendgrid.com) → **Email API** → **Dynamic Templates**, create a new template.
- [ ] Name it e.g. **Founding Member – Anticipatory**.
- [ ] Design the template with merge fields (Handlebars) for:
  - `{{name}}` – greeting (e.g. part before `@` or "there")
  - `{{signup_date}}` – "You've been waiting since [date]"
  - `{{cta_url}}` – e.g. App Store link or `https://soundbridge.live` (or both in copy)
- [ ] Use this body (adapt layout to your template):

  **Subject:** You're a SoundBridge Founding Member 🎉

  **Body (concept):**
  - Hey {{name}},
  - You were one of the first 100 to join the SoundBridge waitlist...
  - Starting April 1st, SoundBridge goes live.
  - As a Founding Member you get: 10% off forever, Founding Member badge, Early access March 27th, Priority support.
  - This offer expires March 31st.
  - [Claim Your Founding Member Status – Download iOS App] → {{cta_url}}
  - You've been waiting since {{signup_date}}. Let's make this official.
  - See you inside, Justice Asibe. P.S. Forward to the next 100...

- [ ] Save the template and copy the **Template ID** (e.g. `d-xxxxxxxx`).
- [ ] Add to Vercel (or your env):  
  `SENDGRID_FOUNDING_MEMBER_TEMPLATE_ID=d-xxxxxxxx`

### 2. Founding Member list (first 100, excluded emails)

- [ ] From Supabase (or admin export): run a query that returns the **first 100** waitlist rows by `signed_up_at ASC`, **excluding** `asibechetachukwu@gmail.com` and `soundbridgeliveuk@gmail.com`.
- [ ] Export to CSV/JSON with at least: `email`, `signed_up_at` (for the email merge).
- [ ] Keep this list as the **single source of truth** for “Founding Member” (same list for email send, web discount, mobile discount, badge).
- [ ] Optional: once the `founding_members` table exists (see Web section), backfill it with these 100 emails; otherwise provide the list to the dev who implements the backfill.

### 3. Stripe: 10% off coupon (what worked)

- [x] Create coupon in dashboard: **Name** e.g. “Founding Members”, **10% off**, **Apply to specific products** = Premium Monthly/Yearly + Unlimited Monthly/Yearly. **Duration** = **Multiple months** (e.g. 10,000 months) — not “Forever”, which was blocked. **Do not** check “Limit the date range when customers can redeem this coupon” (you can’t combine a redeem-by date with a long duration; leave it unchecked).
- [ ] Copy the **Coupon ID** and add to Vercel and `.env.local`:  
  `STRIPE_FOUNDING_MEMBER_COUPON_ID=<coupon_id>`  
  The web app will apply this at checkout when the user’s email is in `founding_members` (see Web section).

### 4. Send the Founding Member email (on your chosen date)

- [ ] Use either:
  - A one-off script/cron that calls your backend “send founding member emails” endpoint (if implemented), or
  - SendGrid’s **Marketing** → **Single Sends** (or API) with the template and the CSV of 100 recipients, mapping columns to `name`, `signup_date`, `cta_url`.
- [ ] Send on the date you chose (e.g. before March 27 / April 1).
- [ ] Do **not** send to asibechetachukwu@gmail.com or soundbridgeliveuk@gmail.com (already excluded from the list).

---

## Web app

Backend and frontend changes (web team / codebase).

### 5. Founding Member source of truth in DB

- [ ] Add either:
  - **Option A:** Table `founding_members` with `email` (unique), optional `user_id` (set when user signs up), `created_at`; or
  - **Option B:** Column on `profiles`, e.g. `is_founding_member BOOLEAN DEFAULT false`.
- [ ] Backfill: for each of the 100 emails, insert into `founding_members` or set `profiles.is_founding_member = true` where `auth.users.email` (or profile email) matches. Run once after list is final.
- [ ] Ensure there is a way to resolve “is this user a founding member?” by `user_id` or `email` (e.g. RPC or API used by checkout and profile).

### 6. Checkout: apply 10% for Founding Members (Stripe) — done

- [x] In `apps/web/app/api/stripe/create-checkout-session/route.ts`: after auth, check `founding_members` by user email (service client). If found and `STRIPE_FOUNDING_MEMBER_COUPON_ID` is set, create the checkout session with `discounts: [{ coupon: ... }]`. No promo code; applied automatically for founding members.

### 7. Profile / subscription API: expose Founding Member — done

- [x] `/api/subscription/status` returns `is_founding_member: boolean` (lookup by user email in `founding_members`). Dashboard and badge use it.

### 8. Founding Member badge on web — done

- [x] Subscription dashboard (SubscriptionStatus) shows a “Founding Member” badge when `is_founding_member` is true (red–pink gradient pill next to tier badge).

### 9. Founding Member claim landing page + API (email CTA) — done

- [x] **Landing page** `/founding-member`: Copy + email field (pre-filled if logged in) + “I'm a Founding Member” button. Calls check API and shows success or “not on the list” message with contact hint.
- [x] **API** `POST /api/founding-member/check`: Body `{ email? }` or uses session email. Looks up in `founding_members`, returns `{ found, message }`. Set `{{cta_url}}` in the email to `https://soundbridge.live/founding-member`.

### 10. (Optional) Endpoint to send Founding Member emails

- [ ] If you want a repeatable send from the app: add an admin-only or cron endpoint that loads the 100 from `founding_members` (or waitlist query), builds merge data (`name`, `signup_date`, `cta_url`) per row, and calls `SendGridService.sendTemplatedEmail` with `SENDGRID_FOUNDING_MEMBER_TEMPLATE_ID`. You would then trigger this on the chosen date (cron or manual).

---

## Mobile app

IAP and UI (mobile team).

### 11. Know who is a Founding Member

- [ ] Use the same backend as web: after login, profile or subscription-status API returns `is_founding_member`.
- [ ] Store or use this flag so the paywall / subscription screen can show Founding Member pricing and products.

### 12. IAP: Founding Member products (10% off)

- [ ] **Apple:** In App Store Connect, create separate subscription products for “Founding Member” pricing (e.g. Premium Monthly – Founding Member, Premium Annual – Founding Member, same for Unlimited) at 10% off. Note product IDs.
- [ ] **Google:** In Play Console, create equivalent subscription products (SKUs) at 10% off. Note product IDs.
- [ ] Backend: add these product IDs to `iap_products` (or equivalent config) with the same `tier` (e.g. premium/unlimited) and correct `billing_cycle`, so receipt verification still maps to the right tier.
- [ ] When showing the paywall: if `is_founding_member === true`, show and offer the **Founding Member product IDs**; otherwise show standard product IDs. No manual code entry.

### 13. Founding Member badge on mobile

- [ ] On profile (and anywhere you show tier badges), if `is_founding_member` is true, show a “Founding Member” badge (persistent, independent of current subscription).

### 14. Deep link / CTA from email

- [ ] Email CTA can point to App Store (or a smart link that goes to app if installed, else store). Ensure the link is set in the template as `{{cta_url}}` when you send (you or SendGrid Single Send).

---

## Order of operations (suggested)

1. **You:** Create SendGrid template and env var (step 1).
2. **You:** Export first 100 list and create Stripe coupon; add env vars (steps 2, 3).
3. **Web:** Add founding member storage + backfill, then checkout coupon + profile flag + badge (steps 5–8).
4. **Mobile:** Use profile/API flag, add IAP products and badge (steps 10–12).
5. **You:** Send the email on the chosen date (step 4); optional: use web endpoint from step 9.

---

## Env vars summary

| Variable | Where | Owner |
|----------|--------|--------|
| `SENDGRID_FOUNDING_MEMBER_TEMPLATE_ID` | Vercel / backend | You |
| `STRIPE_FOUNDING_MEMBER_COUPON_ID` | Vercel / backend | You (after Stripe provides coupon) |

---

---

## CTA link: claim flow (landing page + backend check)

**Chosen flow:** The email is sent before launch, and recipients may not be ready to subscribe yet. So the CTA does **not** go to App Store or pricing. Instead:

1. **Link goes to a landing page** (e.g. `https://soundbridge.live/founding-member`). Set `{{cta_url}}` to this URL when sending.
2. **On the landing page** they see copy about Founding Member benefits and a button like **“I am a Founding Member”** (or “Claim my status”).
3. **When they click:** The page either uses their email (if already logged in) or asks them to enter the email they used on the waitlist.
4. **Backend checks:** An API checks whether that email exists in the **list of 100 founding member emails**. The backend must know these emails (e.g. `founding_members` table backfilled with the 100 before launch).
5. **Response:**
   - **If found:** Show a confirmation message (e.g. “You’re confirmed as a Founding Member. When we launch, sign up with this email to get 10% off and your badge.”) Optionally add links to “Get the app when we launch” / “Subscribe on web at launch.”
   - **If not found:** Show a graceful message (e.g. “This email isn’t in our Founding Member list. If you think this is a mistake, reply to this email or contact us at contact@soundbridge.live.”)

**Implications:** (1) Backend must have the 100 emails stored (see Web section: founding member source of truth + backfill). (2) Web app needs: landing page + endpoint that accepts email (or uses session email), looks up in that list, and returns `{ found: true/false }` plus copy for success/graceful denial.

---

## Reference: email copy (for template)

- **Subject:** You're a SoundBridge Founding Member 🎉
- **Greeting:** Hey {{name}},
- **Signup line:** You've been waiting since {{signup_date}}.
- **CTA:** [Claim Your Founding Member Status – Download iOS App] → {{cta_url}}

---

## Email HTML for SendGrid template

Uses **SoundBridge web app colours**: background `#111827`, card `#1a1a1a`, text white/`#D1D5DB`, accent red `#DC2626`, accent pink `#EC4899`, gradient red→pink on CTA. SendGrid Handlebars: `{{name}}`, `{{signup_date}}`, `{{cta_url}}`. Set template **subject** to: `You're a SoundBridge Founding Member 🎉`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're a SoundBridge Founding Member</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #ffffff; background-color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #111827;">
    <tr>
      <td style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2);">
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #ffffff;">You're a SoundBridge Founding Member 🎉</h1>
              <p style="margin: 0 0 16px 0; color: #ffffff;">Hey {{name}},</p>
              <p style="margin: 0 0 16px 0; color: #D1D5DB;">You were one of the first 100 people to join the SoundBridge waitlist when we were just an idea. That kind of early belief deserves recognition.</p>
              <p style="margin: 0 0 16px 0; color: #D1D5DB;">Starting April 1st, SoundBridge goes live.</p>
              <p style="margin: 0 0 8px 0; color: #ffffff;"><strong>As a Founding Member, you're getting:</strong></p>
              <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #D1D5DB;">
                <li style="margin-bottom: 6px;"><strong style="color: #EC4899;">10% off forever</strong> – Lock in your rate for life (£6.29/month Premium instead of £6.99)</li>
                <li style="margin-bottom: 6px;"><strong style="color: #EC4899;">Founding Member badge</strong> – Displayed proudly on your profile</li>
                <li style="margin-bottom: 6px;"><strong style="color: #EC4899;">Early access</strong> – Start using the platform March 27th (4 days before public launch)</li>
                <li style="margin-bottom: 6px;"><strong style="color: #EC4899;">Direct line to me</strong> – Priority support; you helped build this</li>
              </ul>
              <p style="margin: 0 0 16px 0; color: #D1D5DB;">This offer expires March 31st. After that, Founding Member status closes forever. The next 225 people get early supporter benefits, but you're the only ones who can claim this.</p>
              <p style="margin: 0 0 24px 0;">
                <a href="{{cta_url}}" style="display: inline-block; padding: 14px 28px; background-color: #DC2626; background: linear-gradient(to right, #DC2626, #EC4899); color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px;">Claim Your Founding Member Status</a>
              </p>
              <p style="margin: 0 0 16px 0; color: #D1D5DB;">You've been waiting since {{signup_date}}. Let's make this official.</p>
              <p style="margin: 0 0 8px 0; color: #ffffff;">See you inside,</p>
              <p style="margin: 0 0 24px 0; color: #ffffff;"><strong>Justice Asibe</strong><br>Founder, SoundBridge</p>
              <p style="margin: 0; font-size: 14px; color: #9CA3AF;">P.S. Know another creator who should be a Founding Member? Forward this email – if they sign up in the next 100, they're in. After that, it's closed.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Merge fields for SendGrid:** `name`, `signup_date`, `cta_url`. Format `signup_date` when sending (e.g. "January 2025" or "15 Jan 2025") so it reads well in the sentence.
