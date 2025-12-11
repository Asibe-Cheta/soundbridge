# Database Setup - Quick Start Guide

**Date:** December 11, 2025
**Purpose:** Fix onboarding modal appearing on every page refresh

---

## 🚨 The Problem

You're seeing the onboarding modal on every page refresh because the `profiles` table is missing subscription-related columns. When the API tries to check `subscription_tier` and `subscription_status`, it fails because those columns don't exist yet.

---

## ✅ The Solution

Run the SQL queries in [CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql](CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql) to:
1. Add missing subscription columns to profiles table
2. Update your profile with correct onboarding status
3. Fix the persistent onboarding modal issue

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query** to create a new SQL query

---

### Step 2: Check Current Columns (Optional but Recommended)

Copy and paste this query to see what columns currently exist:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Click "Run"**

**Expected Result:** You'll see a list of columns. If you DON'T see `subscription_tier`, `subscription_status`, etc., proceed to Step 3.

---

### Step 3: Add Subscription Columns

Copy and paste ALL of these statements (lines 19-47 from CHECK_AND_ADD_SUBSCRIPTION_COLUMNS.sql):

```sql
-- Add subscription-related columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'unlimited'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period VARCHAR(20) CHECK (subscription_period IN ('monthly', 'annual') OR subscription_period IS NULL);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'past_due', 'trial') OR subscription_status IS NULL);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_cancel_date TIMESTAMP WITH TIME ZONE;

-- Upload tracking columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS uploads_this_period INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upload_period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_uploads_lifetime INTEGER DEFAULT 0;

-- Custom username (Premium/Unlimited only)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_username VARCHAR(30) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_username_last_changed TIMESTAMP WITH TIME ZONE;

-- Featured placement tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_count_this_month INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_featured_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_featured_date TIMESTAMP WITH TIME ZONE;

-- Stripe/RevenueCat identifiers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_customer_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_custom_username ON profiles(custom_username) WHERE custom_username IS NOT NULL;
```

**Click "Run"**

