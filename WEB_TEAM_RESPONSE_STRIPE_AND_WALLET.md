# Web Team Response — Stripe Webhook & Wallet Credit

**To:** Mobile team (Justice)  
**Re:** STRIPE_WEBHOOK_DISABLED_FIX.md + WEB_TEAM_WALLET_CREDIT_WEBHOOK_REUIRED.MD  
**Date:** 2026-03-16

---

## 1. Stripe subscription webhook (STRIPE_WEBHOOK_DISABLED_FIX.md) — DONE

We’ve fixed the subscription webhook so Stripe won’t disable it again.

### What we changed

- **Always return HTTP 200**  
  The endpoint now returns `200` and `{ "received": true }` even when something fails inside the handler. Stripe only disables webhooks when it gets non‑2xx responses, so this stops future disabling.

- **Correct event handling**  
  We now handle:
  - `checkout.session.completed` (new subscriptions)
  - `invoice.payment_succeeded` (renewals)
  - `invoice.payment_failed`
  - `customer.subscription.created` / `updated` / `deleted`  
  so subscription status in the DB stays in sync.

- **Webhook secret**  
  The subscription endpoint uses:
  - `STRIPE_WEBHOOK_SECRET_SUBSCRIPTION` if set, otherwise  
  - `STRIPE_WEBHOOK_SECRET`  
  So you can use either; the value must be the **signing secret** (whsec_…) for the webhook that sends to `https://www.soundbridge.live/api/webhooks/subscription` (the “charismatic-jubilee” one in Stripe).

### What you need to do

1. **Re-enable the webhook in Stripe** (if it’s still disabled):  
   Developers → Webhooks → select the endpoint for `/api/webhooks/subscription` → **Enable**.

2. **Env**  
   Ensure either `STRIPE_WEBHOOK_SECRET` or `STRIPE_WEBHOOK_SECRET_SUBSCRIPTION` is set to that endpoint’s signing secret (whsec_…). No other env changes are required for this fix.

After deploy and re-enable, subscription events should update the database and the webhook should stay active.

---

## 2. Wallet credit webhook & SQL (WEB_TEAM_WALLET_CREDIT_WEBHOOK_REUIRED.MD)

We’ve done the following.

### SQL to run in Supabase

Run this in the Supabase SQL Editor (or via your migration process) so the backend can credit wallets safely:

```sql
-- Required for wallet credit webhook (WEB_TEAM_WALLET_CREDIT_WEBHOOK_REUIRED.MD)
-- Ensures wallet_balance on profiles can be updated atomically from webhooks

-- Add column if your schema uses profiles.wallet_balance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_wallet_balance(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Note:** If your app uses `user_wallets` (and currency) instead of `profiles.wallet_balance`, the same idea applies: we’ll credit the correct wallet/table in the `payment_intent.succeeded` handler; the RPC above is for the “profiles.wallet_balance” design. If you only use `user_wallets`, say so and we’ll align the handler to that.

### One-off manual credit for the affected payment

For the specific payment that already succeeded (£10, `pi_3T6GcG0Bt6mXrdye10HwRyaF`), run this **after** the RPC above (and after confirming whether you use `profiles.wallet_balance` or `user_wallets`):

```sql
-- Step 1: Find the user
SELECT id, display_name, email
FROM profiles
WHERE stripe_customer_id = 'gcus_1TBFvr0Bt6mXrdyehreQXM1n';

-- Step 2: Use the id from Step 1 as <user_id_from_step_1>
-- If using profiles.wallet_balance (and amount in pence):
INSERT INTO wallet_transactions (
  user_id, transaction_type, amount, currency, description, status, reference_type, reference_id, created_at
) VALUES (
  '<user_id_from_step_1>',
  'deposit',
  1000,
  'GBP',
  'Payment received — pi_3T6GcG0Bt6mXrdye10HwRyaF',
  'completed',
  NULL,
  'pi_3T6GcG0Bt6mXrdye10HwRyaF',
  NOW()
);

UPDATE profiles
SET wallet_balance = COALESCE(wallet_balance, 0) + 1000
WHERE stripe_customer_id = 'gcus_1TBFvr0Bt6mXrdyehreQXM1n';
```

If your `wallet_transactions` table requires `wallet_id` (e.g. you use `user_wallets`), we’ll need to adapt this to your schema; tell us which schema you use.

### Next: `payment_intent.succeeded` handler

We will add (or extend) a webhook handler for `payment_intent.succeeded` so that:

- When Stripe sends `payment_intent.succeeded`, we read `recipientUserId` (and optionally type, gigId, etc.) from `metadata`.
- We credit the recipient’s wallet (using the same schema as above) and log the transaction.
- We send a push notification to the recipient (e.g. “Payment received”).

For that to work, **all new PaymentIntents** that should credit a wallet must include at least:

- `metadata.recipientUserId` = UUID of the user who should receive the funds.

We’ll confirm once the handler is deployed and which webhook endpoint it uses (e.g. main Stripe webhook or a dedicated payments one).

---

## Summary

| Item | Status |
|------|--------|
| Subscription webhook fix (always 200, correct events) | Done, deploy + re-enable in Stripe |
| Env: subscription webhook secret | Use STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_SUBSCRIPTION |
| SQL: `increment_wallet_balance` + optional `profiles.wallet_balance` | Run in Supabase (see above) |
| One-off credit for pi_3T6GcG0Bt6mXrdye10HwRyaF | Run manual SQL after RPC (adapt if you use user_wallets only) |
| `payment_intent.succeeded` handler + metadata | In progress; we’ll confirm endpoint and metadata contract |

If your wallet schema uses only `user_wallets` (no `profiles.wallet_balance`), tell us and we’ll align the handler and SQL with that.
