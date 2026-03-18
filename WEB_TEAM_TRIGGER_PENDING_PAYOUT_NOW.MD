# Web Team: Manually Trigger Pending Payout (Test End-to-End)

## Status

**Implemented.** `POST /api/admin/payouts/initiate` accepts `payout_request_id` in the body. It looks up the pending request, the creator’s verified bank account, then calls Wise with `sourceCurrency: "USD"`, `sourceAmount`, and `targetCurrency` from the bank. It updates `payout_requests.status` to `processing` → `completed` (or `failed` on error) and stores the Wise transfer ID in `stripe_transfer_id`.

## Action Required Now

A payout request has been successfully created and is sitting in `payout_requests` with status `pending`. Manually trigger it via the admin endpoint to verify the full end-to-end flow (request → Wise → UBA NGN bank) while the admin dashboard is being built.

---

## The Pending Request

| Field | Value |
|---|---|
| Creator | Uche Onyekachukwu Merit |
| Bank | UBA (United Bank for Africa) |
| Account | ****3908 (NGN) |
| Amount | $40.44 USD |
| Status | pending |

Fetch the `payout_request_id` from the `payout_requests` table for this user and use it below.

---

## Before You Fire — Bank Data

**Current state (this codebase):** We store bank account number and routing/bank code in `creator_bank_accounts` as **plaintext** (see `apps/web/app/api/user/revenue/bank-account/route.ts` — TODO: Encrypt). The admin payout flow reads those values and passes them to Wise.

**Implemented:** If we later encrypt those columns (same `iv:authTag:hex` format as `@/src/lib/encryption`), the admin flow will decrypt them automatically before calling Wise (`toPlaintext()` in `apps/web/app/api/admin/payouts/route.ts`). So it’s safe to fire now (plaintext), and it will still work after we add encryption.

---

## Run It Now (no SQL — use our API)

1. **List pending payout requests** (same admin JWT):
   ```bash
   curl -s "https://YOUR_APP_URL/api/admin/payouts?pending_requests=1" \
     -H "Authorization: Bearer YOUR_ADMIN_JWT"
   ```
   Response includes `payout_requests` with `id`, `amount`, `currency`, `status`, `requested_at`. Pick the `id` for the 40.44 request.

2. **Trigger that payout:**
   ```bash
   curl -X POST "https://YOUR_APP_URL/api/admin/payouts/initiate" \
     -H "Authorization: Bearer YOUR_ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{"payout_request_id": "ID_FROM_STEP_1"}'
   ```

   **Or use the script** (needs id in env):
   ```bash
   export ADMIN_JWT="your-admin-jwt"
   export PAYOUT_REQUEST_ID="uuid-from-step-1"
   export API_BASE_URL="https://your-app.vercel.app"
   ./scripts/trigger-pending-payout.sh
   ```

   **Or let the script find and trigger the 40.44 request** (no id needed):
   ```bash
   export ADMIN_JWT="your-admin-jwt"
   export API_BASE_URL="https://your-app.vercel.app"
   ./scripts/trigger-pending-payout.sh
   ```
   (Script will GET pending, find amount 40.44, then POST that id.)

That’s it — the $40.44 moves via Wise to the UBA NGN account once the call succeeds. No Supabase SQL.

---

## Safari: get ADMIN_JWT from the cookie

Supabase stores the session in a cookie like `sb-...-auth-token.0`; the value is **base64-** plus base64-encoded JSON. The JWT is inside that JSON as `access_token`.

1. In Safari Web Inspector → **Storage** → **Cookies** → `www.soundbridge.live`, double‑click the **Value** of `sb-aunxdbqukbxyyiusaeqi-auth-token.0` and copy the whole value (starts with `base64-eyJ...`).
2. In Terminal, run (paste your cookie value after `VALUE`; no quotes):
   ```bash
   echo "VALUE" | sed 's/^base64-//' | base64 -d 2>/dev/null | jq -r '.access_token'
   ```
   Replace `VALUE` with the pasted cookie value. The output is your **ADMIN_JWT** (starts with `eyJ...`). Use it in:
   ```bash
   export ADMIN_JWT="<that output>"
   export API_BASE_URL="https://www.soundbridge.live"
   ./scripts/trigger-pending-payout.sh
   ```

---

## How the endpoint works

```
POST /api/admin/payouts/initiate
Authorization: Bearer <admin JWT>
Content-Type: application/json

{ "payout_request_id": "<id from payout_requests>" }
```

The admin endpoint calls Wise with:
- `sourceCurrency: "USD"`
- `targetCurrency: "NGN"`
- `sourceAmount: 40.44`
- Destination: creator's UBA bank details from `creator_bank_accounts`

(See `WEB_TEAM_PAYOUT_ELIGIBILITY_AND_BANK_VERIFICATION.md` §3 for the Wise transfer spec.)

---

## Troubleshooting: "Account verification failed: Resource not found"

**Trace:** The error is thrown when the **Wise account validation** step fails with a 404.

1. **Admin route** (`apps/web/app/api/admin/payouts/route.ts`) loads the payout request and the creator’s verified bank (NGN/GHS/KES), then calls `payoutToCreator()`.
2. **Payout flow** (`apps/web/src/lib/wise/payout.ts`) does:
   - Step 3: **Resolve/verify bank account** → `resolveAccount()` in `transfers.ts`.
   - Step 4: Get or create Wise recipient → `getOrCreateRecipient()`.
   - Step 6: Create transfer.
3. **resolveAccount** (`apps/web/src/lib/wise/transfers.ts`) POSTs to **`/v1/validators/account-number`** with `{ accountNumber, bankCode, currency }`.
4. **Wise API** returns **404** with body like `{ message: "Resource not found" }`. The Wise Platform API may not expose this validator endpoint for all profiles/currencies, so the “resource” that’s not found is that validation endpoint (or the validation feature for this account).
5. That error is rethrown as `Account verification failed: Resource not found` and returned to the client.

**Fix (in code):** When the validator returns 404 / "Resource not found", we **skip** the account verification step and proceed with the **provided** bank details and account holder name. Wise still validates when creating the recipient (`POST /v1/accounts`) and when creating the transfer, so invalid accounts will fail there with a clear error.

---

## After Triggering

Please confirm:
- [ ] Wise transfer created successfully (share transfer ID)
- [ ] `payout_requests.status` updated to `processing` then `completed`
- [ ] Creator wallet balance deducted
- [ ] Creator email notification sent (per `WEB_TEAM_ADMIN_PAYOUT_DASHBOARD_REQUIRED.md`)

---

## Admin Dashboard

Continue building `/admin/payouts` in parallel per `WEB_TEAM_ADMIN_PAYOUT_DASHBOARD_REQUIRED.md`. This manual trigger is just to validate the Wise payout flow works end-to-end before launch.