**Expected Result:** "Success. No rows returned" (This is normal - ALTER TABLE doesn't return rows)

---

### Step 4: Verify Columns Were Added

Copy and paste this query to verify:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
  AND column_name LIKE '%subscription%'
ORDER BY ordinal_position;
```

**Click "Run"**

**Expected Result:** You should see:
- `subscription_tier` | `character varying` | `'free'::character varying`
- `subscription_status` | `character varying` |
- `subscription_period` | `character varying` |
- `subscription_start_date` | `timestamp with time zone` |
- `subscription_renewal_date` | `timestamp with time zone` |
- `subscription_cancel_date` | `timestamp with time zone` |

---

### Step 5: Check Your Current Profile Status

Copy and paste this query:

```sql
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

**Click "Run"**

**Expected Result:** You should see your profile with:
- `onboarding_completed`: might be `false` or `null`
- `subscription_tier`: probably `free` (from default value)
- `subscription_status`: probably `null`

---

### Step 6: Update Your Profile to Mark Onboarding as Completed

**IMPORTANT:** Choose ONE of these based on your actual subscription status:

#### Option A: If you're on FREE tier (most users):

```sql
UPDATE profiles
SET
  onboarding_completed = true,
  onboarding_step = 'completed',
  subscription_tier = 'free',
  subscription_status = 'active',
  updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com'
);
```

#### Option B: If you have an ACTIVE PREMIUM subscription:

```sql
UPDATE profiles
SET
  onboarding_completed = true,
  onboarding_step = 'completed',
  subscription_tier = 'premium',
  subscription_status = 'active',
  subscription_period = 'monthly', -- or 'annual' if you're on annual plan
  updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com'
);
```

#### Option C: If you have an ACTIVE UNLIMITED subscription:

```sql
UPDATE profiles
SET
  onboarding_completed = true,
  onboarding_step = 'completed',
  subscription_tier = 'unlimited',
  subscription_status = 'active',
  subscription_period = 'monthly', -- or 'annual' if you're on annual plan
  updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com'
);
```

**Click "Run"**

**Expected Result:** "Success. 1 row affected" or similar

---

### Step 7: Verify the Update Worked

Run the query from Step 5 again to confirm:

```sql
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
- `onboarding_completed`: `true` ✅
- `onboarding_step`: `completed` ✅
- `subscription_tier`: `free` (or your tier) ✅
- `subscription_status`: `active` ✅

---

### Step 8: Test in Browser

1. **Go to your SoundBridge web app**
2. **Hard refresh the page:**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. **Log out and log back in** (if hard refresh doesn't work)

**Expected Result:** 🎉 **Onboarding modal should NOT appear anymore!**

---

## 🔍 Troubleshooting

### Issue: "column already exists" error

**Solution:** This is fine! The `IF NOT EXISTS` clause means it won't create duplicates. Just continue to the next step.

---

### Issue: "relation 'profiles' does not exist"

**Solution:** Your profiles table hasn't been created yet. Run the main database schema setup first:
1. Look for `database/schema.sql` or similar in your project
2. Run that first to create the profiles table
3. Then come back to this guide

---

### Issue: "no rows returned" when checking profile (Step 5)

**Possible Cause:** Your profile doesn't exist in the database yet.

**Solution:**
1. First, verify your user exists in auth.users:
```sql
SELECT id, email FROM auth.users WHERE email = 'asibechetachukwu@gmail.com';
```

2. If user exists but no profile, create one:
```sql
INSERT INTO profiles (
  id,
  username,
  display_name,
  role,
  onboarding_completed,
  onboarding_step,
  subscription_tier,
  subscription_status
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'asibechetachukwu@gmail.com'),
  'justice_asibe', -- Choose your username
  'Justice Asibe', -- Your display name
  'musician', -- or 'listener', 'label', 'venue'
  true,
  'completed',
  'free', -- or 'premium', 'unlimited'
  'active'
);
```

---

### Issue: Onboarding modal still appears after Step 8

**Possible Causes:**
1. Browser cache not cleared
2. Session not refreshed

**Solutions:**
1. **Clear browser cache completely:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content

2. **Log out and log back in**

3. **Check browser console for errors:**
   - Press F12 to open DevTools
   - Go to Console tab
   - Look for errors related to onboarding or profile

4. **Verify the API is returning correct data:**
   - In browser DevTools, go to Network tab
   - Refresh the page
   - Look for request to `/api/user/onboarding-status`
   - Check the response - should show:
     ```json
     {
       "success": true,
       "needsOnboarding": false,
       "profile": { ... }
     }
     ```

---

## 📊 Understanding the Fix

### Why This Works:

1. **Before Fix:**
   - API tries to check `subscription_tier` and `subscription_status`
   - Columns don't exist → SQL error
   - API returns `profile: null`
   - App thinks you need onboarding → modal appears

2. **After Fix:**
   - Subscription columns exist
   - Profile has `onboarding_completed: true`
   - Profile has `subscription_tier: 'free'` and `subscription_status: 'active'`
   - API returns correct profile data
   - App sees onboarding is completed → modal doesn't appear

### How Subscription Tiers Affect Onboarding:

According to [apps/web/app/api/user/onboarding-status/route.ts:90-108](apps/web/app/api/user/onboarding-status/route.ts:90-108):

**Premium/Unlimited Users:**
- If `subscription_tier` is `'premium'` or `'unlimited'`
- AND `subscription_status` is `'active'`
- → Skip onboarding entirely (even if `onboarding_completed` is false)

**Free Tier Users:**
- If `subscription_tier` is `'free'`
- AND `onboarding_completed` is `true`
- → Skip onboarding

This means Premium/Unlimited subscribers NEVER see onboarding again after subscribing, regardless of the `onboarding_completed` flag.

---

## ✅ Success Checklist

- [ ] Ran STEP 1: Checked current columns
- [ ] Ran STEP 3: Added subscription columns
- [ ] Ran STEP 4: Verified columns were added (saw subscription_tier, etc.)
- [ ] Ran STEP 5: Checked current profile status
- [ ] Ran STEP 6: Updated profile with onboarding_completed = true
- [ ] Ran STEP 7: Verified update worked
- [ ] Ran STEP 8: Tested in browser (hard refresh + logout/login)
- [ ] ✨ Onboarding modal no longer appears!

---

## 🎯 What's Next After Database Setup?

Once the onboarding modal is fixed, you can proceed to test the Stripe Connect integration:

1. **Review:** [STRIPE_CONNECT_TESTING_GUIDE.md](STRIPE_CONNECT_TESTING_GUIDE.md)
2. **Test:** Revenue tab → Complete Stripe Connect Setup
3. **Verify:** Account appears in Stripe Dashboard

---

**Need Help?**

Check the console logs when the app loads:
- Look for: `📊 Onboarding status check result:`
- Should show: `needsOnboarding: false`

If you see `needsOnboarding: true`, something went wrong. Review the troubleshooting section above.

---

**Good luck! 🚀**
