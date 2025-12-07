# ⏰ External Cron Service Setup - Quick Start Guide

**Domain:** https://soundbridge.live  
**Endpoint:** `/api/cron/downgrade-past-due`  
**Purpose:** Automatically downgrade accounts after 7-day grace period expires

---

## 🎯 Quick Setup (5 Minutes)

### Step 1: Choose a Cron Service

**Recommended Free Options:**

1. **EasyCron** (https://www.easycron.com/)
   - ✅ Free tier: 1 job (enough for this)
   - ✅ Easy to use
   - ✅ Email notifications
   
2. **cron-job.org** (https://cron-job.org/)
   - ✅ 100% free
   - ✅ Simple interface
   - ✅ Email alerts

3. **UptimeRobot** (https://uptimerobot.com/)
   - ✅ Free tier available
   - ✅ Monitoring + cron

**Recommendation:** Start with **EasyCron** - it's the simplest.

---

## 📝 Step-by-Step: EasyCron Setup

### 1. Sign Up for EasyCron

1. Go to https://www.easycron.com/
2. Click **"Sign Up"** (or **"Free Trial"**)
3. Create your account (free tier is sufficient)

### 2. Create Your Cron Job

1. After logging in, click **"Add Cron Job"** or **"Create"**

2. Fill in the details:

   **Job Title:**
   ```
   SoundBridge - Downgrade Past Due Subscriptions
   ```

   **URL:**
   ```
   https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET_HERE
   ```
   ⚠️ **Replace `YOUR_CRON_SECRET_HERE` with your actual CRON_SECRET from your environment variables!**

   **HTTP Method:**
   ```
   GET
   ```

   **Schedule:**
   ```
   0 0 * * *
   ```
   (Daily at midnight UTC - 00:00 UTC)

   **Timeout:**
   ```
   300
   ```
   (5 minutes - more than enough)

   **Email Notifications:**
   - ✅ Enable "Email me if the cron job fails"
   - Enter your email address

   **Status:**
   - ✅ Enable the job (check the "Enable" checkbox)

3. Click **"Add Cron Job"** or **"Save"**

### 3. Test the Cron Job

1. After creating, click **"Test"** or **"Run Now"** button
2. Wait for the response
3. Check:
   - Response should be: `{"success": true, ...}`
   - Check your Vercel logs to see if it executed
   - Check your email for any errors

---

## 📝 Step-by-Step: cron-job.org Setup

### 1. Sign Up

1. Go to https://cron-job.org/
2. Click **"Sign Up"** (free)
3. Create your account

### 2. Create Cron Job

1. Click **"Create cronjob"**

2. Fill in:

   **Title:**
   ```
   SoundBridge - Downgrade Past Due
   ```

   **Address (URL):**
   ```
   https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET_HERE
   ```
   ⚠️ **Replace with your actual CRON_SECRET!**

   **Schedule:**
   - Click **"Custom"**
   - Enter: `0 0 * * *` (daily at midnight UTC)

   **Request Method:**
   ```
   GET
   ```

   **Notifications:**
   - ✅ Enable email notifications for failures

3. Click **"Create cronjob"**

### 3. Test

1. Click **"Run now"** button next to your cron job
2. Check the response and logs

---

## 🔐 Important: Your CRON_SECRET

**Where to Find Your Secret:**

1. **Local:** Check your `.env.local` file:
   ```
   CRON_SECRET=your_secret_here
   ```

2. **Vercel:** Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Look for `CRON_SECRET`
   - Copy the value

**⚠️ Security Note:**
- The secret is in the URL, which is fine for this use case
- Only authorized requests (with the correct secret) can trigger downgrades
- You can rotate the secret anytime by:
  1. Generating a new one
  2. Updating in environment variables
  3. Updating the cron job URL

---

## ✅ Testing Before Going Live

### Test Manually First

Before enabling the cron job, test it manually:

```bash
# Replace YOUR_CRON_SECRET with your actual secret
curl "https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "No subscriptions to downgrade",
  "downgraded": 0
}
```

**OR if there are subscriptions to downgrade:**
```json
{
  "success": true,
  "message": "Processed 2 subscriptions",
  "downgraded": 2
}
```

**If you get `{"error": "Unauthorized"}`:**
- Check that your secret matches exactly
- No extra spaces or quotes
- The secret in the URL matches your environment variable

---

## 📊 Monitoring & Verification

### After First Run:

1. **Check Cron Service Logs:**
   - EasyCron: Go to "Cron Jobs" → Click your job → View "Execution History"
   - cron-job.org: Go to "Dashboard" → View execution logs

2. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Functions/Logs
   - Look for `[cron]` log entries

3. **Check for Errors:**
   - Look for `[cron] Unauthorized access attempt` (wrong secret)
   - Look for `[cron] Error` messages

### Expected Logs:

When working correctly, you'll see:
```
[cron] Checking for past_due subscriptions to downgrade...
[cron] No subscriptions to downgrade
```

OR if subscriptions are found:
```
[cron] Checking for past_due subscriptions to downgrade...
[cron] Found 1 subscriptions to downgrade
[cron] ✅ Downgraded user abc-123 to free tier
```

---

## 🎯 Schedule Explanation

**Current Schedule:** `0 0 * * *` (Daily at midnight UTC)

This means:
- **Runs:** Once per day
- **Time:** 00:00 UTC (midnight UTC)
- **Why:** Grace period is 7 days, so daily checks are sufficient

**Alternative Schedules:**

If you want to check more frequently (optional):
- `0 */6 * * *` - Every 6 hours
- `0 */12 * * *` - Every 12 hours
- `0 0,12 * * *` - Twice daily (midnight and noon UTC)

**Recommendation:** Stick with daily (`0 0 * * *`) - it's enough.

---

## 🔧 Troubleshooting

### Problem: "Unauthorized" Error

**Solution:**
1. Verify your `CRON_SECRET` matches exactly (no spaces, quotes, etc.)
2. Check environment variable is set in Vercel
3. Copy the secret again and update the cron job URL

### Problem: Cron Job Not Running

**Solution:**
1. Check cron service dashboard - is the job enabled?
2. Check execution history - any errors?
3. Verify the schedule is correct (`0 0 * * *`)
4. Check your email for failure notifications

### Problem: Endpoint Returns Error 500

**Solution:**
1. Check Vercel logs for detailed error messages
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Verify `SENDGRID_API_KEY` is set (for email notifications)
4. Check database connection

### Problem: No Subscriptions Being Downgraded

**This is Normal If:**
- No subscriptions are past_due for more than 7 days
- All subscriptions are in good standing

**To Verify:**
- Check database directly for `status = 'past_due'` subscriptions
- Check `updated_at` timestamp (must be >7 days ago)

---

## 📧 Email Notifications Setup

**Recommended:** Enable email alerts for:
- ✅ Cron job failures
- ✅ Execution errors
- ✅ Successful runs (optional, but helpful for monitoring)

**Where to Enable:**
- EasyCron: In cron job settings → "Email Notifications"
- cron-job.org: In cron job settings → "Notifications" tab

---

## ✅ Setup Checklist

- [ ] Chosen cron service (EasyCron, cron-job.org, or other)
- [ ] Created account
- [ ] Found my `CRON_SECRET` from environment variables
- [ ] Created cron job with correct URL:
  ```
  https://soundbridge.live/api/cron/downgrade-past-due?secret=MY_SECRET
  ```
- [ ] Set schedule to: `0 0 * * *` (daily at midnight UTC)
- [ ] Tested manually (curl or "Run Now" button)
- [ ] Verified response is `{"success": true}`
- [ ] Enabled email notifications for failures
- [ ] Enabled the cron job
- [ ] Verified first automatic run (check logs next day)

---

## 🚀 Quick Reference

**Your Cron Job URL:**
```
https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET
```

**Schedule:**
```
0 0 * * *
```
(Daily at midnight UTC)

**Manual Test Command:**
```bash
curl "https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET"
```

**What It Does:**
- Finds subscriptions with `status = 'past_due'`
- Checks if they've been past_due for more than 7 days
- Downgrades them to `free` tier
- Sets status to `expired`
- Sends account downgraded email to users
- Safe to run multiple times (idempotent)

---

## 🎉 You're Done!

Once set up:
- The cron job will run automatically every day
- Past due accounts will be downgraded after 7 days
- Users will receive downgrade emails
- You'll be notified of any failures

**Next Steps:**
1. Wait for first automatic run (or test manually)
2. Check logs to verify it's working
3. Monitor email notifications for any issues

---

**Last Updated:** December 3, 2025  
**Status:** Ready to Configure
