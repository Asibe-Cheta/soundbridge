# Report for mobile team: Wise payout — "Transfer creation failed: Illegal query argument"

**Date:** 2026-01-26  
**Context:** Admin-triggered payout (POST /api/admin/payouts with `payout_request_id`) for a pending NGN payout. Flow: load payout request → load creator bank (Wise type `nigeria`, Wise bank code) → create recipient → create quote → create transfer.

---

## Current error

When triggering the payout we get:

```json
{
  "error": "Payout failed",
  "message": "Transfer creation failed: Illegal query argument"
}
```

So the failure is at **Wise transfer creation** (POST to Wise, not our API). The message **"Illegal query argument"** is returned by **Wise’s API** (we forward it in our 500 response).

---

## What we’ve already fixed (backend)

1. **Account verification 404** — We skip pre-validation when Wise validator returns 404 and use provided bank details.
2. **422 "Account type is not valid"** — We use recipient type `nigeria` for NGN (not `bank_code`/`nuban`) and send `legalType`, `address`, and Wise internal `bankCode` from GET /api/payouts/bank-options.
3. **422 validation** — We surface Wise’s `errors[]` in the API response so the exact validation error is visible.
4. **Quote creation** — We switched from POST /v2/quotes to **POST /v3/profiles/{profileId}/quotes** (profile required by Wise). We resolve `profileId` from WISE_PROFILE_ID or GET /v1/profiles.
5. **Transfer body** — We send `targetAccount` as an **integer** (Wise expects integer), `quoteUuid` as string, and `customerTransactionId` (reference).

So by the time we call Wise to create the transfer we have:

- A valid profile-scoped v3 quote.
- A valid recipient (type `nigeria`, Wise bank code).
- Body: `{ targetAccount: <number>, quoteUuid: "<id>", customerTransactionId: "<ref>" }`.

We still get **"Illegal query argument"** from Wise. That suggests either:

- A **query parameter** our client sends (e.g. on GET /v1/profiles or on the quote/transfer request) is invalid, or  
- Wise uses that message for a **body/validation** issue (e.g. v3 quote id not accepted by v1/transfers, or a field format).

We are not intentionally adding any query string to the transfer POST; the error may be Wise’s way of saying “invalid argument” in general.

---

## What would help from your side

1. **If you have a working Wise transfer flow (same environment: live/sandbox):**  
   - Which **exact** endpoints do you call (e.g. v1 vs v3 quote, with or without profile)?  
   - Do you use **v1** or **v2** quotes for **v1/transfers** (quoteUuid)?  
   - Any **required headers** (e.g. idempotency, profile, version)?

2. **If you’ve seen "Illegal query argument" or similar:**  
   - Which Wise endpoint was it (quote vs transfer vs profiles)?  
   - Any docs or support notes that explain this message?

3. **Wise dashboard / logs:**  
   - If you can see failed transfer or quote attempts in the Wise UI or logs, the exact error code or “argument” name would help us match it to a field (e.g. quoteUuid, targetAccount, profile).

---

## Implemented from mobile team checklist (2026-01-26)

- **POST /v1/transfer-requirements** is called before creating the transfer (with `targetAccount`, `quoteUuid`, `details: {}`).
- Transfer body sends only `targetAccount`, `quoteUuid`, `customerTransactionId`, and `details: {}` (no extra fields).
- **customerTransactionId** is a fresh **UUID v4** per transfer (`crypto.randomUUID()`), not reused.
- **Quote** is created immediately before the transfer in the same flow (within 30 min TTL).
- **targetAccount** is sent as integer; **quoteUuid** is `quote.id` from the v3 quote response.
- **Funding step** added: after `POST /v1/transfers`, we call **POST /v3/profiles/{profileId}/transfers/{transferId}/payments** with `{ "type": "BALANCE" }` so the transfer is actually funded.

## Next steps on our side (if error persists)

- We will **return full Wise error details** in the payout API response (`details`) so the next run can show the full `errors[]` / body from Wise.
- If you can share the exact Wise request/response (with IDs redacted) for a **successful** transfer from your side, we can align our request (path, query, body, headers) with that.

---

## How to re-run and capture details

After the next deploy, trigger the payout again. If we’ve added full `details` to the error response, the JSON will look like:

```json
{
  "error": "Payout failed",
  "message": "Transfer creation failed: ...",
  "details": { ... }
}
```

Share that full `details` object (or the Wise `errors` array inside it) so we can see which argument Wise is rejecting.

Trigger command (from repo root, with cookie file):

```bash
./scripts/run-trigger-with-cookie-file.sh ~/Desktop/sb_cookie.txt
```

---

## References

- Payout eligibility & Wise recipient types: `WEB_TEAM_PAYOUT_ELIGIBILITY_AND_BANK_VERIFICATION.md` (§4)
- Bank options (Wise internal codes): `WEB_TEAM_WISE_BANK_OPTIONS_ENDPOINT.md.md`
- Trigger flow: `WEB_TEAM_TRIGGER_PENDING_PAYOUT_NOW.MD`
