# Web Team → Mobile Team: Stripe Connect Verification Response

Answers to the three verification questions about PaymentIntents, Connected Accounts, and webhooks.

---

## 1. Are PaymentIntent creation endpoints using `application_fee_amount` and `transfer_data.destination`?

**Short answer: It depends on the product. Some do (tickets, events, bundles, bookings); tips, paid content, and opportunity projects do not.**

| Revenue stream              | Uses `application_fee_amount` + `transfer_data` at payment time? | Backend behaviour |
|----------------------------|--------------------------------------------------------------------|-------------------|
| **Event tickets**          | ✅ Yes                                                             | `apps/web/app/api/tickets/purchase/route.ts`, `apps/web/app/api/events/create-ticket-payment-intent/route.ts` — platform fee + destination to promoter’s Connect account |
| **Ticket bundles**        | ✅ Yes                                                             | `apps/web/app/api/bundles/purchase/route.ts` — same pattern |
| **Bookings (services)**   | ✅ Yes                                                             | `apps/web/app/api/bookings/[bookingId]/payment-intent/route.ts` — application_fee_amount + transfer_data.destination |
| **Tips**                   | ❌ No                                                              | `apps/web/app/api/payments/create-tip/route.ts` — plain PaymentIntent; all funds go to platform |
| **Paid content (tracks/albums)** | ❌ No                                                        | `apps/web/app/api/content/purchase/route.ts`, `apps/web/app/api/payments/create-intent/route.ts` — plain PaymentIntent; all funds go to platform |
| **Opportunity projects**   | ❌ No (by design — escrow)                                         | See below |

### Opportunity projects: escrow model (not direct split)

- **At agreement/payment:** We create a **plain** PaymentIntent (no `application_fee_amount`, no `transfer_data`). The full amount is charged and held by the **platform** (manual capture).
- **After delivery:** When the poster confirms delivery, we call `stripe.paymentIntents.capture()` and then `stripe.transfers.create({ amount: creator_payout_amount, destination: creator_stripe_account_id })` so the creator’s share is sent to their Connect account. The platform keeps the remainder (platform fee) in the platform account.
- **File:** `apps/web/app/api/opportunity-projects/[id]/confirm-delivery/route.ts` performs the capture and transfer.

So for opportunity projects, SoundBridge does collect and keep the fee, and creators get their share, but only **after** delivery via a separate transfer, not via a split at payment time.

**If you want opportunity projects to use the same “direct split at payment” pattern as tickets** (money split at charge time with `application_fee_amount` + `transfer_data.destination`), that would require a backend change: create the PaymentIntent with those fields and the creator’s Connect account as destination, and adjust the post-payment flow (e.g. no later transfer on confirm-delivery for that share). Right now we do not do that.

---

## 2. Do creators have Stripe Connected Accounts set up?

**Yes.** The backend uses Stripe Connect and stores the Connect account ID.

- **Table:** `creator_bank_accounts` has a `stripe_account_id` column (Stripe Connect account id, e.g. `acct_xxx`). This is what we use for:
  - Opportunity project payouts (confirm-delivery)
  - Event/ticket destination (promoter = creator)
  - Bookings destination
  - Payouts / withdrawals
- **Other:** There is also `provider_connect_accounts.stripe_account_id` in migrations; live payout/transfer code uses `creator_bank_accounts.stripe_account_id`.
- **Profiles:** Some code paths also check or store `stripe_account_id` on `profiles` (e.g. event ticket flow fallback). So creators are expected to have completed Connect onboarding and have `stripe_account_id` set (in `creator_bank_accounts` and/or `profiles`) for payouts and, where used, for `transfer_data.destination`.

Without a Connect account, we cannot send the creator’s share; for opportunity projects we still capture and keep the full amount, but the transfer step is skipped if `creator_bank_accounts.stripe_account_id` is missing (project is still marked completed, but no transfer is created).

---

## 3. Are Stripe webhooks listening for `payment_intent.succeeded` to update balances?

**Yes for the flows we handle.** We do not have a single “wallet balance” update for every payment; we update the relevant record and send notifications.

- **Opportunity projects:**  
  `apps/web/app/api/stripe/webhook/route.ts` handles `payment_intent.succeeded`. When `metadata.project_source === 'opportunity'` it:
  - Finds the `opportunity_projects` row by `stripe_payment_intent_id`
  - Updates project status to `awaiting_acceptance`
  - Updates the related interest to `accepted`
  - Inserts a system message and a notification for the creator (“Agreement Offer Received”)
- **Other payment types:**  
  `apps/web/app/api/payments/webhook/route.ts` and `apps/web/app/api/webhooks/stripe-tickets/route.ts` also handle `payment_intent.succeeded` for tips, content, and tickets (create/update purchase records, send “Payment received” style notifications, mark as paid). We do not maintain a single “balance” field updated by webhooks for all types; we update the specific tables (e.g. opportunity_projects, content_purchases, ticket purchases) and trigger notifications.

So: **Yes, we listen for `payment_intent.succeeded` and update project/ticket/purchase state and send notifications.** If “balances” on mobile means those records and notifications, the backend supports that. If you have a separate wallet balance that should be credited on every payment, that would need to be implemented (and we can align on where it lives and how webhooks update it).

---

## Summary for mobile

| Question | Answer |
|----------|--------|
| 1. `application_fee_amount` + `transfer_data.destination` on PaymentIntents? | **Tickets, bundles, bookings: yes.** Tips, paid content: no (all to platform). Opportunity projects: no at payment time; we use **escrow + later transfer** to creator’s `stripe_account_id`. |
| 2. Creators have Stripe Connected Accounts? | **Yes.** Stored in `creator_bank_accounts.stripe_account_id` (and sometimes `profiles.stripe_account_id`). Required for payouts and for destination splits. |
| 3. Webhooks for `payment_intent.succeeded`? | **Yes.** Opportunity projects, tips, content, and tickets all have handlers that update DB state and send notifications. No single “wallet balance” is updated for every payment type. |

**Bottom line:** The mobile fee breakdown (e.g. 12% platform / 88% creator for opportunity projects) matches what we store and pay out: we take the platform fee and send the creator share via `stripe.transfers.create` to their Connect account on confirm-delivery. For tickets/events/bundles/bookings, the split is done at charge time with `application_fee_amount` and `transfer_data.destination`. If you want opportunity projects to use the same “direct split at payment” pattern, that would be a backend change we can spec out.
