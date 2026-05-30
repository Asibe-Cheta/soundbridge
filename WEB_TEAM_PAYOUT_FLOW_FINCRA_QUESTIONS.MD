# Web Team — Payout Flow Clarification + Fincra Questions

**From:** Mobile team / Justice  
**Date:** 2026-05-29  
**Priority:** High — needed before we can confirm Fincra is live for African creators

---

## What mobile now understands about the flow

Here is our best understanding of the full money flow end to end.
Please correct anything that is wrong.

### Inflow (how money enters SoundBridge)

All tips are collected in USD via Stripe.

```
User tips creator
  → Stripe Payment Sheet (USD)
  → SoundBridge Stripe account (UK)
  → Creator balance credited in Supabase (wallet_transactions table)
```

There is no other inflow path. No creator pays into SoundBridge via Fincra.
SoundBridge collects all money, holds it, and pays out on request.

### Outflow — Stripe rail (non-African creators)

```
Creator requests payout (mobile or web)
  → /api/payouts/request
  → Admin approves in dashboard
  → Backend executes Stripe payout to creator's connected bank
  → Creator receives GBP / EUR / USD
```

### Outflow — Fincra rail (African creators: NGN / GHS / KES)

This is what we need you to confirm is correct:

```
Creator requests payout (mobile or web)
  → /api/payouts/request
  → Admin approves in dashboard
  → Backend calls Fincra payout API
  → Fincra debits SoundBridge's Fincra wallet
  → Creator receives NGN / GHS / KES in their local bank account
```

---

## The problem we need your help with

Fincra has told us they cannot enable **GBP/USD wallet funding** until we
reach £100,000 annual processing volume through them. Their email says:

> "our current partner requires a minimum annual processing volume of
> GBP 100,000 to support this service."

This creates a possible blocker: if the Fincra payout backend requires a
**GBP-funded Fincra wallet** as the source of funds, then African creator
payouts are currently blocked.

---

## Specific questions for the web team

**1. Has any Fincra payout actually been executed successfully in production?**

If yes — what source currency did the Fincra wallet use? GBP, USD, or something
else? We need to know if the GBP/USD funding restriction is already a live
blocker or not yet.

**2. What source currency does the backend pass to Fincra today?**

In the payout API call to Fincra, what is `sourceCurrency`? Is it:
- GBP (debited from a GBP wallet at Fincra)
- USD
- The creator's local currency (NGN/GHS/KES — i.e. a same-currency payout)

**3. Is there a funded Fincra wallet right now?**

Does SoundBridge have any balance sitting in a Fincra wallet today?
If so, what currency and what balance?

**4. Is the Fincra payout backend live and wired to the admin approval flow?**

When an admin approves a payout request for a Nigerian creator, does Fincra
actually get called, or is it still manual / pending implementation?

---

## What Fincra's docs say is possible (for context)

Their public docs confirm NGN-funded NGN payouts are available without a
volume minimum — same-currency local transfers settle T+0.

If SoundBridge manually tops up a Fincra NGN wallet (or receives NGN via
a Fincra virtual account), it can pay Nigerian creators in NGN without
needing the GBP/USD cross-currency route — which is the route Fincra just
restricted.

The question is whether switching to same-currency NGN payouts is feasible
for us, or whether the cross-currency GBP→NGN route is baked into the
current backend implementation.

---

## What mobile has already cleaned up

- All Wise references removed from mobile app (RequestPayoutScreen,
  WalletScreen, CountryAwareBankForm)
- Mobile payout UI now says "via Fincra" for African currencies
- `src/lib/wise/` directory exists as dead code — no screens or services
  import it; can be deleted from the repo when convenient

---

## Summary of what we need from you

| Question | Why it matters |
|---|---|
| Has a Fincra payout actually fired? | Confirms whether we have a blocker now or only in theory |
| What `sourceCurrency` is used? | Tells us if we're on the blocked GBP→NGN route |
| Is there a funded Fincra wallet? | Determines if payouts can execute at all |
| Is admin approval → Fincra fully wired? | Closes the loop on end-to-end readiness |
| Can we switch to NGN same-currency payouts? | Potential fix if GBP route is blocked |

