# Revenue System Complete Setup Guide

**Date:** December 11, 2025
**Status:** Ready for Implementation

---

## 🎯 Overview

The Revenue Management system is a **core premium feature** that allows creators to:
- Receive tips from fans
- Sell tracks
- Earn from subscriptions
- Sell event tickets
- Request payouts via Stripe Connect
- Track all earnings and transactions

**This is NOT optional** - it's essential for premium/unlimited tier users.

---

## 📋 What This System Includes

### Database Tables:
1. **revenue_transactions** - All revenue transactions (tips, sales, payouts)
2. **creator_bank_accounts** - Stripe Connect account info
3. **creator_revenue** - Summary of earnings per user
4. **payout_requests** - Payout requests from creators

### RPC Functions:
1. **get_creator_revenue_summary(user_id)** - Get earnings summary
2. **process_revenue_transaction(...)** - Record new revenue
3. **request_payout(user_id, amount)** - Request a payout

### Features:
- Platform fee calculation (3% + $0.30 per transaction)
- Automatic balance tracking
- Payout scheduling (daily/weekly/monthly/manual)
- Stripe Connect integration ready
- Full RLS security

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run SQL Migration

**File:** `migrations/create_revenue_system.sql`

**In Supabase SQL Editor:**
1. Open the file
2. Click "Run"
3. Wait for completion
4. Check output for "Success"

**Expected Output:**
```
✅ Tables created: 4
✅ Functions created: 3
✅ Policies created: 8
✅ Triggers created: 4
```

### Step 2: Verify Installation

Run this query in Supabase:
```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('revenue_transactions', 'creator_bank_accounts', 'creator_revenue', 'payout_requests');

-- Should return 4 rows
```

### Step 3: Test Revenue Dashboard

1. Hard refresh browser (Ctrl + Shift + R)
2. Go to Profile → Revenue tab
3. Should see:
   - Total Earnings: $0.00
   - Available Balance: $0.00
   - No more "authentication required" error

---

## 💰 Revenue Transaction Types

| Type | Description | Platform Fee | Use Case |
|------|-------------|--------------|----------|
| `tip` | Fan tips to creator | 3% + $0.30 | Direct support |
| `track_sale` | Track purchase | 3% + $0.30 | Selling music |
| `subscription` | Monthly subscription | 3% + $0.30 | Fan subscriptions |
| `event_ticket` | Event ticket sale | 3% + $0.30 | Concert tickets |
| `payout` | Money sent to creator | $0 | Bank transfer |
| `refund` | Refund to fan | -100% | Returns |

---

## 📊 Database Schema Details

### revenue_transactions
```sql
id                      UUID PRIMARY KEY
user_id                 UUID (creator receiving payment)
transaction_type        VARCHAR ('tip', 'track_sale', etc.)
amount                  DECIMAL (gross amount)
platform_fee            DECIMAL (calculated 3% + $0.30)
net_amount              DECIMAL (amount - platform_fee)
track_id                UUID (if track sale)
event_id                UUID (if event ticket)
payer_id                UUID (who paid)
stripe_payment_intent_id TEXT
payment_status          VARCHAR ('pending', 'completed', 'failed')
transaction_date        TIMESTAMP
```

### creator_bank_accounts
```sql
id                      UUID PRIMARY KEY
user_id                 UUID UNIQUE
stripe_account_id       TEXT (Stripe Connect account)
stripe_account_status   VARCHAR ('pending', 'active')
bank_name               TEXT
account_last4           VARCHAR(4) (security)
is_verified             BOOLEAN
payout_enabled          BOOLEAN
payout_schedule         VARCHAR ('daily', 'weekly', 'monthly', 'manual')
minimum_payout_amount   DECIMAL (default $10.00)
```

### creator_revenue
```sql
user_id                 UUID PRIMARY KEY
total_earnings          DECIMAL (all time)
total_paid_out          DECIMAL (total payouts)
available_balance       DECIMAL (ready for payout)
pending_balance         DECIMAL (payout in progress)
tips_total              DECIMAL
track_sales_total       DECIMAL
subscription_total      DECIMAL
event_tickets_total     DECIMAL
total_transactions      INTEGER
last_payout_date        TIMESTAMP
next_payout_date        TIMESTAMP
```

### payout_requests
```sql
id                      UUID PRIMARY KEY
user_id                 UUID
amount                  DECIMAL
stripe_payout_id        TEXT
status                  VARCHAR ('pending', 'processing', 'completed', 'failed')
requested_at            TIMESTAMP
completed_at            TIMESTAMP
```

