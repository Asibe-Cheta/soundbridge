# Testing the New Onboarding Flow

**Date:** December 2024  
**Status:** Ready for Testing  
**Payment Mode:** ✅ **REAL PAYMENTS** (Production Stripe)

---

## ⚠️ **IMPORTANT: REAL PAYMENTS ENABLED**

The payment integration uses **REAL Stripe keys** and will process **ACTUAL payments**. Make sure you're ready to test with real credit cards or use small amounts.

---

## 🚀 **PRE-TESTING SETUP**

### **Step 1: Deploy Database Migrations**

Run these SQL files in Supabase SQL Editor (in order):

1. **`database/onboarding_new_flow_schema.sql`**
   ```sql
   -- Copy and paste the entire file into Supabase SQL Editor
   -- This adds onboarding_user_type, money_back_guarantee_end_date, and onboarding_analytics table
   ```

2. **`database/fix_upload_limits_tier_corrections.sql`**
   ```sql
   -- Copy and paste the entire file into Supabase SQL Editor
   -- This fixes upload limits (Pro = 10/month, Free = 3 lifetime)
   ```

**Verify:**
- Check that `onboarding_user_type` column exists in `profiles` table
- Check that `money_back_guarantee_end_date` column exists in `user_subscriptions` table
- Check that `onboarding_analytics` table exists

### **Step 2: Verify Environment Variables**

Ensure these are set in your Vercel/Environment:

```env
STRIPE_SECRET_KEY=sk_live_...  # REAL production key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # REAL production key
STRIPE_PRO_MONTHLY_PRICE_ID=price_...  # Your actual Stripe price ID
STRIPE_PRO_YEARLY_PRICE_ID=price_...  # Your actual Stripe price ID
STRIPE_WEBHOOK_SECRET=whsec_...  # Your webhook secret
```

**⚠️ WARNING:** These are REAL production keys. Payments will be processed immediately.

### **Step 3: Wait for Vercel Deployment**

After pushing to GitHub, wait for Vercel to deploy (usually 2-3 minutes). Check your Vercel dashboard to confirm deployment is complete.

---

## 🧪 **TESTING THE ONBOARDING FLOW**

### **Test 1: Complete New User Onboarding (Free Tier)**

1. **Create a new user account**
   - Go to your sign-up page
   - Create a new account with a test email

2. **Welcome Screen**
   - ✅ Should auto-advance after 2 seconds
   - ✅ Can tap anywhere to continue
   - ✅ Shows SoundBridge logo and value proposition

3. **User Type Selection**
   - ✅ Should show 4 options: Music Creator, Podcast Creator, Industry Professional, Music Lover
   - ✅ Can select one or skip
   - ✅ "Continue" button only enabled after selection

4. **Quick Setup**
   - ✅ Display Name field (required, min 2 chars)
   - ✅ Username field with real-time availability check
     - Try an existing username → Should show "Username taken"
     - Try a new username → Should show "✓ Available"
   - ✅ Genre selection (min 3 required)
   - ✅ Location selection (optional)
   - ✅ "Continue" button only enabled when all required fields are valid

5. **Value Demo**
   - ✅ Should show 3 creator profile cards
   - ✅ Each card shows: avatar, name, location, stats (connections, tracks, verified badge)
   - ✅ "Continue" button to proceed

6. **Tier Selection**
   - ✅ Should show Free and Pro side-by-side
   - ✅ Free tier shows: 3 lifetime uploads, 5 searches/month, 3 messages/month
   - ✅ Pro tier shows: 10 uploads/month, unlimited searches/messages, 7-day money-back guarantee
   - ✅ Can select Free or Pro
   - ✅ "Continue" button appears after selection

7. **If Free Selected → Welcome Confirmation**
   - ✅ Shows success animation
   - ✅ Shows "You're on the Free plan" badge
   - ✅ "Start Exploring" button redirects to /discover

