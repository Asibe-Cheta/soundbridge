# Stripe PaymentIntent metadata for CSV / Sigma (mobile team)

Every PaymentIntent created by the web app now includes the standard metadata so Stripe CSV export and Sigma are useful.

## Required metadata on every PaymentIntent

| Key | Description | Example |
|-----|-------------|---------|
| `charge_type` | One of: `gig_payment`, `tip`, `event_ticket`, `audio_sale`, `subscription` | `'gig_payment'` |
| `platform_fee_amount` | Platform fee in smallest currency unit (pence/cents) | `'375'` |
| `platform_fee_percent` | Platform fee as integer percent | `'15'` |
| `creator_payout_amount` | Amount owed to creator in smallest currency unit | `'2125'` |
| `creator_id` | Creator user UUID (empty string when not applicable, e.g. urgent gig before assignee) | `'uuid'` |
| `stripe_payment_intent_id` | Same as the PaymentIntent id (`pi_xxx`) | `'pi_xxx'` |

`stripe_payment_intent_id` is set on the PaymentIntent **after** creation via an update, so it is present on the object (and in exports) for every charge.

## Where it’s applied

- **Tips** – `POST /api/payments/create-tip` → `charge_type: 'tip'`
- **Content / audio purchase** – `POST /api/content/purchase`, `POST /api/payments/create-intent` → `charge_type: 'audio_sale'`
- **Event tickets** – `POST /api/events/create-ticket-payment-intent`, `POST /api/tickets/purchase`, `POST /api/bundles/purchase` → `charge_type: 'event_ticket'`
- **Gig / project payments** – opportunity accept, retry-payment, bookings payment-intent → `charge_type: 'gig_payment'`
- **Urgent gigs** – `POST /api/gigs/urgent` → `charge_type: 'gig_payment'` (creator_id `''` until assignee exists)

Subscription PaymentIntents (Checkout or Customer portal) are created by Stripe; we can add metadata there in a follow-up if needed.

## Implementation

- Shared helper: `apps/web/src/lib/stripe-payment-intent-metadata.ts`
  - `addStripePaymentIntentIdToMetadata(stripe, paymentIntentId, existingMetadata)` – called after each `paymentIntents.create` to set `stripe_payment_intent_id` on the PI.

All PI creation routes now set the six keys above (with `creator_id` and/or fee fields as appropriate) and call the helper so CSV and Sigma have a consistent view of every charge.
