# Cross-Border Payout Flow Analysis: UK/US → Nigeria

**Date:** December 29, 2025  
**Question:** How does a $5 tip from UK/US to a Nigerian creator work, and is it actually working?

---

## Current Flow: Step by Step

### 1. **Tipping Process** ✅ **WORKING**

**User Flow:**
1. User in UK/US wants to tip $5 to a Nigerian creator
2. User calls `/api/payments/create-tip`
3. Stripe Payment Intent is created (in USD or GBP)
4. User completes payment via Stripe
5. Payment is confirmed via `/api/payments/confirm-tip`

**What Happens Backend:**
```typescript
// apps/web/app/api/payments/confirm-tip/route.ts

1. Payment Intent is confirmed via Stripe
2. Tip is added to creator's wallet:
   - Calls `add_wallet_transaction` RPC
   - Transaction type: 'tip_received'
   - Amount: $4.50 (after 10% platform fee for free tier)
   - Currency: USD (or GBP, depending on payer's currency)

3. Revenue transaction is recorded:
   - Calls `record_revenue_transaction` RPC
   - Updates `creator_revenue` table:
     - `total_earned` += $4.50
     - `available_balance` += $4.50
     - `currency` = 'USD' (or 'GBP')

4. Tip record is stored in:
   - `tip_analytics` table
   - `creator_tips` table (legacy)
```

**Status:** ✅ **This part is working correctly**

---

### 2. **Currency Storage Issue** ⚠️ **PARTIAL**

**Problem:**
- Tips are stored in the payer's currency (USD or GBP)
- Nigerian creator's `creator_revenue.available_balance` is in USD/GBP
- But Nigerian banks need NGN (Nigerian Naira)

**Current State:**
- Balance is stored in original payment currency
- No automatic currency conversion at storage time
- Conversion happens later when payout is initiated

**Impact:** 
- Creator sees balance in USD/GBP
- Payout must convert USD/GBP → NGN at time of payout

---

### 3. **Payout Process** ⚠️ **MANUAL ADMIN INTERVENTION REQUIRED**

#### **Current State: TWO Separate Payout Systems**

##### **A) Stripe Connect Payouts** (For supported countries)
- **Endpoint:** `/api/stripe/connect/create-payout`
- **Use Case:** Creators with Stripe Connect accounts (US, UK, EU, etc.)
- **Flow:** Direct Stripe transfer to creator's Stripe Connect account
- **Status:** ✅ Working for supported countries

##### **B) Wise Payouts** (For African countries)
- **Endpoint:** `/api/admin/payouts` (Admin-only)
- **Use Case:** Creators in Nigeria, Ghana, Kenya (countries not fully supported by Stripe Connect)
- **Flow:** Wise API transfer to African bank account
- **Status:** ✅ Code exists, but requires **manual admin action**

---

### 4. **The Missing Link** ❌ **CRITICAL GAP**

**What's Missing:**

1. **No Automatic Payout Trigger**
   - Creators cannot request payouts themselves
   - No automatic payout when balance reaches threshold
   - Requires admin to manually call `/api/admin/payouts`

2. **No Country Detection for Payout Method**
   - System doesn't automatically detect creator's country
   - Doesn't automatically choose Wise vs Stripe Connect
   - Admin must manually determine which system to use

3. **No Creator-Facing Payout Request API**
   - No endpoint for creators to request payouts
   - No integration between creator balance and payout system
   - No automatic fetching of bank account details

4. **Currency Conversion Timing**
   - Conversion happens at Wise level (USD/GBP → NGN)
   - No pre-conversion at balance level
   - Exchange rate risk between tip time and payout time

---

## Current Wise Payout Flow (When Admin Triggers)

**Admin Action:**
1. Admin calls `POST /api/admin/payouts` with:
   ```json
   {
     "creatorId": "creator-uuid",
     "amount": 50000,  // NGN amount
     "currency": "NGN",
     "bankAccountNumber": "1234567890",
     "bankCode": "044",
     "accountHolderName": "John Doe",
     "sourceCurrency": "GBP"  // Optional, defaults to GBP
   }
   ```

2. **Wise Integration (`payoutToCreator` function):**
   ```typescript
   // apps/web/src/lib/wise/payout.ts
   
   Step 1: Validate inputs ✅
   Step 2: Verify creator exists ✅
   Step 3: Resolve/verify bank account ✅
   Step 4: Create/get Wise recipient ✅
   Step 5: Create quote (GBP → NGN conversion) ✅
   Step 6: Create transfer via Wise API ✅
   Step 7: Store payout record in wise_payouts table ✅
   ```

3. **Wise Webhook Updates:**
   - Webhook receives status updates
   - Updates `wise_payouts.status`
   - Tracks status history

**Status:** ✅ **Code is correct and should work, but requires manual admin action**

---

## What Needs to Be Built

### **1. Creator Payout Request API** 🔴 **HIGH PRIORITY**

**New Endpoint:** `POST /api/creator/payouts/request`

**Functionality:**
- Creator requests payout from their available balance
- System automatically:
  - Detects creator's country from profile
  - Fetches bank account from `creator_bank_accounts`
  - Determines payout method (Wise vs Stripe Connect)
  - Converts currency if needed (USD/GBP → NGN)
  - Calls appropriate payout system