8. **If Pro Selected → Payment Collection**
   - ✅ Shows payment form
   - ✅ Monthly/Annual toggle works
   - ✅ Card number formatting (spaces every 4 digits)
   - ✅ Expiry formatting (MM/YY)
   - ✅ CVV (3 digits only)
   - ✅ Cardholder name field
   - ✅ Shows 7-day money-back guarantee badge
   - ✅ "Upgrade to Pro" button processes payment

9. **Payment Processing (Pro)**
   - ⚠️ **REAL PAYMENT** - Will charge actual card
   - ✅ Should show "Processing..." while submitting
   - ✅ On success: Redirects to Welcome Confirmation
   - ✅ On error: Shows error message (card declined, invalid details, etc.)

10. **Welcome Confirmation (Pro)**
    - ✅ Shows success animation
    - ✅ Shows "Pro Active" badge
    - ✅ Shows "7-day money-back guarantee" message
    - ✅ "Start Exploring" button redirects to /discover

### **Test 2: Verify Database Updates**

After completing onboarding, check the database:

```sql
-- Check profile was created with onboarding_user_type
SELECT id, username, display_name, role, onboarding_user_type, onboarding_completed, onboarding_step
FROM profiles
WHERE email = 'your-test-email@example.com';

-- If Pro was selected, check subscription
SELECT id, user_id, tier, status, subscription_start_date, money_back_guarantee_end_date, stripe_customer_id, stripe_subscription_id
FROM user_subscriptions
WHERE user_id = (SELECT id FROM profiles WHERE email = 'your-test-email@example.com');
```

**Expected Results:**
- `onboarding_user_type` should match selected type (music_creator, podcast_creator, etc.)
- `role` should be 'creator' (unless music_lover → 'listener')
- `onboarding_completed` should be `true`
- `onboarding_step` should be 'completed'
- If Pro: `tier` should be 'pro', `money_back_guarantee_end_date` should be 7 days from `subscription_start_date`

### **Test 3: Test Upload Limits**

1. **Free Tier User:**
   - ✅ Upload 3 tracks → Should succeed
   - ✅ Try to upload 4th track → Should fail with "3 lifetime uploads" error

2. **Pro Tier User:**
   - ✅ Upload 10 tracks in current month → Should succeed
   - ✅ Try to upload 11th track → Should fail with "monthly limit of 10 uploads" error
   - ✅ Wait until 1st of next month → Should be able to upload 10 more

### **Test 4: Test Username Checking**

1. **Real-time availability:**
   - ✅ Type a username → Should check after 500ms delay
   - ✅ Available username → Shows green checkmark
   - ✅ Taken username → Shows red X and suggestions

2. **Validation:**
   - ✅ Username < 3 chars → Shows error
   - ✅ Username > 30 chars → Shows error
   - ✅ Username with special chars → Shows error (only lowercase, numbers, underscore allowed)

### **Test 5: Test Value Demo Endpoint**

Test the API directly:

