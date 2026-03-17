# Confirm-Delivery: Wallet Transaction Fix (Mobile Team)

## What the handler does

**POST /api/opportunity-projects/:id/confirm-delivery** (when poster confirms delivery):

1. **stripe.paymentIntents.capture(paymentIntentId)** — captures the held payment.
2. **creditGigPaymentToWallet(...)** — inserts a row into `wallet_transactions` for `creator_user_id` (and updates `user_wallets` balance). Platform fee is already reflected in `creator_payout_amount`; the credited amount is the creator’s share.
3. **creator_revenue** — upsert so Earnings tab reflects the gig.
4. **opportunity_projects** — status set to `completed`, `completed_at` set.

So yes: capture → deduct platform fee (via `creator_payout_amount`) → insert wallet_transaction for creator. The bug was **ordering and error handling**.

## Bug that was fixed

- **Before:** Status was updated to `completed` *before* wallet credit. Wallet credit (and revenue/notifications) ran inside a try/catch that **swallowed errors** and still returned `200` with `{ success: true, status: 'completed' }`. If `creditGigPaymentToWallet` threw (e.g. DB error), the project was already marked completed and no wallet row was created.
- **After:** Order is **capture → wallet credit → update status to completed**. If wallet credit throws, we never mark the project completed and we return **500**, so the client can retry. Push/emails/notifications remain in a try/catch so email failures don’t fail the request.

So every completed project now atomically: **capture payment → credit creator wallet (insert wallet_transaction) → mark completed**. No silent swallow of wallet errors.

## Project 8e8fdc13-0154-445d-88ff-2b27b1f910a2

We can’t see your DB. If that project is `status = completed` but there is **no** `wallet_transactions` row for the creator for that project, then either:

1. It was completed **before** this fix (old handler could mark completed and then fail wallet credit silently), or  
2. Status was set directly in the DB (e.g. manual update or another path that doesn’t run this handler). In that case the handler never ran, so no capture and no wallet transaction.

The one-off backfill for the £22 owed to `f02105c6...` is the right way to fix that existing testing transaction. Going forward, the handler guarantees: if the API returns `200` and `status: 'completed'`, a wallet_transaction was inserted for the creator.

## Mobile

No changes needed on your side. Your code is correct.
