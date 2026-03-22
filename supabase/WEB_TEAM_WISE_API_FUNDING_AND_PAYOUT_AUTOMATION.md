# Web Team: Wise Batch Payments — Scalable Automated Payouts

## Priority: P0 — Creators Cannot Be Paid at Scale Without This

---

## Key Discovery

The SoundBridge Wise Business account is on the **Basic (free) plan**, which already includes:

> ✅ "Send up to 1,000 international payments in one go"

**Batch payments are already unlocked. No plan upgrade needed.**

**Important (Wise, via their UI):** The **team member approval** workflow in Wise **does not apply to API transfers**. Do not assume a 403 on **`POST /v1/transfers`** is “waiting for someone to approve in the app” — for API calls, **transfer creation is gated by the API token’s scopes**, not that approval system.

**Confirmed production issue:** **`POST /v1/transfers` → 403** happens because the **API token has recipient-creation scope but not transfer-creation scope**. Fix: **regenerate the token with full permissions** (see **Troubleshooting §1** below).

Separately, funding an existing transfer (`POST /v3/profiles/{id}/transfers/{id}/payments` → 403) can still involve **SCA / balance / permissions** — that is not the same as “team approval” for API transfers.

**The fix for scale: Wise Batch Payments API** — one batch submission, then Wise’s own flow for that batch (e.g. notification to approve the batch), not the generic team-approval feature for manual UI transfers.

---

## Troubleshooting — two common Wise config bugs (from production logs)

### 1) Transfer creation returns 403 / `forbidden` (not only funding)

**Symptom:** Logs show recipient created OK (`✅ recipient …`) then **transfer creation** fails, e.g.  
`💸 Creating Wise transfer… ❌ Transfer creation failed: forbidden` on `POST /api/admin/payouts`.

**Cause:** The Wise **API token** can create recipients but does **not** have permission to **create transfers**. Funding (SCA) is a separate issue — here Wise rejects **`POST /v1/transfers`** (or equivalent) before funding runs.

**Confirmed root cause (production):** The token in use was created **without** the **Transfers: Create** scope. Wise exposes this as **permission checkboxes** when you create or regenerate a token. You cannot fix this by “using the same token harder” — you must **regenerate** the token with the correct permissions.

**Fix:**

