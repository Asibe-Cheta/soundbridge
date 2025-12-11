# Stripe Connect Testing Guide

**Date:** December 11, 2025
**Status:** ✅ All fixes implemented and ready for testing

---

## 🎯 What Was Fixed

We've implemented several critical fixes to ensure Stripe Connect accounts are created properly:

### 1. **Automatic Stripe Connect Creation**
- When you save bank details, the system now automatically creates a Stripe Connect account
- No need to click two separate buttons anymore
- [BankAccountManager.tsx:69-142](apps/web/src/components/revenue/BankAccountManager.tsx:69-142)

### 2. **Warning Banner for Existing Users**
- If you have bank details saved but no Stripe Connect account, you'll see a yellow warning banner
- One-click button to complete Stripe Connect setup
- [BankAccountManager.tsx:386-416](apps/web/src/components/revenue/BankAccountManager.tsx:386-416)

### 3. **Authentication Fix**
- Added `credentials: 'include'` to all fetch requests to fix 401 authentication errors
- Works properly with cookie-based authentication
- [BankAccountManager.tsx:110, 167](apps/web/src/components/revenue/BankAccountManager.tsx:110)

### 4. **Database Schema Updates**
- Added subscription columns to profiles table
- Fixed SQL queries to properly join auth.users with profiles
- See [CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql](CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql)

---

## 📋 Pre-Testing Checklist

Before testing, ensure you've completed these database setup steps:

### Step 1: Add Subscription Columns to Profiles Table

Run the queries in [CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql](CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql) in this order:

```sql
-- 1. Check if columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

If you don't see `subscription_tier`, `subscription_status`, etc., run:

```sql
-- 2. Add subscription columns (STEP 2 from the file)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'unlimited'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period VARCHAR(20) CHECK (subscription_period IN ('monthly', 'annual') OR subscription_period IS NULL);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'past_due', 'trial') OR subscription_status IS NULL);
-- ... (run all ALTER TABLE statements from STEP 2)
```

### Step 2: Update Your Profile

```sql
-- Set your profile with correct onboarding status
UPDATE profiles
SET
  onboarding_completed = true,
  onboarding_step = 'completed',
  subscription_tier = 'free',  -- Change to 'premium' or 'unlimited' if you have a subscription
  subscription_status = 'active',
  updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com'
);
```

### Step 3: Verify Profile Setup

```sql
-- Check your profile
SELECT
  u.id as user_id,
  u.email,
  p.username,
  p.display_name,
  p.role,
  p.onboarding_completed,
  p.onboarding_step,
  p.subscription_tier,
  p.subscription_status,
  p.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'asibechetachukwu@gmail.com';
```

**Expected Result:**
- `onboarding_completed`: `true`
- `onboarding_step`: `completed`
- `subscription_tier`: `free` (or your actual tier)
- `subscription_status`: `active`

---

## 🧪 Testing Scenarios

### Scenario 1: New User Setting Up Bank Account (First Time)

**Expected Flow:**

1. Navigate to Dashboard → Revenue tab
2. Click "Add Bank Account" button
3. Fill in bank details:
   - Account Holder Name: Your name
   - Bank Name: Your bank
   - Account Number: Test account number
   - Routing Number: 9-digit number
   - Account Type: Checking/Savings
   - Currency: USD/GBP/etc.
4. Click "Save"

**What Should Happen:**

✅ Bank details saved to database
✅ Stripe Connect account automatically created
✅ Success message: "Bank account saved and Stripe Connect account created! Redirecting..."
✅ After 2 seconds, redirected to Stripe onboarding page
✅ Complete Stripe onboarding (ID verification, bank details, etc.)
✅ After completion, account shows in Stripe Dashboard under "Connected accounts"

**How to Verify:**

```sql
-- Check database
SELECT
  account_holder_name,
  bank_name,
  stripe_account_id,
  verification_status,
  is_verified