Happy to jump on a call if easier.

---

## Web team response (2026-05-29)

Mobile’s **corrected model is right**. The earlier idea that “NGN flows in via Fincra virtual account from creators” was wrong for SoundBridge. Confirming the actual flow:

### Inflow — confirmed correct

```
User tips creator
  → Stripe Payment Sheet (USD / supported Stripe currencies)
  → SoundBridge Stripe account (UK)
  → Creator balance credited in Supabase (wallet_transactions / user_wallets)
```

There is **no** Fincra collections path in the web backend today. All platform money enters via Stripe.

### Outflow — two paths exist on web

**Path A — Request + admin approve (what mobile uses)**

```
Creator → POST /api/payouts/request
  → payout_requests row (status: pending)
  → Admin → POST /api/admin/payouts/initiate { payout_request_id }
     or batch → POST /api/admin/payouts/batch
  → createFincraTransfer() → Fincra API
  → Webhook POST /api/webhooks/fincra on success/failure
  → Wallet debited on webhook completion (completePayoutRequestBalanceDeduction)
```

**Path B — Instant creator-initiated (legacy / alternate)**

```
Creator → POST /api/payouts/fincra  or  POST /api/payouts/create { method: "fincra" }
  → Debits creator Supabase wallet immediately
  → createFincraTransfer() → Fincra API
```

Mobile’s doc describes **Path A**, which is wired and live in code (`/admin/payouts` UI + initiate + webhook).

---

## Answers to the five questions

### 1. Has any Fincra payout actually fired successfully in production?

**Updated (Justice, prod): Yes — the integration works.** The earlier “Invalid API” errors are resolved. When admin approves an African payout today, Fincra responds with **wallet not funded / insufficient Fincra balance** — which confirms:

- API auth, IP whitelist (Fixie), payload shape, and bank verification path are **working**
- The **only blocker** is SoundBridge’s **Fincra merchant wallet has no (or not enough) balance** to send the transfer
- End-to-end **settlement** (money in creator’s bank) has not happened yet because the Fincra wallet is empty — not because the code path is broken

Once Abeeb confirms how to fund the NGN/GHS/KES wallet (or same-currency top-up), the existing admin → Fincra → webhook flow should complete without further API fixes.

```sql
-- Optional: see recent Fincra attempts in prod
SELECT id, creator_id, amount, currency, status, stripe_transfer_id, rejection_reason, requested_at
FROM payout_requests
WHERE stripe_transfer_id IS NOT NULL
ORDER BY requested_at DESC
LIMIT 20;
```

### 2. What `sourceCurrency` does the backend pass to Fincra today?

See **“Three separate money layers”** below — this is *not* the same as “creator balance is in USD on SoundBridge.”

| Route | `sourceCurrency` sent to **Fincra** | `destinationCurrency` sent to **Fincra** |
|--------|--------------------------------------|------------------------------------------|
| **All Fincra payout paths** | **Auto-match destination** (NGN/GHS/KES) | Creator’s **verified bank currency**: **NGN**, **GHS**, or **KES** |

**Fincra is not NGN-only.** Web supports all three African corridors Fincra handles for us:

| Rail | Currencies | Who gets paid |
|------|------------|----------------|
| **Fincra** | **NGN** (Nigeria), **GHS** (Ghana), **KES** (Kenya) | African creators with verified local bank |
| **Stripe Connect** | **GBP, USD, EUR**, etc. | UK, US, Canada, EU, and other Stripe-supported countries |

When `sourceCurrency !== destinationCurrency`, Fincra treats it as **cross-currency** (generates a quote, debits e.g. GBP wallet at Fincra, sends NGN to bank). When they match (e.g. NGN→NGN), it is **same-currency local payout** — the path Abeeb said is available without the £100k gate, once the **Fincra NGN wallet** is funded.

