# WEB_TEAM_TIP_CURRENCY_FIX.md

**Date:** 2026-02-28
**Priority:** MEDIUM
**For:** Backend team

---

## The Problem

Tips are currently hardcoded to charge in **USD** on the mobile client:

```typescript
// src/components/TipModal.tsx — line 134
currency: 'USD',
```

This means:
- A UK user tipping a UK creator is charged in **USD**, not GBP
- A Nigerian user tipping a Nigerian creator is charged in **USD**, not NGN
- The creator's wallet accumulates in USD regardless of their region

This is inconsistent with the rest of the wallet system, which is already currency-aware (`creatorRevenue?.currency || 'USD'`, withdrawal amounts formatted per wallet currency, Wise payouts in local currency).

---

## What Needs to Change

### Backend — `POST /api/payments/create-tip`

The endpoint already returns `platformFee` and `creatorEarnings`. Add one more field to the response:

```typescript
// Existing response shape
{
  paymentIntentId: string
  clientSecret: string
  tipId: string
  platformFee: number
  creatorEarnings: number
  // ADD:
  currency: string   // e.g. 'GBP', 'USD', 'NGN' — the currency the charge was made in
}
```

### How to determine the tip currency

Use the **creator's wallet currency** as the charge currency, with USD as the fallback:

```typescript
// In your create-tip handler:
const creatorWallet = await db.creator_wallets
  .findOne({ user_id: creatorId });

const tipCurrency = creatorWallet?.currency ?? 'USD';
```

Then create the Stripe PaymentIntent in that currency:

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(tipAmount * 100),
  currency: tipCurrency.toLowerCase(),   // stripe expects lowercase: 'gbp', 'usd'
  // ... rest of params
});
```

### Constraint: Stripe minimum amounts per currency

Stripe has minimum charge amounts per currency. Make sure the validation layer accounts for this:

| Currency | Stripe minimum |
|----------|---------------|
| USD | $0.50 |
| GBP | £0.30 |
| EUR | €0.50 |
| NGN | ₦50 (Wise handles NGN, not Stripe directly) |

For currencies Stripe doesn't support directly (NGN, KES, GHS, etc.) — tip should remain in USD, and Wise handles the conversion at payout time. The backend already knows which currencies are Stripe-supported vs Wise-routed via the `supported_by_stripe` flag used in the withdrawal flow.

### Suggested logic

```typescript
const STRIPE_SUPPORTED_CURRENCIES = [
  'usd', 'gbp', 'eur', 'cad', 'aud', 'sgd', 'hkd', 'jpy',
  'nzd', 'dkk', 'sek', 'nok', 'chf', 'mxn', 'brl', 'inr',
  // ... full Stripe currency list
];

const creatorCurrency = (creatorWallet?.currency ?? 'USD').toLowerCase();
const tipCurrency = STRIPE_SUPPORTED_CURRENCIES.includes(creatorCurrency)
  ? creatorCurrency
  : 'usd'; // fallback — Wise converts at payout
```

---

## Mobile Changes Required (after backend ships)

Once the backend returns `currency` in the create-tip response, the mobile client needs one small change:

```typescript
// src/components/TipModal.tsx — line 134
// BEFORE:
currency: 'USD',

// AFTER:
// Remove hardcoded currency from request body entirely —
// let the backend determine it from the creator's wallet.
// The response will include the currency used.
```

The mobile team will make this change once you confirm the response includes `currency`. Let us know when deployed.

---

## Impact

| Region | Before | After |
|--------|--------|-------|
| UK creator tipped by UK user | Charged in USD | Charged in GBP ✅ |
| EU creator tipped by EU user | Charged in USD | Charged in EUR ✅ |
| Nigerian creator tipped | Charged in USD | Still USD (Wise converts at payout) — no change |
| US creator | Charged in USD | Charged in USD — no change |

---

## No Breaking Changes

- Tips already in the database with `currency = 'USD'` are unaffected
- The wallet credit logic stays the same — backend already records `currency` per transaction
- Existing tip history displays correctly regardless of this change

---

*Related mobile file: `src/components/TipModal.tsx` line 134*
*Related mobile file: `src/components/live-sessions/LiveTippingModal.tsx`*
