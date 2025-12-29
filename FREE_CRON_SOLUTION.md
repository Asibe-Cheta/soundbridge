# 🆓 Free Solution: External Cron Service for 5-Minute Processing

**Date:** December 23, 2024  
**Status:** ✅ **FREE ALTERNATIVE TO PRO PLAN**

---

## 🎯 **What is a Cron Job?**

A **cron job** is an automated task that runs on a schedule. Think of it like a timer that automatically triggers an action.

**Example:**
- "Every 5 minutes, check for new tracks and process them"
- "Every day at midnight, send a report"
- "Every hour, clean up old files"

In your case, the cron job automatically processes audio tracks for content moderation every 5 minutes.

---

## 🚨 **The Problem**

- **Vercel Hobby Plan:** Only allows cron jobs to run **once per day**
- **You need:** Cron job to run **every 5 minutes**
- **Cost:** Pro plan is $20/month (not affordable right now)

---

## ✅ **Free Solution: External Cron Service**

Use a **free external service** to call your API endpoint every 5 minutes. This bypasses Vercel's plan limitations.

---

## 🎯 **Recommended: cron-job.org** (Free)

### **Step 1: Create Account**
1. Go to https://cron-job.org
2. Sign up for free account
3. Verify email

### **Step 2: Create Cron Job**

1. Click **"Create cronjob"**
2. Fill in the form:

   **Title:** `Content Moderation - Every 5 Minutes`
   
   **Address (URL):**
   ```
   https://www.soundbridge.live/api/cron/moderate-content
   ```
   
   **Schedule:**
   - Select: **"Every X minutes"**
   - Enter: `5`
   
   **Request Method:** `GET`
   
   **Request Headers:**
   - Click **"Add Header"**
   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_CRON_SECRET`
     - (Get this from Vercel environment variables)
   
   **Notifications:** (Optional)
   - Enable email notifications if job fails
   
3. Click **"Create cronjob"**

### **Step 3: Test It**

1. Click **"Run now"** to test immediately
2. Check Vercel function logs to verify it ran
3. Check database - tracks should start processing

---

## 🔄 **Alternative: GitHub Actions** (Also Free)

If your repo is on GitHub, you can use GitHub Actions (free for public repos).

### **Step 1: Create Workflow File**

Create file: `.github/workflows/moderate-content.yml`

```yaml
name: Content Moderation Cron

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allows manual trigger

jobs:
  moderate:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Moderation
        run: |
          curl -X GET "https://www.soundbridge.live/api/cron/moderate-content" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### **Step 2: Add Secret**

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. **Name:** `CRON_SECRET`
4. **Value:** (Your CRON_SECRET from Vercel)
5. Click **"Add secret"**

### **Step 3: Commit and Push**

```bash
git add .github/workflows/moderate-content.yml
git commit -m "Add GitHub Actions cron for content moderation"
git push origin main
```

GitHub will automatically run this every 5 minutes.

---

## 📊 **Comparison**

| Solution | Cost | Frequency | Setup Time | Reliability |
|----------|------|-----------|------------|-------------|
| **Vercel Hobby** | Free | Once/day | ✅ Already done | ⭐⭐⭐⭐⭐ |
| **Vercel Pro** | $20/mo | Every 5 min | ✅ Already done | ⭐⭐⭐⭐⭐ |
| **cron-job.org** | Free | Every 5 min | 5 minutes | ⭐⭐⭐⭐ |
| **GitHub Actions** | Free | Every 5 min | 10 minutes | ⭐⭐⭐⭐⭐ |

---

## 🎯 **Recommended Setup**

**For now (free):**
1. ✅ Keep Vercel cron as daily backup
2. ✅ Set up cron-job.org for 5-minute processing
3. ✅ Both will run (redundancy is good!)

**Later (when you can afford):**
- Upgrade to Vercel Pro
- Remove external cron service
- Use only Vercel cron

---

## 🔧 **How to Get Your CRON_SECRET**

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `CRON_SECRET`
5. Copy the value
6. Use it in the external cron service

---

## ✅ **After Setup**

1. **Test immediately:**
   - Trigger the cron job manually
   - Check Vercel logs
   - Verify tracks are processing

2. **Monitor:**
   - Check cron-job.org dashboard for execution history
   - Check Vercel function logs
   - Verify tracks are being processed every 5 minutes

3. **Verify it's working:**
   ```sql
   -- Check if tracks are being processed
   SELECT 
     COUNT(*) as pending,
     MAX(created_at) as oldest_pending
   FROM audio_tracks
   WHERE moderation_status = 'pending_check'
   AND deleted_at IS NULL;
   ```
   
   If this count decreases over time, it's working! ✅

---

## 🚨 **Important Notes**

1. **Keep Vercel Cron:**
   - Don't remove the daily Vercel cron
   - It serves as a backup if external service fails

2. **Security:**
   - Never share your `CRON_SECRET` publicly
   - Only use it in secure external services
   - Rotate it if exposed

3. **Monitoring:**
   - Set up email notifications for failures
   - Check logs regularly
   - Monitor database for stuck tracks

---

## 📞 **Support**

If you need help setting up:
1. Check cron-job.org documentation
2. Check GitHub Actions documentation
3. Test with manual trigger first
4. Verify CRON_SECRET is correct

---

**Status:** ✅ Free solution available  
**Cost:** $0/month  
**Setup Time:** 5-10 minutes