**Previously** the admin path defaulted to GBP→NGN/GHS/KES because `sourceCurrency` was not set in code. **Now deployed:** `createFincraTransfer` auto-matches `sourceCurrency` to `destinationCurrency` (NGN→NGN, GHS→GHS, KES→KES). Same-currency local payout — the path Abeeb said is available without the £100k gate, once the **Fincra local wallet** is funded.

### 3. Is there a funded Fincra wallet right now?

**Updated (Justice, prod): No — or insufficient balance.** Fincra’s API returns “wallet not funded / insufficient balance” on payout attempts. Supabase creator balances can be healthy while **Fincra’s own merchant wallet** is empty — they are separate pools of money.

- **Supabase `user_wallets`:** internal ledger (what creators “have earned” on SoundBridge)
- **Fincra merchant wallet:** real cash SoundBridge must deposit before Fincra can send to a Nigerian/Ghanaian/Kenyan bank

Check balances in the **Fincra merchant dashboard** (NGN / GHS / KES wallets per corridor).

### 4. Is admin approval → Fincra fully wired?

**Yes, in code:**

- `POST /api/payouts/request` — creator request
- `POST /api/admin/payouts/initiate` — single approve → Fincra
- `POST /api/admin/payouts/batch` — batch pending → Fincra
- `POST /api/webhooks/fincra` — completion / failure + wallet deduction
- Admin UI: `/admin/payouts`

**Caveats:**

- `/api/admin/payouts/fund` is a **no-op** for Fincra (“No manual funding required”) — it does not top up Fincra.
- Wallet deduction for Path A happens on **webhook success**, not at approve time.
- Batch/initiate pass `amount` from `payout_requests.amount` (often **USD**) with `destinationCurrency` = **NGN/GHS/KES** — verify amounts are correct for Fincra (potential FX / unit mismatch to audit separately).

### 5. Can we switch to same-currency African payouts (NGN→NGN, GHS→GHS, KES→KES)?

**Yes — recommended fix** while GBP/USD Fincra funding is blocked:

1. **Top up** the matching **Fincra wallet** for each corridor (NGN wallet for Nigeria payouts, GHS for Ghana, KES for Kenya — confirm with Abeeb).
2. **Change backend** to pass `sourceCurrency` = same as `destinationCurrency` for that payout (no cross-currency quote).
3. **FX at payout time:** Stripe may collect tips/sales in USD, GBP, EUR, etc., and creator balances may be stored in **USD** (or other) in Supabase — but Fincra pays **local African currency**. SoundBridge must convert “$X owed to creator” → “₦Y to send” (or GHS/KES) before calling Fincra. That conversion is our responsibility, not Fincra’s GBP wallet.

**Not built yet:** Auto USD→NGN/GHS/KES conversion, Fincra balance API in admin, NGN virtual account collections.

---

## Summary table (web team)

| Question | Answer |
|----------|--------|
| Mobile inflow model correct? | **Yes** — Stripe only, no Fincra inflow |
| Fincra payout works in prod? | **Yes (API)** — fails only on **unfunded / insufficient Fincra wallet** |
| Fincra corridors | **NGN + GHS + KES** (Africa). **Stripe** for UK / US / CA / EU / etc. |
| Current `sourceCurrency` at Fincra | **Auto-match destination** — NGN→NGN, GHS→GHS, KES→KES (deployed) |
| Funded Fincra wallet? | **No / insufficient** (confirmed by Fincra error message) |
| Admin → Fincra wired? | **Yes** (initiate, batch, webhook) |
| Fix while GBP blocked? | Fund **local Fincra wallets** + same-currency payouts + FX from Supabase balance |

---

## Three separate money layers (read this first)

People mix these up. They are **three different wallets in three different systems**.

### Layer 1 — Fan pays (Stripe Payment Sheet)