---

## 🔧 RPC Functions Reference

### 1. get_creator_revenue_summary(user_id)

**Purpose:** Get earnings summary for a creator

**Usage:**
```typescript
const { data } = await supabase
  .rpc('get_creator_revenue_summary', { user_uuid: userId });
```

**Returns:**
```typescript
{
  total_earnings: 1250.00,
  available_balance: 450.00,
  pending_balance: 0.00,
  total_paid_out: 800.00,
  tips_total: 300.00,
  track_sales_total: 700.00,
  subscription_total: 200.00,
  event_tickets_total: 50.00,
  total_transactions: 45,
  last_payout_date: '2025-12-01T00:00:00Z',
  next_payout_date: '2025-12-15T00:00:00Z'
}
```

### 2. process_revenue_transaction(...)

**Purpose:** Record a new revenue transaction

**Usage:**
```typescript
const { data: transactionId } = await supabase
  .rpc('process_revenue_transaction', {
    user_uuid: creatorId,
    transaction_type_param: 'tip',
    amount_param: 10.00,
    currency_param: 'USD',
    payer_id_param: fanId,
    stripe_payment_intent_id_param: 'pi_xxx'
  });
```

**Parameters:**
- `user_uuid` - Creator receiving payment
- `transaction_type_param` - 'tip', 'track_sale', etc.
- `amount_param` - Gross amount (before fees)
- `currency_param` - 'USD' (default)
- `track_id_param` - Optional track ID
- `event_id_param` - Optional event ID
- `payer_id_param` - Optional payer user ID
- `stripe_payment_intent_id_param` - Optional Stripe ID

**Automatic Calculations:**
- Platform fee: amount * 0.03 + 0.30
- Net amount: amount - platform_fee
- Updates creator_revenue balances
- Increments transaction counts

### 3. request_payout(user_id, amount)

**Purpose:** Request a payout to bank account

**Usage:**
```typescript
const { data: payoutId } = await supabase
  .rpc('request_payout', {
    user_uuid: userId,
    amount_param: 100.00
  });
```

**Behavior:**
- Checks if user has sufficient available_balance
- Creates payout_request record
- Moves amount from available_balance to pending_balance
- Returns payout request ID
- Throws error if insufficient funds

---

## 🔒 Security (RLS Policies)

All tables have Row Level Security enabled:

### Users Can:
✅ View their own transactions
✅ View their own bank account
✅ Update their own bank account
✅ View their own revenue summary
✅ Create payout requests
✅ View their own payout requests

### Users Cannot:
❌ View other users' revenue data
❌ Modify other users' balances
❌ Delete transaction records
❌ Access Stripe account IDs of others

---

## 💳 Stripe Connect Integration

### Setup Steps (After SQL Migration):

1. **Create Stripe Connect Application:**
   - Go to Stripe Dashboard
   - Navigate to Connect → Settings
   - Get your Client ID

2. **Add Environment Variables:**
   ```env
   STRIPE_SECRET_KEY=sk_...
   STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_CONNECT_CLIENT_ID=ca_...
   ```

3. **Implement Connect Flow:**
   - User clicks "Connect Bank Account"
   - Redirect to Stripe Connect OAuth
   - Stripe redirects back with account ID
   - Save `stripe_account_id` to `creator_bank_accounts`

4. **Handle Webhooks:**
   - `account.updated` - Update account status
   - `payout.paid` - Mark payout as completed
   - `payout.failed` - Mark payout as failed
   - `transfer.created` - Record transfer

### Stripe Connect Endpoints Needed:

**POST /api/stripe/connect/create-account** - Create Stripe account
**GET /api/stripe/connect/account-link** - Generate onboarding link
**POST /api/stripe/connect/disconnect** - Disconnect account
**POST /api/stripe/webhooks** - Handle Stripe webhooks
**POST /api/stripe/transfer** - Create transfer to creator

---

## 📱 Frontend Integration

### Revenue Dashboard Component

Already implemented in: `apps/web/src/components/revenue/RevenueDashboard.tsx`

**After SQL migration, it will:**
✅ Load revenue summary via `get_creator_revenue_summary`
✅ Display total earnings, available balance
✅ Show recent transactions
✅ Show revenue breakdown by type
✅ Display earnings charts

### Bank Account Manager Component

Already implemented in: `apps/web/src/components/revenue/BankAccountManager.tsx`