FROM creator_bank_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com');
```

**Expected Result:**
- `stripe_account_id`: Should have value like `acct_xxxxxxxxxxxx` (not NULL)
- `verification_status`: `pending` (changes to `verified` after Stripe onboarding)
- `is_verified`: `false` (changes to `true` after Stripe approval)

**Stripe Dashboard Check:**
1. Go to https://dashboard.stripe.com/connect/accounts/overview
2. Click "Connected accounts" tab
3. You should see your account listed as "Enabled" or "Pending"

---

### Scenario 2: Existing User with Bank Details but No Stripe Connect (Your Current Situation)

**Expected Flow:**

1. Navigate to Dashboard → Revenue tab
2. You should see a **yellow warning banner** at the top:
   > ⚠️ **Stripe Connect Not Set Up**
   > Your bank details are saved, but you need to complete Stripe Connect setup to receive payouts.
   > Earnings will be stored in your digital wallet until setup is complete.
3. Click the **"Complete Stripe Connect Setup"** button

**What Should Happen:**

✅ System creates Stripe Connect account
✅ Redirected to Stripe onboarding page
✅ Complete Stripe onboarding
✅ After completion, warning banner disappears
✅ Account shows in Stripe Dashboard

**Browser Console Logs to Look For:**

```
Creating Stripe Connect account after saving bank details...
```

**How to Verify:**

Check browser console (F12 → Console tab) for:
- No 401 authentication errors
- No CORS errors
- Successful API response with `onboardingUrl`

---

### Scenario 3: Editing Existing Bank Account

**Expected Flow:**

1. Navigate to Dashboard → Revenue tab
2. You should see your existing bank account details
3. Click "Edit" button
4. Make changes to bank details (or keep as-is)
5. Click "Save"

**What Should Happen:**

If Stripe Connect account already exists:
✅ Bank details updated
✅ Success message: "Bank account information saved successfully!"
✅ No redirect to Stripe (account already set up)

If NO Stripe Connect account:
✅ Bank details updated
✅ Stripe Connect account created
✅ Redirected to Stripe onboarding

---

## 🔍 Troubleshooting

### Issue 1: "Authentication required" Error

**Symptoms:**
- 401 error in browser console
- Error message: "Authentication required"

**Fix Applied:**
Added `credentials: 'include'` to fetch requests

**How to Verify Fix:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Complete Stripe Connect Setup"
4. Look for request to `/api/stripe/connect/create-account`
5. Check Request Headers → Should include `Cookie` header

**If still getting error:**
- Clear browser cookies and log in again
- Check that you're logged in to the web app
- Verify your session is active

---

### Issue 2: No Redirect to Stripe Onboarding

**Symptoms:**
- Bank details saved
- No error shown
- But no redirect happens

**Possible Causes:**
1. Pop-up blocker preventing redirect
2. JavaScript error in console
3. `onboardingUrl` not returned from API

**How to Debug:**

Check browser console for:
```javascript
console.log('Creating Stripe Connect account after saving bank details...');
```

Check Network tab for response from `/api/stripe/connect/create-account`:
```json
{
  "success": true,
  "accountId": "acct_xxxxxxxxxxxx",
  "onboardingUrl": "https://connect.stripe.com/setup/..."
}
```

**Manual Solution:**
If you see the `onboardingUrl` in the response, copy it and paste it in your browser.

---

### Issue 3: Warning Banner Doesn't Appear

**Symptoms:**
- You have bank details saved
- No `stripe_account_id` in database
- But warning banner doesn't show

**Possible Causes:**
1. Browser cache showing old version
2. Component not re-rendering

**Fix:**
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Clear browser cache
3. Log out and log back in

---

### Issue 4: Stripe Dashboard Shows No Connected Accounts

**Symptoms:**
- Bank details saved
- `stripe_account_id` exists in database
- But nothing in Stripe Dashboard

**Possible Causes:**
1. Using wrong Stripe account (test vs. live mode)
2. Stripe Connect not enabled on your Stripe account
3. Account created but onboarding not completed

**How to Check:**

1. **Verify Stripe Mode:**
   - Check your `.env.local` file
   - Look for `STRIPE_SECRET_KEY`
   - If starts with `sk_test_`, you're in test mode
   - If starts with `sk_live_`, you're in live mode

2. **Check Stripe Dashboard Mode:**
   - Top left of Stripe Dashboard shows "Test mode" or "Live mode"
   - Make sure it matches your `STRIPE_SECRET_KEY`

3. **Verify Stripe Connect is Enabled:**
   - Go to https://dashboard.stripe.com/settings/connect
   - Check if Connect is enabled
   - If not, follow Stripe's setup guide

4. **Check Account ID:**
   ```sql
   SELECT stripe_account_id
   FROM creator_bank_accounts
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com');
   ```

   Copy the `acct_xxxxx` ID and search for it in Stripe Dashboard.

---

## 📊 Success Indicators

### Immediate Success (Right After Setup):

✅ Bank details visible in Revenue tab
✅ `stripe_account_id` exists in database (not NULL)
✅ Account appears in Stripe Dashboard → Connected accounts
✅ Verification status: "Pending"
✅ No warning banner (if Stripe Connect set up)

### After Completing Stripe Onboarding:

✅ Account status changes to "Enabled" in Stripe Dashboard
✅ Identity verification completed
✅ Bank account linked
✅ Can receive payouts

### After Stripe Approval (1-3 business days):

✅ `verification_status` changes to "verified" in database
✅ `is_verified` changes to `true`
✅ Account fully functional for payouts

---

## 🚀 Next Steps After Testing

Once you've confirmed everything works:

1. **Complete Stripe Onboarding:**
   - Follow the Stripe onboarding flow
   - Verify your identity (photo ID, etc.)
   - Link your bank account
   - Accept Stripe's terms

2. **Monitor Verification Status:**
   - Check Stripe Dashboard regularly
   - Stripe usually reviews within 1-3 business days
   - You'll receive email updates from Stripe

3. **Test Payouts:**
   - Once verified, test receiving a small payout
   - Verify it appears in your bank account

4. **Production Readiness:**
   - If using test mode, repeat setup in live mode when ready
   - Update environment variables to use live Stripe keys
   - Re-run setup flow in production

---

## 📝 Testing Checklist

Use this checklist to track your testing progress:

- [ ] Ran database migrations (CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql)
- [ ] Updated profile with correct onboarding status
- [ ] Refreshed browser to verify onboarding modal doesn't appear
- [ ] Saw yellow warning banner (if applicable)
- [ ] Clicked "Complete Stripe Connect Setup" button
- [ ] No authentication errors in console
- [ ] Successfully redirected to Stripe onboarding page
- [ ] `stripe_account_id` saved in database
- [ ] Account visible in Stripe Dashboard → Connected accounts
- [ ] Completed Stripe onboarding (ID verification, bank details)
- [ ] Account status shows "Enabled" in Stripe Dashboard
- [ ] Warning banner disappeared after setup
- [ ] Can edit bank details without issues
- [ ] Verification status updates after Stripe review

---

## 🔧 Files Modified (For Reference)

1. **[apps/web/src/components/revenue/BankAccountManager.tsx](apps/web/src/components/revenue/BankAccountManager.tsx)**
   - Lines 69-142: Updated `handleSave()` to create Stripe Connect account
   - Lines 386-416: Added warning banner for existing users
   - Lines 110, 167: Added `credentials: 'include'` to fix authentication

2. **[apps/web/app/api/stripe/connect/create-account/route.ts](apps/web/app/api/stripe/connect/create-account/route.ts)**
   - Already properly configured for both web and mobile
   - Handles authentication correctly
   - Creates Stripe Express accounts

3. **[CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql](CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql)**
   - Adds subscription columns to profiles table
   - Updates profile with correct onboarding status

4. **[FIX_ONBOARDING_STATUS.sql](FIX_ONBOARDING_STATUS.sql)**
   - Helper queries to check and fix onboarding status

---

## 💡 Tips

1. **Clear Browser Cache:** Always hard refresh after making changes (`Ctrl + Shift + R`)

2. **Check Console:** Keep browser DevTools open to see any errors or logs

3. **Test in Incognito:** Sometimes browser extensions interfere with redirects

4. **Use Test Mode:** Always test in Stripe test mode first before going live

5. **Check Email:** Stripe sends email updates about account status

6. **Be Patient:** Stripe verification can take 1-3 business days

---

**Ready to test?** Start with the database setup steps, then proceed with Scenario 2 (since you already have bank details saved). Good luck! 🚀