```bash
# Get value demo creators
curl -X GET "https://your-domain.com/api/onboarding/value-demo?user_type=music_creator&limit=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- Returns 3 creator profiles
- Each has: id, username, display_name, avatar_url, location, stats

### **Test 6: Test Payment Processing**

**⚠️ WARNING: This will charge a REAL card!**

1. **Use a real credit card** (or test with a small amount)
2. **Complete onboarding and select Pro**
3. **Enter card details:**
   - Card Number: Your real card number
   - Expiry: Valid expiry (MM/YY)
   - CVV: Your card's CVV
   - Name: Cardholder name

4. **Submit payment:**
   - ✅ Should process immediately (no trial period)
   - ✅ Should create Stripe customer
   - ✅ Should create Stripe subscription
   - ✅ Should charge card immediately
   - ✅ Should set `money_back_guarantee_end_date` in database

5. **Check Stripe Dashboard:**
   - ✅ Customer should be created
   - ✅ Subscription should be active
   - ✅ Payment should be successful
   - ✅ No trial period should be set

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Onboarding doesn't start**

**Check:**
1. Is user authenticated?
2. Does profile exist? (Check `profiles` table)
3. Is `onboarding_completed` set to `false`?
4. Check browser console for errors

**Fix:**
- Manually set `onboarding_completed = false` in database
- Or set `onboarding_step = 'welcome'` to force new flow

### **Issue: Username check not working**

**Check:**
1. Is `/api/onboarding/check-username` endpoint accessible?
2. Check browser network tab for API calls
3. Check server logs for errors

**Fix:**
- Verify endpoint is deployed
- Check CORS headers
- Verify Supabase connection

### **Issue: Payment fails**

**Check:**
1. Are Stripe keys correct? (Check environment variables)
2. Is Stripe price ID correct?
3. Check Stripe dashboard for errors
4. Check server logs for detailed error

**Common Errors:**
- `Card declined` → Card was declined by bank
- `Invalid payment details` → Check card number, expiry, CVV format
- `Stripe is not configured` → Missing `STRIPE_SECRET_KEY` env var

### **Issue: Upload limits not working**

**Check:**
1. Did you run `fix_upload_limits_tier_corrections.sql`?
2. Check database function: `SELECT check_upload_count_limit('user-uuid-here');`
3. Verify user's tier in `user_subscriptions` table

**Fix:**
- Re-run the SQL migration
- Check function exists: `\df check_upload_count_limit` in PostgreSQL

---

## ✅ **SUCCESS CRITERIA**

After testing, you should have:

1. ✅ New user can complete full onboarding flow
2. ✅ Username checking works in real-time
3. ✅ Value demo shows creator profiles
4. ✅ Free tier selection works (no payment)
5. ✅ Pro tier selection processes real payment
6. ✅ `money_back_guarantee_end_date` is set correctly (7 days from start)
7. ✅ `onboarding_user_type` is saved correctly
8. ✅ Upload limits work (Free = 3 lifetime, Pro = 10/month)
9. ✅ Welcome confirmation shows correct tier status
10. ✅ User is redirected to /discover after completion

---

## 📊 **VERIFY IN DATABASE**

After testing, run these queries:

```sql
-- Check onboarding completion
SELECT 
  id,
  username,
  display_name,
  role,
  onboarding_user_type,
  onboarding_completed,
  onboarding_step,
  profile_completed
FROM profiles
WHERE email = 'your-test-email@example.com';

-- Check subscription (if Pro)
SELECT 
  id,
  tier,
  status,
  subscription_start_date,
  money_back_guarantee_end_date,
  subscription_renewal_date,
  stripe_customer_id,
  stripe_subscription_id
FROM user_subscriptions
WHERE user_id = (SELECT id FROM profiles WHERE email = 'your-test-email@example.com');

-- Verify money-back guarantee date is 7 days from start
SELECT 
  subscription_start_date,
  money_back_guarantee_end_date,
  money_back_guarantee_end_date - subscription_start_date AS days_difference
FROM user_subscriptions
WHERE tier = 'pro' AND status = 'active';
-- Should show 7 days difference
```

---

## 🎯 **QUICK TEST CHECKLIST**

- [ ] Database migrations run successfully
- [ ] Environment variables set (real Stripe keys)
- [ ] Vercel deployment complete
- [ ] Welcome screen appears and auto-advances
- [ ] User type selection works
- [ ] Quick setup validates correctly
- [ ] Username checking works in real-time
- [ ] Value demo shows creators
- [ ] Tier selection works
- [ ] Free tier completes without payment
- [ ] Pro tier processes real payment
- [ ] Welcome confirmation shows correct tier
- [ ] User redirected to /discover
- [ ] Database fields populated correctly
- [ ] Upload limits work as expected

---

**Ready to test!** 🚀

Remember: **Payments are REAL** - use a card you're comfortable testing with, or test with a small amount first.
