# ⚠️ Vercel Cron Job Plan Limitation

**Date:** December 23, 2024  
**Status:** 🔴 **REQUIRES PLAN UPGRADE OR ALTERNATIVE SOLUTION**

---

## 🚨 **Problem Identified**

The cron job schedule `*/5 * * * *` (every 5 minutes) is **NOT supported on Vercel's Hobby plan**.

According to [Vercel's Cron Jobs documentation](https://vercel.com/docs/cron-jobs/usage-and-pricing):

| Plan | Cron Jobs Limit | Schedule Restrictions |
|------|----------------|----------------------|
| **Hobby** | 2 cron jobs | **Once per day only** |
| **Pro** | 40 cron jobs | **Unlimited frequency** |
| **Enterprise** | 100 cron jobs | **Unlimited frequency** |

**Hard limit:** 20 cron jobs per project (all plans)

---

## ✅ **Temporary Fix Applied**

Changed the schedule to `0 0 * * *` (daily at midnight UTC) to make it Hobby-compliant.

**File:** `apps/web/vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/moderate-content",
      "schedule": "0 0 * * *"  // Daily at midnight (Hobby-compliant)
    }
  ]
}
```

---

## ⚠️ **Impact**

### **Current Behavior (Daily Schedule):**
- ✅ Cron job will run once per day at midnight UTC
- ❌ Tracks will only be processed once per day (not every 5 minutes)
- ❌ New uploads will wait up to 24 hours for moderation

### **Required Behavior (Every 5 Minutes):**
- ✅ Tracks processed within 5 minutes of upload
- ✅ Real-time content moderation
- ✅ Better user experience

---

## 🎯 **Solutions**

### **Option 1: Upgrade to Pro Plan** ⭐ **RECOMMENDED**

**Cost:** $20/month per user  
**Benefits:**
- ✅ Unlimited cron job invocations
- ✅ Can run every 5 minutes (`*/5 * * * *`)
- ✅ 40 cron jobs per account
- ✅ Better timing accuracy
- ✅ Additional features (analytics, team collaboration, etc.)

**Upgrade:** https://vercel.com/pricing

---

### **Option 2: External Cron Service** (Free Alternative)

Use an external service to trigger the endpoint every 5 minutes:

**Services:**
1. **cron-job.org** (Free)
   - Schedule: Every 5 minutes
   - HTTP request to: `https://www.soundbridge.live/api/cron/moderate-content`
   - Header: `Authorization: Bearer ${CRON_SECRET}`

2. **EasyCron** (Free tier available)
   - Similar functionality

3. **GitHub Actions** (Free for public repos)
   - Create `.github/workflows/moderate-content.yml`
   - Runs every 5 minutes
   - Calls your API endpoint

**Example GitHub Actions Workflow:**
```yaml
name: Content Moderation Cron

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  moderate:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Moderation
        run: |
          curl -X GET "https://www.soundbridge.live/api/cron/moderate-content" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

### **Option 3: Webhook-Based Trigger** (Advanced)

Instead of cron, trigger moderation immediately when a track is uploaded:

1. **On Track Upload:**
   - Immediately call moderation API
   - Process in background
   - Update status when complete

2. **Queue System:**
   - Use a queue service (Redis, BullMQ, etc.)
   - Process items as they're added
   - No cron needed

---

## 📊 **Current Configuration**

### **Cron Jobs in Project:**

1. **Content Moderation** (`apps/web/vercel.json`)
   - Path: `/api/cron/moderate-content`
   - Schedule: `0 0 * * *` (Daily at midnight)
   - Status: ✅ Hobby-compliant

2. **Subscription Downgrade** (`vercel.json` root)
   - Path: `/api/cron/downgrade-past-due`
   - Schedule: `0 0 * * *` (Daily at midnight)
   - Status: ✅ Hobby-compliant

**Total:** 2 cron jobs (within Hobby limit of 2)

---

## 🚀 **Immediate Action Required**

### **For Production Use (Every 5 Minutes):**

**Choose one:**

1. **Upgrade to Pro Plan** ($20/month)
   - Change schedule back to `*/5 * * * *`
   - Deploy
   - Done ✅

2. **Use External Cron Service** (Free)
   - Set up cron-job.org or GitHub Actions
   - Keep Vercel schedule as daily (backup)
   - External service triggers every 5 minutes

3. **Accept Daily Processing** (Current)
   - Tracks processed once per day
   - Not ideal for real-time moderation
   - May impact user experience

---

## 📝 **Next Steps**

1. **Decide on solution:**
   - [ ] Upgrade to Pro Plan
   - [ ] Set up external cron service
   - [ ] Accept daily processing

2. **If upgrading to Pro:**
   - Change schedule back to `*/5 * * * *`
   - Commit and push
   - Verify in Vercel dashboard

3. **If using external service:**
   - Set up service account
   - Configure to call endpoint every 5 minutes
   - Test with manual trigger

---

## 🔗 **References**

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Pricing](https://vercel.com/pricing)
- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

---

**Status:** ⚠️ Requires decision on upgrade or alternative solution  
**Priority:** 🔴 HIGH - Blocks real-time content moderation

