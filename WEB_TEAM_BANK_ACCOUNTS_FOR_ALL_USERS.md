# WEB_TEAM_BANK_ACCOUNTS_FOR_ALL_USERS.md

**Date:** 2026-03-01
**Priority:** HIGH
**For:** Backend team

---

## Problem

Bank accounts (withdrawal methods) are currently only accessible to users with the `creator` role. Regular users who attempt to add a bank account via `POST /api/wallet/withdrawal-methods` receive an error.

This is incorrect. **All users should be able to add a bank account**, regardless of role. Any user can earn money on SoundBridge — through gigs, tips, ticket sales, or other means — and must be able to withdraw those funds.

---

## What Needs to Change

### 1. Remove the creator-only gate on the withdrawal methods endpoint

```
POST   /api/wallet/withdrawal-methods        ← remove creator role check
GET    /api/wallet/withdrawal-methods        ← remove creator role check
PUT    /api/wallet/withdrawal-methods/:id    ← remove creator role check
DELETE /api/wallet/withdrawal-methods/:id    ← remove creator role check
```

The only auth check needed is that the user is **authenticated** (`Bearer` token valid). No role check.

### 2. Rename or open the `creator_bank_accounts` table

The Supabase table is currently named `creator_bank_accounts`. This name implies creator-only. Options:

**Option A (recommended):** Rename to `user_bank_accounts` and update all references.

**Option B (minimal change):** Keep the table name but update the RLS policy to allow any authenticated user — not just creators:

```sql
-- Current (creator-only) policy — REMOVE THIS:
CREATE POLICY "creators_own_bank_accounts" ON creator_bank_accounts
  FOR ALL USING (auth.uid() = creator_id);

-- Replace with (all users):
CREATE POLICY "users_own_bank_accounts" ON creator_bank_accounts
  FOR ALL USING (auth.uid() = user_id);
```

Note: if the column is currently named `creator_id`, rename it to `user_id` (or add `user_id` as an alias).

### 3. Update the Stripe Connect and Wise payout flows

If payout eligibility is currently gated on `is_creator = true`, remove that gate too. The check should only be:

- User has a verified bank account on file
- User has a positive available balance (≥ minimum withdrawal threshold)

---

## Why This Matters

The mobile app (`AddWithdrawalMethodScreen`, `CountryAwareBankForm`) already has **no role restriction** — it renders the Add Bank Account form for any authenticated user. The backend is the only place blocking non-creators. This mismatch means non-creator users see the form, fill it in, tap "Add Bank Account", and get a silent error — a broken experience.

---

## Mobile Context

The mobile calls:

```
POST /api/wallet/withdrawal-methods
Authorization: Bearer {user_token}

Body:
{
  "method_type": "bank_transfer",
  "method_name": "My Bank Account",
  "bank_details": {
    "account_holder_name": "Justice Asibe",
    "bank_name": "Barclays",
    "account_number": "93792331",
    "routing_number": "209254",
    "account_type": "savings",
    "currency": "GBP",
    "country": "GB"
  }
}
```

This call is made for any logged-in user — creator or not.

---

---

## Additional Issues Found (2026-03-01)

### 4. `creator_bank_accounts.is_active` column is missing

**Error observed in mobile:**
```
column creator_bank_accounts.is_active does not exist (code: 42703)
```

The mobile queries:
```sql
SELECT * FROM creator_bank_accounts
WHERE user_id = :uid AND is_active = true
ORDER BY created_at DESC LIMIT 1
```

The `is_active` column does not exist. The mobile catches the error and returns null (user sees "No bank account" state).

**Fix — add the missing column:**
```sql
ALTER TABLE creator_bank_accounts
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
```

If the table uses a different column for "active" status (e.g. `active`, `enabled`), either add `is_active` as an alias or let us know the correct column name so we can update the mobile query.

---

### 5. `GET /api/stripe/detect-country` — 404

**Error observed:** The endpoint returns a full Next.js 404 HTML page instead of JSON.

**Purpose:** Called on the Payment Methods screen to auto-detect the user's country (from IP or profile) so Stripe Connect onboarding can be pre-populated with the correct country.

**Expected response:**
```json
{
  "country": "GB",
  "currency": "GBP"
}
```

The mobile falls back gracefully (uses the user's profile country if detect-country fails), so this is non-blocking. But building the endpoint will improve the onboarding experience for users whose profile country differs from their billing country.

**Suggested implementation:**
```typescript
// /api/stripe/detect-country
// 1. Check CF-IPCountry header (Cloudflare adds this automatically on Vercel)
// 2. Fall back to profile.country from Supabase
// 3. Map country → default currency

const country = req.headers['cf-ipcountry'] || userProfile.country || 'GB';
const currencyMap = { GB: 'GBP', NG: 'NGN', GH: 'GHS', US: 'USD', ... };
return res.json({ country, currency: currencyMap[country] ?? 'USD' });
```

---

## Related Documents

- `WEB_TEAM_BANK_LIST_API_REQUIRED.md` — bank list endpoint (Wise + APILayer)
- `PAYMENT_INTEGRATION_STRIPE_WISE.md` — Wise and Stripe integration details

---

*Document created: 2026-03-01 | Updated: 2026-03-01 (sections 4–5 added)*