Tips, content sales, etc. can be charged in **whatever currency Stripe supports** for that payment (often **USD**, also **GBP, EUR**, and others depending on setup). That money lands in **SoundBridge’s Stripe account** (UK entity).

This is **not** “everything is dollars only” — Stripe can charge multiple currencies — but many tips do settle as **USD** in practice.

### Layer 2 — Creator balance (Supabase / SoundBridge ledger)

When a tip or sale completes, we **credit the creator’s balance** in our database (`user_wallets`, `wallet_transactions`). That balance is recorded in a **currency field** — commonly **USD**, sometimes **GBP** or others depending on how the earning was booked.

This is **accounting inside SoundBridge**. It is **not** cash sitting in Fincra. The creator “has $50” on the platform means we owe them $50 from what we collected via Stripe (minus fees).

### Layer 3 — Payout execution (Fincra or Stripe)

When we actually **send money to the creator’s bank**, we use a **payout provider**:

**Stripe Connect** (non-African creators — UK, US, Canada, EU, …):

```
Supabase balance → Stripe transfer → creator’s bank in GBP / USD / EUR
```

**Fincra** (African creators — Nigeria, Ghana, Kenya):

```
SoundBridge’s Fincra merchant wallet → creator’s local bank in NGN / GHS / KES
```

Fincra’s API asks two questions on every payout:

| Field | Meaning |
|-------|---------|
| **`sourceCurrency`** | Which **Fincra wallet** SoundBridge pays **from** (e.g. GBP wallet at Fincra, or NGN wallet at Fincra) |
| **`destinationCurrency`** | What **currency the creator’s bank receives** (NGN, GHS, or KES — from their verified bank account) |

**Example today (admin approve Nigerian creator):**

```
sourceCurrency:      GBP     ← Fincra tries to debit SoundBridge’s GBP wallet at Fincra
destinationCurrency: NGN     ← Creator’s Nigerian bank receives naira
amount:              (from payout request)
```

Fincra then FX-converts GBP → NGN internally (cross-currency quote). That requires a **funded GBP wallet at Fincra** — which Abeeb blocked until £100k volume.

**Example we want (same-currency Nigeria):**

```
sourceCurrency:      NGN     ← Debit SoundBridge’s NGN wallet at Fincra (you top this up manually)
destinationCurrency: NGN     ← Creator’s bank receives naira
amount:              ₦ equivalent of what we owe them
```

No GBP involved. No £100k gate. But **you must put naira into Fincra first**.

**Ghana / Kenya:** same pattern with **GHS→GHS** and **KES→KES** from funded GHS/KES wallets at Fincra.

### How Layer 2 and Layer 3 connect

When a Nigerian creator with **$30 USD** in Supabase requests payout:

1. We agree they are owed **$30** (Layer 2 — our ledger).
2. We convert **$30 → ₦X** at our chosen rate (product decision — not automatic in code yet).
3. We call Fincra: pay **₦X** from our **NGN Fincra wallet** to their Nigerian bank (Layer 3).
4. On success, we **debit $30** from their Supabase balance (webhook).

Supabase USD and Fincra NGN are **linked by our business logic**, not automatically by currency matching in the API.

---

## Recommended next steps

1. **Abeeb (when back after Eid):** Confirm how to fund **NGN / GHS / KES wallets** at Fincra and run **same-currency** payouts at current volume (without GBP/USD wallet enablement).
2. **Ops:** Top up the relevant **Fincra wallet(s)** once Abeeb confirms funding instructions.
3. **Web:** ~~Pass `sourceCurrency` matching destination~~ **Done** — `createFincraTransfer` defaults to same-currency (NGN/GHS/KES).
4. **Product:** Define FX rule — USD (or GBP) Supabase balance → local amount sent via Fincra.

**Status:** Integration is **production-ready**. `sourceCurrency` auto-matches destination. Waiting on **Fincra wallet funding** (NGN/GHS/KES) — not a broken API.

