# PayPal as a Payment Option for One-Time Payments

> **⚠️ Status as of 2026-07-30: Stripe REJECTED PayPal for this account. Read this before
> writing any code.** Stripe's response (verbatim): *"your request does not meet PayPal's
> specific eligibility criteria... PayPal is only available on Stripe for B2C direct
> businesses and merchant-of-record marketplaces in the EU (except Hungary), Liechtenstein,
> Norway, the UK, and Switzerland."* SoundBridge is a multi-sided creator marketplace on
> Stripe Connect destination charges (not the specific "merchant-of-record marketplace"
> account type Stripe means here) serving a global audience, not one confined to that region
> list — so it doesn't qualify under either condition today. **This is not a pending review
> and not a settings problem — it's a hard rejection.** Stripe-native PayPal is not available
> for this account right now. See "Current status & path forward" below before doing anything
> else with this doc.
>
> The backend/reconciliation work described below is still real and still correct — it's just
> dormant until/unless PayPal becomes viable some other way (see below). The "What NOT to do"
> section has a stale line telling you not to build a separate PayPal SDK integration — ignore
> that specific line; it was written before the rejection came in and is superseded by this
> notice.

## Original spec (for context)

Add PayPal as an available payment method for all existing one-time payment flows: Tip Room
tips, Live Request Room tips, in-player music tipping, live audio session tips, event ticket
purchases, and audio material/merchandise purchases. Subscriptions are out of scope.

Priority order: first check if enabling PayPal within Stripe's existing configuration is
sufficient (config + checkout UI change, not a new integration); only build a separate PayPal
SDK integration if Stripe's native support is unavailable or insufficient.

Scope boundaries: one-time payments only, no subscription billing, no changes to creator
payout methods/architecture (this only affects how a *payer* pays, not how creators get paid
out). Transaction records should store which payment method was used (card vs PayPal) for
reconciliation.

## Current status & path forward

Stripe's own priority order for this work was: *"first check if enabling PayPal within
Stripe's existing configuration is sufficient... only build a separate PayPal integration if
Stripe's native support is unavailable or insufficient."* We now know it's unavailable for
this account. The two real options from here:

1. **Build a standalone PayPal integration directly against PayPal's own SDK/APIs** (not
   through Stripe) — the fallback the spec always allowed for, now the only way to actually
   ship this. This is a materially bigger project than "flip a Stripe setting": a separate
   PayPal developer app + credentials, PayPal's own Orders/Checkout API, almost certainly
   PayPal's Partner/Marketplace APIs to replicate the platform-fee + creator-payout split
   Stripe Connect gives us today, a second webhook handler, a second reconciliation path, and
   a payment-method-selection UI added to every checkout flow (Tip Room, Request Room,
   in-player tips, event tickets, content purchases). Nobody should start this without
   confirming it's actually worth the scope first — check with whoever owns this decision
   before picking it up.
2. **Don't build it right now.** Given the added scope, it may not be worth pursuing
   immediately. If that's the call, this doc (and the dormant backend work below) is the
   record of what was tried and why it stopped here.

Whichever way this goes, **do not wait on the Stripe Dashboard toggle** — it will not become
"Enabled" for this account under its current business/region setup. If that assumption ever
changes (e.g. the account becomes eligible some other way), the dormant work below picks back
up immediately with no further backend changes needed.

## What's already done (web team, backend — shared with mobile) — currently dormant

This was built on the assumption that Stripe's native automatic-payment-methods approach would
be sufficient, before the eligibility rejection above came back. Every relevant
PaymentIntent-creation endpoint in this backend now requests
`automatic_payment_methods: { enabled: true }` (or already had it), which makes Stripe
surface PayPal as a selectable, PayPal-branded option automatically once PayPal is turned on
in the Stripe Dashboard — for **both** web and mobile clients, since they call the same API:

- `POST /api/payments/create-intent` (content/merchandise purchases) — added
- `POST /api/events/create-ticket-payment-intent` (event tickets) — added
- `POST /api/payments/tip-room-tip`, `POST /api/payments/fan-landing-tip`,
  `POST /api/request-room/create-payment-intent` — already had it
- `POST /api/payments/create-tip` — the default (non-`apple_pay`/`google_pay`) code path
  already used `automatic_payment_methods`. **This is the endpoint the mobile app's own
  tipping flow already calls** (it's built around Stripe's PaymentSheet customer pattern —
  `ephemeral_key_secret` + `customer_id`), so mobile tipping is already backend-ready too.

Reconciliation (which payment method was actually used, per the spec's requirement): a new
`payment_method_type` column now exists on `platform_revenue`, `content_purchases`,
`request_room_requests`, and `purchased_event_tickets`, populated automatically server-side
at charge-finalization time (see `apps/web/src/lib/stripe-payment-intent-metadata.ts` →
`getPaymentIntentPaymentMethodType`). This runs in the shared webhook/finalize code
(`tip-payment-intent-webhook.ts`, `content-purchase-payment-intent-webhook.ts`,
`request-room-payment-intent-webhook.ts`, `confirm-ticket-purchase/route.ts`), so it fires
regardless of whether the charge originated from web or mobile — **mobile doesn't need to do
anything for this to work.**

Migration: `supabase/migrations/20260730120000_payment_method_type_reconciliation.sql`
(applied).

On web specifically: every checkout UI already used Stripe's modern `PaymentElement` +
`confirmPayment()` (Tip Room, fan-landing/in-player tips, Request Room, content purchase,
event tickets), so no frontend rebuild was needed there — PayPal just appears once enabled.

## If Stripe-native PayPal ever becomes viable (blocked, not actionable right now)

The two items below were the remaining steps for the Stripe-native path. Both are blocked on
the rejection above — nothing to do here unless that changes.

1. **Turn PayPal on in the Stripe Dashboard.** Settings → Payments → **Payment methods** only
   lists *configurations* (groups), not individual method toggles — open the **"Default"** row
   where **Type = "Your platform account"** (`pmc_1Rq1Pl0Bt6mXrdyeWfraTamz`), not a
   connected-account config (destination charges bill against the platform account's
   configuration). PayPal shows there but is stuck at "Pending approval" → now rejected; see
   status banner at the top of this doc.
2. **Register the production domain under Payment method domains** (already done, harmless to
   leave in place either way): `www.soundbridge.live` is registered and Enabled. This step
   would only have mattered for PayPal rendered via Elements/PaymentElement on soundbridge.live
   — irrelevant to a standalone PayPal SDK integration, which wouldn't use Stripe Elements at
   all.

Mobile-side PaymentSheet/redirect configuration and cross-platform QA were also part of this
path — also blocked for the same reason. Don't start either until the status above changes.

## What NOT to do

- Don't touch `POST /api/payments/create-tip`, `create-intent`, `tip-room-tip`,
  `fan-landing-tip`, `create-ticket-payment-intent`, or `request-room/create-payment-intent` —
  their PaymentIntent config is already correct and harmless to leave as-is regardless of which
  path this goes (`automatic_payment_methods` just does nothing extra without an eligible
  redirect-based method enabled).
- Don't add another payment-method column elsewhere, or a new RPC for recording it —
  `platform_revenue.payment_method_type` (and the matching columns on the three other tables
  above) is the reconciliation record, already wired up, and would be reused as-is by a
  standalone PayPal integration too (still "card" vs "paypal", however the charge is made).
- Don't modify `insert_platform_revenue` or the webhook/finalize libs listed above without
  checking here first — they're shared with web.
- **Don't start building a standalone PayPal SDK integration without confirming it first** —
  see "Current status & path forward" above. It's a real option now, not a default to just
  start on.