**After Stripe setup, it will:**
✅ Connect Stripe account
✅ Display connected bank info (last 4 digits)
✅ Show verification status
✅ Manage payout schedule
✅ Request manual payouts

---

## 🧪 Testing the Revenue System

### Test 1: Check Revenue Summary (Empty State)

```typescript
// Should return default values
const { data } = await supabase
  .rpc('get_creator_revenue_summary', { user_uuid: userId });

// Expected:
// total_earnings: 0
// available_balance: 0
// all other values: 0 or null
```

### Test 2: Process a Test Transaction

```typescript
// Create a test tip
const { data: txId } = await supabase
  .rpc('process_revenue_transaction', {
    user_uuid: userId,
    transaction_type_param: 'tip',
    amount_param: 10.00
  });

// Should return transaction UUID
// Check creator_revenue updated:
// total_earnings: 9.40 (10.00 - 0.60 fee)
// available_balance: 9.40
// tips_total: 9.40
```

### Test 3: Request a Payout

```typescript
// First add some balance (run test 2)
// Then request payout
const { data: payoutId } = await supabase
  .rpc('request_payout', {
    user_uuid: userId,
    amount_param: 5.00
  });

// Should return payout UUID
// Check creator_revenue:
// available_balance: 4.40 (9.40 - 5.00)
// pending_balance: 5.00
```

---

## 🎨 Revenue Dashboard UI

### Stats Cards:
- **Total Earnings** - All-time earnings (after fees)
- **Available Balance** - Ready for payout
- **Pending Balance** - Payout in progress
- **Total Paid Out** - Successfully paid to bank

### Charts:
- **Revenue Over Time** - Line chart by month
- **Revenue by Type** - Pie chart (tips vs sales vs subscriptions)
- **Transaction Volume** - Bar chart of transaction counts

### Recent Transactions List:
- Transaction type icon
- Amount (with + for income, - for payouts)
- Date and time
- Status badge
- Related entity (track name, event name, etc.)

---

## 🚨 Common Issues & Solutions

### "RPC function not found"
**Solution:** Run `migrations/create_revenue_system.sql`

### "Insufficient balance for payout"
**Expected:** Need revenue before requesting payout
**Solution:** Process test transactions first

### "Stripe account not connected"
**Expected:** Stripe Connect not set up yet
**Solution:** Implement Stripe Connect flow

### "Tables already exist" error
**Solution:** Normal if running migration twice - uses `IF NOT EXISTS`

---

## 📊 Analytics Integration

The Revenue system integrates with the Analytics dashboard:

### Analytics Shows:
- Total earnings (same as revenue dashboard)
- Revenue trend (monthly comparison)
- Top revenue sources
- Average transaction value

### Data Flow:
1. Revenue transaction created
2. `creator_revenue` table updated
3. Analytics queries `creator_revenue`
4. Displays in both Analytics and Revenue tabs

---

## 💡 Future Enhancements

### Phase 1 (Current):
✅ Basic revenue tracking
✅ Transaction history
✅ Payout requests
✅ Revenue summary

### Phase 2 (Next):
- [ ] Automated payouts (scheduled)
- [ ] Tax document generation (1099)
- [ ] Multi-currency support
- [ ] Revenue forecasting

### Phase 3 (Advanced):
- [ ] Split payments (collaborations)
- [ ] Subscription tiers
- [ ] Promotional pricing
- [ ] Affiliate commissions

---

## 📞 Support

**Database Issues:**
- Check Supabase logs
- Verify RLS policies allow access
- Confirm user is authenticated

**Stripe Issues:**
- Check Stripe Dashboard → Developers → Logs
- Verify webhook signatures
- Test in Stripe test mode first

**Frontend Issues:**
- Check browser console for errors
- Verify API calls include auth headers
- Confirm Supabase client initialized

---

## ✅ Setup Checklist

- [ ] Run `migrations/create_revenue_system.sql` in Supabase
- [ ] Verify 4 tables created
- [ ] Verify 3 RPC functions created
- [ ] Hard refresh browser
- [ ] Go to Profile → Revenue tab
- [ ] Confirm no "authentication required" error
- [ ] See $0.00 balances (correct for new user)
- [ ] (Optional) Run test transactions
- [ ] (Future) Set up Stripe Connect
- [ ] (Future) Implement webhook handlers

---

**Status:** SQL migration ready
**Priority:** HIGH - Core premium feature
**ETA:** 2 minutes to run SQL, revenue dashboard will work immediately
**Next Step:** Run the SQL migration NOW

---

**Last Updated:** December 11, 2025
