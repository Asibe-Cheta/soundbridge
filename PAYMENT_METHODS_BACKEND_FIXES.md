# Payment Methods Screen — Backend Fixes (Nigerian / African Creators)

## Issue 1 — creator_bank_accounts table / RLS

### Does the table exist?
- **Table name:** `creator_bank_accounts` (use this for Supabase direct queries).
- **Migration:** `migrations/fix_creator_bank_accounts_rls_payment_methods.sql` ensures the table exists and RLS is correct.

### What was fixed
- **RLS:** One set of policies so creators can read/write only their own row:
  - `auth.uid() = user_id` (and `(auth.jwt() ->> 'sub')::uuid = user_id` for Bearer token auth).
- **Policies:** All known policy name variants from previous scripts were dropped and replaced with:
  - `creator_bank_accounts_select_own` (SELECT)
  - `creator_bank_accounts_insert_own` (INSERT)
  - `creator_bank_accounts_update_own` (UPDATE)
  - `creator_bank_accounts_delete_own` (DELETE)
- **Grants:** `GRANT SELECT, INSERT, UPDATE, DELETE ON creator_bank_accounts TO authenticated;`

### Deploy steps
1. Run `migrations/fix_creator_bank_accounts_rls_payment_methods.sql` in the Supabase SQL Editor (or your migration runner) in **production**.
2. After that, direct Supabase queries to `creator_bank_accounts` with the user’s JWT should return their row(s) or an empty result set instead of throwing.

---

## Issue 2 — detectCountryForStripe (Stripe vs Wise flow)

### Endpoint
- **URL:** `GET /api/banking/detect-country-for-stripe`
- **Optional query:** `?country_code=NG` (2-letter ISO). If omitted, the backend uses the authenticated user’s `profiles.country_code`.

### Response
- `supported_by_stripe: true` → show **Stripe Connect** setup.
- `supported_by_stripe: false` → show **Wise bank account** setup.

Additional fields:
- `country_code` — resolved or requested code.
- `supported_by_wise: true | false` — for convenience.

### Country logic
- **Wise countries (supported_by_stripe: false):**  
  NG, GH, KE, EG, ZA, UG, TZ (from `WISE_COUNTRIES` in the codebase).
- **Stripe Connect countries (supported_by_stripe: true):**  
  US, GB, CA, AU, DE, FR, ES, IT, NL, SE, NO, DK, FI, BE, AT, CH, IE, PT, LU, SI, SK, CZ, PL, HU, GR, CY, MT, EE, LV, LT, JP, SG, HK, MY, TH, NZ.
- **Unknown / missing country:**  
  **Defaults to `supported_by_stripe: false`** (and `supported_by_wise: true`) so users are sent to the Wise flow rather than Stripe Connect.

### Example
```http
GET /api/banking/detect-country-for-stripe
Authorization: Bearer <user_jwt>
```
Response for Nigeria (or `?country_code=NG`):
```json
{
  "country_code": "NG",
  "supported_by_stripe": false,
  "supported_by_wise": true
}
```

---

## Summary
1. Run the migration so `creator_bank_accounts` exists and RLS allows `auth.uid() = user_id` (and JWT sub).
2. Use `GET /api/banking/detect-country-for-stripe` (with optional `country_code`) to choose Stripe Connect vs Wise; Nigeria and all Wise countries get `supported_by_stripe: false`; unknown defaults to `false`.