**Example Flow:**
```typescript
// Creator requests payout
POST /api/creator/payouts/request
{
  "amount": 4.50  // USD amount from balance
}

// System detects:
- Creator country: NG (Nigeria)
- Bank account: Already stored in creator_bank_accounts
- Currency conversion: USD → NGN (via Wise quote)
- Payout method: Wise API

// System calls:
payoutToCreator({
  creatorId: "creator-uuid",
  amount: 67000,  // Converted NGN amount
  currency: "NGN",
  bankAccountNumber: "1234567890",  // From creator_bank_accounts
  bankCode: "044",  // From creator_bank_accounts
  accountHolderName: "John Doe",  // From creator_bank_accounts
  sourceCurrency: "USD"  // Original balance currency
})
```

### **2. Automatic Country Detection** 🔴 **HIGH PRIORITY**

**Location:** Profile or bank account data

**Options:**
- Use `profiles.country_code` (if available)
- Use `creator_bank_accounts.currency` to infer country
- Use bank code to determine country (044 = Nigeria, etc.)

### **3. Currency Conversion Strategy** 🟡 **MEDIUM PRIORITY**

**Option A: Convert at Payout Time (Current)**
- ✅ Simpler implementation
- ❌ Exchange rate risk
- ❌ Creator doesn't know NGN amount until payout

**Option B: Convert at Tip Time**
- ✅ Creator sees balance in local currency
- ✅ No exchange rate risk
- ❌ More complex (need real-time exchange rates)

**Recommendation:** Option A for now, Option B as future enhancement

### **4. Payout Status Tracking** 🟢 **LOW PRIORITY**

**Enhancement:**
- Creator-facing API to check payout status
- Integration with Wise webhook for real-time updates
- Notification when payout completes

---

## Current System Status

### ✅ **What's Working:**

1. **Tipping:** Fully functional, tips are added to creator balance
2. **Balance Tracking:** Creator revenue is tracked correctly
3. **Wise Integration:** Code is correct, API functions work
4. **Bank Account Storage:** African bank accounts can be stored
5. **Webhook System:** Wise webhooks update payout status

### ❌ **What's NOT Working:**

1. **Automatic Payouts:** No creator-initiated payout requests
2. **Country Detection:** No automatic detection of payout method needed
3. **Bank Account Fetching:** No automatic fetching from `creator_bank_accounts`
4. **Currency Conversion UI:** Creator doesn't see NGN equivalent until payout

### ⚠️ **What's PARTIALLY Working:**

1. **Payouts:** Work correctly but require manual admin intervention
2. **Currency:** Stored in payment currency, converted at payout time

---

## Testing the Current System

### **To Test if Wise Payouts Actually Work:**

1. **Set up test creator:**
   - Create a test user in Nigeria
   - Add Nigerian bank account via bank account form
   - Add some balance to `creator_revenue` (manually or via tip)

2. **Manually trigger payout (as admin):**
   ```bash
   curl -X POST https://www.soundbridge.live/api/admin/payouts \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "creatorId": "creator-uuid",
       "amount": 50000,
       "currency": "NGN",
       "bankAccountNumber": "1234567890",
       "bankCode": "044",
       "accountHolderName": "Test User",
       "sourceCurrency": "GBP"
     }'
   ```

3. **Check results:**
   - Check `wise_payouts` table for new record
   - Check Wise dashboard for transfer
   - Wait for webhook to update status
   - Verify bank account receives funds

**Expected Result:** ✅ Should work if:
- Wise API token is valid
- Wise account has sufficient balance
- Bank account details are correct
- Webhook is configured

---

## Recommendations

### **Immediate Actions:**

1. **Build Creator Payout Request API** (🔴 Critical)
   - `POST /api/creator/payouts/request`
   - Auto-detect country and payout method
   - Fetch bank account automatically
   - Integrate with Wise for African creators

2. **Add Country Detection**
   - Store country in `profiles.country_code`
   - Use currency from bank account as fallback

3. **Add Payout Status API**
   - `GET /api/creator/payouts/status`
   - Show pending/completed payouts
   - Display Wise transfer status

### **Future Enhancements:**

1. **Automatic Currency Conversion at Tip Time**
   - Convert USD/GBP → NGN when tip is received
   - Store balance in creator's local currency
   - Eliminate exchange rate risk

2. **Payout Thresholds**
   - Minimum payout amount (e.g., $25 or equivalent)
   - Automatic payout when threshold reached
   - Batch payouts for efficiency

3. **Payout Scheduling**
   - Weekly/monthly automatic payouts
   - Creator preference for payout frequency

---

## Summary

### **Current State:**
- ✅ Tips work: UK/US user can tip Nigerian creator, balance is updated
- ⚠️ Payouts work: But require manual admin action via `/api/admin/payouts`
- ❌ Missing: Creator-facing payout request system
- ❌ Missing: Automatic country detection and payout method selection

### **Is it Actually Working?**
- **Tipping:** ✅ YES - Fully functional
- **Balance Tracking:** ✅ YES - Working correctly
- **Wise Integration:** ✅ YES - Code is correct and should work
- **Automatic Payouts:** ❌ NO - Requires manual admin intervention
- **Creator Experience:** ❌ NO - Creators cannot request payouts themselves

### **What Needs to Be Built:**
1. Creator payout request API
2. Automatic country detection
3. Automatic bank account fetching
4. Currency conversion at payout time (already handled by Wise)

---

**Conclusion:** The foundation is solid, but the system is incomplete. Tipping works perfectly, but payouts require manual admin action. The Wise integration code is correct and should work, but it needs to be wrapped in a creator-facing API to be fully functional.

---

**Document Version:** 1.0  
**Last Updated:** December 29, 2025

