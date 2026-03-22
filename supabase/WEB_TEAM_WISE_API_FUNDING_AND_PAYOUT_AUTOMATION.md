# Web Team: Wise Batch Payments — Scalable Automated Payouts

## Priority: P0 — Creators Cannot Be Paid at Scale Without This

---

## Key Discovery

The SoundBridge Wise Business account is on the **Basic (free) plan**, which already includes:

> ✅ "Send up to 1,000 international payments in one go"

**Batch payments are already unlocked. No plan upgrade needed.**

The current problem (`POST /v3/profiles/{id}/transfers/{id}/payments` → 403) is because we're creating individual transfers and trying to fund them one by one. Each individual funding call requires SCA (Strong Customer Authentication) — meaning a push notification approval per transfer. This does not scale.

**The fix: switch to Wise Batch Payments API.** One batch = one approval, regardless of whether it contains 1 or 1,000 transfers.

---

## Troubleshooting — two common Wise config bugs (from production logs)

### 1) Transfer creation returns 403 / `forbidden` (not only funding)

**Symptom:** Logs show recipient created OK (`✅ recipient …`) then **transfer creation** fails, e.g.  
`💸 Creating Wise transfer… ❌ Transfer creation failed: forbidden` on `POST /api/admin/payouts`.

**Cause:** The Wise **API token** can create recipients but does **not** have permission to **create transfers**. Funding (SCA) is a separate issue — here Wise rejects **`POST /v1/transfers`** (or equivalent) before funding runs.

**Fix:**

1. Open **[wise.com/settings/api-tokens](https://wise.com/settings/api-tokens)** (profile → Settings → API tokens).
2. Edit the token in use on Vercel (`WISE_API_TOKEN`) or **create a new token** with the right scopes.
3. Ensure **Transfers: Create** (or equivalent “Transfers” / “Create transfer” permission) is **enabled**, not only recipient/recipient-related scopes.
4. If you regenerate the token, update **`WISE_API_TOKEN`** in Vercel (or your host) and redeploy.

---

### 2) Webhook returns `401` — `Invalid webhook signature`

**Symptom:** `POST /api/webhooks/wise` → **401** with `Invalid webhook signature` in logs.

**Cause:** **`WISE_WEBHOOK_SECRET`** in env does **not** match the signing secret Wise uses for that webhook endpoint. (This is unrelated to the API token.)

**Fix:**

1. In Wise: **Webhooks** (or developer / webhook settings for your app).
2. Open the webhook that points to `https://www.soundbridge.live/api/webhooks/wise` (or your domain).
3. Copy the **webhook signing secret / public key** Wise shows for verifying signatures (per Wise’s current UI — sometimes labeled “Signing secret”).
4. Set **`WISE_WEBHOOK_SECRET`** in Vercel (Production + Preview if needed) to **exactly** that value, redeploy.
5. Ensure there are no extra spaces or quotes; if Wise rotates the secret, update env again.

**Note:** Our route verifies the body with HMAC-SHA256 using `WISE_WEBHOOK_SECRET` — it must be the secret Wise documents for that webhook.

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

*(Separate from code: webhook signing secret must match `WISE_WEBHOOK_SECRET` in Vercel.)*

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

- [ ] Find/verify Wise API token in account settings (wise.com/settings/api-tokens) — **must include Transfers: Create** (not only recipients)
- [ ] If webhooks fail with 401: align **`WISE_WEBHOOK_SECRET`** with Wise Webhooks → signing secret for `/api/webhooks/wise`
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
