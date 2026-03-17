# Backfill: Wallet credit for pi_3T6GcG0Bt6mXrdye10HwRyaF (dollar equivalent)

**Context:** Gig "Looking for a trumpeter" — £10 succeeded in Stripe 15 Mar, provider (Nigeria) should receive the dollar equivalent of £8.80. Wallet was not credited (Digital Wallet showed $0). Digital Wallet always shows USD; we credit in USD so it reflects the dollar equivalent.

**Run in Supabase SQL Editor (one block).** Only affects the project with this payment intent. Uses an approximate GBP→USD rate (~1.27); adjust `v_payout_usd` if you prefer a different rate.

```sql
-- Backfill wallet credit for pi_3T6GcG0Bt6mXrdye10HwRyaF (USD equivalent of £8.80)
DO $$
DECLARE
  v_project_id uuid;
  v_creator_id uuid;
  v_wallet_id uuid;
  v_payout_gbp numeric := 8.80;
  v_payout_usd numeric := 11.18;  -- ~£8.80 × 1.27 (adjust rate if needed)
BEGIN
  SELECT id, creator_user_id INTO v_project_id, v_creator_id
  FROM opportunity_projects
  WHERE stripe_payment_intent_id = 'pi_3T6GcG0Bt6mXrdye10HwRyaF'
  LIMIT 1;

  IF v_creator_id IS NULL THEN
    RAISE NOTICE 'No project found for pi_3T6GcG0Bt6mXrdye10HwRyaF';
    RETURN;
  END IF;

  INSERT INTO user_wallets (user_id, currency, balance, updated_at)
  VALUES (v_creator_id, 'USD', v_payout_usd, NOW())
  ON CONFLICT (user_id, currency) DO UPDATE
  SET balance = user_wallets.balance + v_payout_usd, updated_at = NOW()
  RETURNING id INTO v_wallet_id;

  IF v_wallet_id IS NULL THEN
    SELECT id INTO v_wallet_id FROM user_wallets WHERE user_id = v_creator_id AND currency = 'USD';
  END IF;

  -- Use 'deposit' if your DB doesn't yet allow 'gig_payment' (migration 20260228140000). Metadata marks it as gig backfill.
  INSERT INTO wallet_transactions (wallet_id, user_id, transaction_type, amount, currency, description, reference_type, reference_id, status, metadata)
  VALUES (v_wallet_id, v_creator_id, 'deposit', v_payout_usd, 'USD',
          'Gig payment — "Looking for a trumpeter" (backfill)',
          'opportunity_project', v_project_id, 'completed',
          jsonb_build_object('backfill', true, 'gig_payment_backfill', true, 'stripe_payment_intent_id', 'pi_3T6GcG0Bt6mXrdye10HwRyaF', 'original_amount_gbp', v_payout_gbp));
  RAISE NOTICE 'Backfill applied: creator % credited $% (USD equiv of £8.80)', v_creator_id, v_payout_usd;
END $$;
```

**If you have already run migration `20260228140000_gig_payment_wallet_transaction_type.sql`**, you can use `'gig_payment'` instead of `'deposit'` in the INSERT above. Otherwise use `'deposit'` so the constraint is satisfied.

---

## Backfill creator_revenue (Earnings tab)

The Earnings tab on Profile reads from `creator_revenue` (e.g. GET /api/user/revenue/summary → `get_creator_revenue_summary`). Run this **after** the wallet backfill so the same creator’s Total Earnings and balance reflect the £8.80 gig (~$11.18 USD).

```sql
-- Backfill creator_revenue for pi_3T6GcG0Bt6mXrdye10HwRyaF (Earnings tab)
-- Uses UPDATE then INSERT (no UNIQUE on user_id in prod)
DO $$
DECLARE
  v_creator_id uuid;
  v_amount numeric := 11.18;
  v_updated integer;
BEGIN
  SELECT creator_user_id INTO v_creator_id
  FROM opportunity_projects
  WHERE stripe_payment_intent_id = 'pi_3T6GcG0Bt6mXrdye10HwRyaF'
  LIMIT 1;

  IF v_creator_id IS NULL THEN
    RAISE NOTICE 'No project found for pi_3T6GcG0Bt6mXrdye10HwRyaF';
    RETURN;
  END IF;

  UPDATE creator_revenue
  SET total_earned = COALESCE(total_earned, 0) + v_amount,
      available_balance = COALESCE(available_balance, 0) + v_amount,
      updated_at = NOW()
  WHERE user_id = v_creator_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    INSERT INTO creator_revenue (user_id, total_earned, available_balance, updated_at)
    VALUES (v_creator_id, v_amount, v_amount, NOW());
  END IF;

  RAISE NOTICE 'creator_revenue backfill applied for user % (+$11.18)', v_creator_id;
END $$;
```