1. Open **[wise.com/settings/api-tokens](https://wise.com/settings/api-tokens)** (profile → Settings → API tokens).
2. **Create a new API token** (or regenerate per Wise’s flow — many accounts require a new token to add scopes).
3. When Wise shows the **permission checkboxes**, ensure **Transfers: Create** (or equivalent “Transfers” / “Create transfer”) is **checked**, not only recipient-related scopes.
4. **Until Wise grants full API access via their sales/account process**, set the **minimum** to: regenerate the token with **every permission Wise offers on that screen checked** (all available scopes). That avoids another missing scope blocking the next endpoint.
5. Copy the new secret and set **`WISE_API_TOKEN`** in Vercel (Production + Preview if needed) — **replace the old value entirely** — then redeploy.

---

### 2) Webhook returns `401` — `Invalid webhook signature`

**Symptom:** `POST /api/webhooks/wise` → **401** with `Invalid webhook signature` on **every** delivery — **creator wallets never update** from webhooks.

**Cause:** Verification uses **JOSE / asymmetric signing** (e.g. **ES256** compact JWS in `X-Signature-SHA256`), **not** a shared string. **`WISE_WEBHOOK_SECRET` has no role** — remove it from Vercel.

**Fix (required for JOSE path):**

1. Obtain **Wise OAuth client credentials** (**client ID + secret**) from Wise or from API onboarding — **separate from** the user **`WISE_API_TOKEN`**.
2. Set on the server:
   - **`WISE_OAUTH_CLIENT_ID`**
   - **`WISE_OAUTH_CLIENT_SECRET`**
3. The app uses **client_credentials** to get a token, then fetches and caches Wise’s public signing key:
   - **`GET /v1/auth/jose/response/public-keys?scope=PAYLOAD_SIGNING&algorithm=ES256`**
   - Docs: [Get Wise public signing key](https://docs.wise.com/api-reference/jose/joseresponsepublickeysget) (requires **client credentials** token, not the personal API token).
4. Incoming webhooks are verified with that key against the **JOSE** signature header; on failure the key cache is invalidated once and the key refetched (per Wise’s “retry after failure” guidance).
5. **Redeploy** after env changes.

**Fallback (legacy RSA):** If the signature is **not** a compact JWS, the code still supports **RSA-SHA256** + PEM (`WISE_WEBHOOK_PUBLIC_KEY_PEM`, subscription public-key fetch, or Wise’s published PEM from the [event handling guide](https://docs.wise.com/guides/developer/webhooks/event-handling)).

**References:** [Client credentials token](https://docs.wise.com/api-reference/client-credentials-token), [Event handling](https://docs.wise.com/guides/developer/webhooks/event-handling).

---

## How Batch Payments Work

Instead of:
```
POST /v1/transfers          (creates transfer 1)
POST /v3/profiles/{id}/transfers/{id}/payments  → 403 SCA required
POST /v1/transfers          (creates transfer 2)
POST /v3/profiles/{id}/transfers/{id}/payments  → 403 SCA required
... × N creators
```

Use:
```
POST /v1/batch-payments     (submits ALL pending payouts in one call)
→ Wise sends ONE push notification to admin: "Approve batch of N payments?"
→ Admin taps Approve
→ All N transfers process automatically
```

---

## Implementation

### Step 1 — Collect pending payouts from DB

```ts
// Get all approved payout requests not yet processed
const pending = await db
  .from('payout_requests')
  .select('*, creator_bank_accounts(*)')
  .eq('status', 'pending')
  .order('created_at');
```

### Step 2 — Build the batch payload

```ts
const batchItems = await Promise.all(pending.map(async (payout) => {
  const bank = payout.creator_bank_accounts;
  const currency = bank.currency; // e.g. 'NGN'

  // Create Wise recipient if not already stored
  const recipientId = bank.wise_recipient_id
    ?? await createWiseRecipient(bank); // store this back to DB after creation

  // Get Wise quote
  const quote = await wise.post('/v3/quotes', {
    sourceCurrency: 'USD',
    targetCurrency: currency,
    sourceAmount: payout.amount,
    profile: WISE_PROFILE_ID,
    payOut: 'BANK_TRANSFER',
  });

  return {
    targetAccount: recipientId,
    quote: quote.id,
    customerTransactionId: payout.id, // idempotency key = payout_request id
    details: {
      reference: `SoundBridge payout ${payout.id.slice(0, 8)}`,
      transferPurpose: 'verification.transfers.purpose.pay.bills',
      sourceOfFunds: 'verification.source.of.funds.other',
    },
  };
}));
```

### Step 3 — Submit the batch

```ts
const batch = await wise.post('/v1/batch-payments', {
  profile: WISE_PROFILE_ID,
  items: batchItems,
  sourceCurrency: 'USD',
});

// batch.id — store this, used to check status
// batch.status — will be 'PENDING_APPROVAL'
```

### Step 4 — Admin approves in Wise app (one tap)

Wise sends a push notification to the registered device. Admin taps Approve. All transfers in the batch begin processing simultaneously.

### Step 5 — Webhook / polling to mark as completed

```ts
// Wise sends webhook: batch-payment-status-changed
// Or poll: GET /v1/batch-payments/{batchId}
// When status = 'COMPLETED', mark payout_requests as completed and debit wallets
```

---

## Where to Find API Tokens in Wise

The API tokens section is **not in the main left sidebar**. It's in the account settings accessible via:

1. Click your **profile/account icon** (top right on wise.com)
2. Select **Settings**
3. Look for **API tokens** or **Developer** section

If not visible: go directly to `wise.com/settings/api-tokens` in the browser.

If the section is missing entirely, email Wise Business support to enable API access for the account — some Business accounts require explicit activation.

### If you still can’t find API tokens or Webhooks in the UI

Wise **changes navigation and labels** often; deep links may move. If **Settings → API tokens** or **Webhooks** isn’t visible:

- Search [Wise Help](https://wise.com/help) for **“API token”** or **“webhook”**.
- Ask **Wise Business support** to confirm API access and where **Webhooks** live for your account type.
- **Revisit this doc** once you have screenshots / current paths from Wise — we’ll update the steps.

*(Webhooks: RSA verification — see §2 above; not a shared HMAC secret.)*

---

## Wise USD balance — ops target ($300–500)

**Recommendation:** Keep **$300–500 USD** (or more) in your Wise balance at all times so batch payouts and funding don’t fail mid-run. Top-ups (e.g. Tide → Wise) usually complete in minutes; if a batch fails for insufficient balance, fund Wise and **Process all pending** again.

**Admin dashboard:** `/admin/payouts` shows **live Wise USD balance** (server calls Wise: `GET /v1/borderless-accounts?profileId=…`, with fallback to **v4 balances**). Check balance **before** clicking **Process all pending**.

**API (for reference):** `GET /api/admin/payouts/wise-balance` (admin session) → `{ success, currency: 'USD', amount, profileId, source }`.

---

## Admin Payout Dashboard — What to Build

The admin dashboard triggers the batch. It does NOT need to be built before batch payments work — a simple scheduled cron that runs daily is sufficient initially.

### Option A — Cron (simplest, no UI needed)

```ts
// runs daily at 9am UTC
async function processPendingPayouts() {
  const pending = await getPendingPayoutRequests();
  if (pending.length === 0) return;

  const batch = await submitWiseBatch(pending);
  await markPayoutsAs('processing', pending.map(p => p.id));
  console.log(`Batch ${batch.id} submitted — ${pending.length} payouts pending approval`);
  // Admin gets push notification from Wise to approve
}
```

### Option B — Admin UI (better, build after cron)

Page: `/admin/payouts`

Shows:
- List of pending payout requests (creator name, amount, currency, bank, date requested)
- "Process all pending" button → submits Wise batch → admin gets Wise notification to approve
- History of processed batches with status

API endpoints needed:
- `GET /api/admin/payouts/pending` — list unprocessed payout requests
- `POST /api/admin/payouts/batch` — submits Wise batch for all pending requests
- `GET /api/admin/payouts/history` — past batches and their statuses

---

## Immediate Fix for Merit (Do This Now)

Merit's transfer (44,908.38 NGN ≈ $40.44) is sitting in Wise dashboard as Transfer #2029535328 — "Waiting for payment."

**Go to wise.com → Home → click "Review" on Merit's pending transfer → fund from Tide.**

This is a one-time manual step. Once batch payments are implemented, this process is automated.

---

## Store Wise Recipient ID After First Creation

To avoid creating duplicate Wise recipients on every payout, store the Wise recipient ID back to `creator_bank_accounts` after first creation:

```sql
ALTER TABLE creator_bank_accounts ADD COLUMN IF NOT EXISTS wise_recipient_id TEXT;
```

```ts
// After creating Wise recipient:
await db.from('creator_bank_accounts')
  .update({ wise_recipient_id: wiseRecipient.id })
  .eq('id', bankAccount.id);
```

On subsequent payouts: if `wise_recipient_id` exists, skip recipient creation and use it directly.

---

## Wise Balance — Keep It Funded

Batch payments are funded from your Wise USD balance. Keep it topped up:
- Set a minimum threshold (e.g. $500 USD)
- Transfer from Tide to Wise when it drops below threshold
- The Stripe → Tide payout cycle gives you the cash flow to fund this

---

## Summary Checklist

- [ ] **Regenerate** Wise API token (**[wise.com/settings/api-tokens](https://wise.com/settings/api-tokens)** as **contact@soundbridge.live**): **Transfers: Create** required; **current token has recipients only** (403 on `POST /v1/transfers`). Use **full permissions** on the token screen. If no tokens page: email **business@wise.com** for **Soundbridge Live Ltd** + transfer-creation scope.
- [ ] Webhooks 401: configure **JOSE** — **`WISE_OAUTH_CLIENT_ID` + `WISE_OAUTH_CLIENT_SECRET`** → fetch ES256 `PAYLOAD_SIGNING` key (see §2). **Remove `WISE_WEBHOOK_SECRET`.**
- [ ] Implement `POST /v1/batch-payments` instead of individual transfer funding
- [ ] Store `wise_recipient_id` on `creator_bank_accounts` after first recipient creation
- [ ] Set up daily cron to submit pending payouts as a batch
- [ ] Keep Wise USD balance funded (min $500 recommended)
- [ ] Build admin payout UI (`/admin/payouts`) — can come after cron
- [ ] **NOW: Approve Merit's pending transfer manually in Wise dashboard**

---

## Manual payout (no Wise API)

When Wise returns 403 or the API is unavailable, admins can mark a payout as paid **without** calling Wise:

- **Endpoint:** `POST /api/admin/payouts/manual-complete` with body `{ "payout_request_id": "<uuid>" }` (admin session required).
- **Effect:** Sets `payout_requests.status` to `completed`, deducts creator balance via `process_creator_payout` / `record_revenue_transaction` (same idea as Wise webhook), optional email to creator.
- **Allowed statuses:** `pending`, `failed`, or `processing` (not `completed` / `rejected`).
- **UI:** Admin `/admin/payouts` → **Mark as manually paid** (next to Approve & Send) for pending rows.
