# Payout eligibility & bank account verification (mobile team)

## 1. GET /api/payouts/eligibility — never throws

**Fixed.** The handler now always returns **200** with a valid eligibility object. It never throws or returns 5xx for “no verified bank account” or RPC failures.

**Response shape (always 200 when authenticated):**

```json
{
  "success": true,
  "eligible": false,
  "reasons": ["No verified bank account"],
  "eligibility": {
    "eligible": false,
    "reasons": ["No verified bank account"],
    "available_balance": 0,
    "pending_requests": 0,
    "min_payout": 25,
    "withdrawable_amount": 0
  },
  "available_balance": 0,
  "pending_requests": 0,
  "min_payout": 25,
  "withdrawable_amount": 0
}
```

- **`eligible`**: `true` only when the user has at least one verified bank account and sufficient balance (withdrawable ≥ min_payout).
- **`reasons`**: List of blocking reasons, e.g. `"No verified bank account"`, `"Insufficient balance"`, `"Unable to verify bank account"`, `"Unable to determine balance"`, `"Unable to determine eligibility"`.
- Balance fields may be omitted if the balance RPC fails; `min_payout` is always present (25). Use `eligible` + `reasons` for UX; use the numeric fields for display when present.

**Auth:** If the user is not authenticated, the API still returns **401** (no 200 body). Only the *eligibility logic* is non-throwing and always returns a valid object on 200.

**Mobile:** For any **200** response, do not throw. Parse the JSON and use `eligible` and `reasons` (and optional balance fields). Treat `eligible: false` as a valid result and show `reasons` in the UI (e.g. "No verified bank account"); only treat **non-2xx** as a network/error state and then show a generic message or retry — do not use the body’s `error` string to throw, since the API no longer returns 5xx for eligibility.

---

## 2. How a bank account gets marked as verified (`creator_bank_accounts`)

Verification is **automated** in the current flows; there is **no manual admin step** that creators depend on for payouts.

| Flow | How it’s verified | Where it’s set |
|------|-------------------|----------------|
| **Wise-routed currencies** | Treated as verified **on submission**. We do not call Wise for account validation; we set `is_verified = true` and `verification_status = 'verified'` when the currency is in our Wise list (e.g. NGN, GHS, GBP, EUR, etc.). | `apps/web/app/api/user/revenue/bank-account/route.ts` (POST), `apps/web/src/lib/revenue-service.ts` (`setBankAccount`). Both use `isWiseCurrency(currency)` and set `is_verified: isWise`, `verification_status: isWise ? 'verified' : 'pending'`. |
| **Stripe Connect** | Verified when Stripe enables the account. We update `creator_bank_accounts` from the **Stripe webhook** `account.updated`: `is_verified = account.charges_enabled`, `verification_status = account.charges_enabled ? 'verified' : 'pending'`. | `apps/web/app/api/stripe/webhook/route.ts` (case `account.updated`). |

So:

- **Wise path:** Verification is **automated at submission** for Wise-routed currencies (no separate validation call; we trust the currency list and user input).
- **Stripe path:** Verification is **automated via Stripe’s webhook** when Stripe sets `charges_enabled`; no manual admin step.

**Non–Wise, non–Stripe (e.g. manual bank details for a non-Wise currency):** Stored with `verification_status = 'pending'` and `is_verified = false`. There is currently **no automated verification** (e.g. micro-deposits or provider callbacks) for this path. If you rely on that flow at scale, it would need an automated verification step before launch; the current “at scale” paths are Wise (auto-verified on submit) and Stripe (auto-verified via webhook).

**References:**  
- Wise list: `apps/web/src/lib/wise-currencies.ts` (`isWiseCurrency`).  
- One-off data fixes (existing rows): `migrations/wise_creator_bank_accounts_auto_verify.sql`, `migrations/fix_bank_account_is_verified.sql` — these are not the ongoing verification flow.
