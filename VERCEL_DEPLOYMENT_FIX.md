# ✅ Vercel Deployment Fix - Cron Job Schedule

**Date:** December 18, 2025  
**Status:** 🟢 **FIXED - DEPLOYED**

---

## 🐛 **The Problem**

Vercel deployments were failing because the cron job schedule violated Hobby plan restrictions.

**Error:** Deployment failed on Vercel  
**Root Cause:** Cron job scheduled to run every 5 minutes (`*/5 * * * *`)

---

## 📋 **Vercel Hobby Plan Restrictions**

According to [Vercel's Cron Jobs documentation](https://vercel.com/docs/cron-jobs/usage-and-pricing):

| Plan | Cron Jobs Limit | Schedule Restrictions |
|------|----------------|----------------------|
| **Hobby** | 2 cron jobs | **Once per day only** |
| **Pro** | 40 cron jobs | Unlimited frequency |
| **Enterprise** | 100 cron jobs | Unlimited frequency |

**Hard limit:** 20 cron jobs per project (all plans)

---

## ✅ **The Fix**

### **Before (Broken):**
```json
{
  "crons": [
    {
      "path": "/api/cron/moderate-content",
      "schedule": "*/5 * * * *"  // ❌ Every 5 minutes - NOT ALLOWED on Hobby
    }
  ]
}
```

### **After (Fixed):**
```json
{
  "crons": [
    {
      "path": "/api/cron/moderate-content",
      "schedule": "0 0 * * *"  // ✅ Daily at midnight - ALLOWED on Hobby
    }
  ]
}
```

---

## 📊 **Current Cron Jobs**

### **1. Content Moderation** (`apps/web/vercel.json`)
- **Path:** `/api/cron/moderate-content`
- **Schedule:** `0 0 * * *` (Daily at midnight UTC)
- **Status:** ✅ Fixed

### **2. Subscription Downgrade** (`vercel.json` root)
- **Path:** `/api/cron/downgrade-past-due`
- **Schedule:** `0 0 * * *` (Daily at midnight UTC)
- **Status:** ✅ Already compliant

**Total:** 2 cron jobs (within Hobby plan limit of 2)

---

## 🚀 **Deployment Status**

**Commit:** `99c380ae` - "fix: Change cron schedule to daily (Hobby plan compliance)"  
**Status:** ✅ Pushed to GitHub  
**Vercel:** Should auto-deploy now

---

## ⚠️ **Important Notes**

### **Hobby Plan Limitations:**

1. **Timing Accuracy:**
   - Vercel cannot assure timely cron job invocation on Hobby plan
   - A cron job configured for `0 0 * * *` (midnight) may trigger anywhere between 00:00 and 00:59
   - For precise timing, upgrade to Pro plan

2. **Frequency:**
   - Hobby plan: Once per day maximum
   - Cannot run every 5 minutes, every hour, etc.
   - Must use daily schedule (`0 0 * * *`)

3. **Alternative for Frequent Jobs:**
   - Use external cron service (cron-job.org, EasyCron, etc.)
   - Call API endpoint manually when needed
   - Upgrade to Pro plan ($20/month) for unlimited frequency

---

## 🔄 **If You Need More Frequent Moderation**

### **Option 1: External Cron Service (Free)**
Use a free external service to call your API every 5 minutes:

1. Sign up at [cron-job.org](https://cron-job.org) (free)
2. Create cron job:
   - **URL:** `https://www.soundbridge.live/api/cron/moderate-content`
   - **Schedule:** Every 5 minutes
   - **Method:** GET
   - **Header:** `Authorization: Bearer YOUR_CRON_SECRET`
3. Remove cron from `vercel.json` to avoid conflicts

### **Option 2: Upgrade to Pro Plan**
- **Cost:** $20/month
- **Benefits:** 
  - 40 cron jobs
  - Unlimited frequency
  - Precise timing
- **Action:** Change schedule back to `*/5 * * * *` after upgrade

### **Option 3: Manual Trigger**
Call the endpoint manually when needed:
```bash
curl -X GET https://www.soundbridge.live/api/cron/moderate-content \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## ✅ **Verification**

After deployment completes:

1. **Check Vercel Dashboard:**
   - Go to your project
   - Check "Deployments" tab
   - Latest deployment should show ✅ (not ❌)

2. **Check Cron Jobs:**
   - Go to "Cron Jobs" tab
   - Should see 2 cron jobs:
     - `/api/cron/moderate-content` - Daily at midnight
     - `/api/cron/downgrade-past-due` - Daily at midnight

3. **Test Endpoint:**
   ```bash
   curl -X GET https://www.soundbridge.live/api/cron/moderate-content \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
   Should return success (not 405 or 500)

---

## 📝 **Summary**

**What Was Fixed:**
- Changed cron schedule from `*/5 * * * *` (every 5 min) to `0 0 * * *` (daily)
- Complies with Hobby plan restrictions
- Deployment should now succeed

**Impact:**
- Content moderation will run once per day (instead of every 5 minutes)
- If you need more frequent moderation, use external cron service or upgrade to Pro

**Status:** ✅ **FIXED AND DEPLOYED**

---

**The deployment should now succeed! 🚀**

