# ⚡ Cron Job Setup - Quick Start Guide

**Date:** December 3, 2025  
**Purpose:** Quick guide to get the cron job running ASAP

---

## ✅ **What's Already Done**

- ✅ Cron endpoint created: `/api/cron/downgrade-past-due`
- ✅ Cron endpoint supports both Vercel Cron and external cron services
- ✅ `vercel.json` updated with cron job configuration (if using Vercel)

---

## 🚀 **Quick Setup (3 Steps)**

### **Step 1: Generate CRON_SECRET**

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - this is your `CRON_SECRET`.

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

### **Step 2: Add CRON_SECRET to Environment Variables**

**Local Development (`apps/web/.env.local`):**
```env
CRON_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Vercel Production:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click "Add New"
3. Name: `CRON_SECRET`
4. Value: Paste your generated secret
5. Select all environments (Production, Preview, Development)
6. Click "Save"

---

### **Step 3: Deploy**

**If using Vercel:**
- The cron job is already configured in `vercel.json`
- Just push to main branch and Vercel will automatically set it up
- Verify in Vercel Dashboard → Settings → Cron Jobs

**If using external cron service:**
- See `CRON_JOB_SETUP_GUIDE.md` for setup instructions
- Use URL: `https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_SECRET`

---

## ✅ **That's It!**

Once you:
1. Generate the secret
2. Add it to environment variables
3. Deploy

The cron job will automatically run daily at midnight UTC and downgrade accounts that have been `past_due` for more than 7 days.

---

## 🧪 **Test It**

After deploying, test the endpoint:

```bash
curl "https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_SECRET"
```

Should return:
```json
{
  "success": true,
  "message": "No subscriptions to downgrade",
  "downgraded": 0
}
```

---

## 📚 **Need More Details?**

- **Full cron secret guide:** See `CRON_SECRET_SETUP_GUIDE.md`
- **Cron job setup options:** See `CRON_JOB_SETUP_GUIDE.md`
- **Email templates:** See `SENDGRID_SUBSCRIPTION_EMAIL_TEMPLATES.md`

---

## ❓ **FAQ**

**Q: Do I need to set up the cron job manually?**  
A: **If using Vercel:** No! It's already configured in `vercel.json`. Just add the secret and deploy.  
A: **If using external service:** Yes, see `CRON_JOB_SETUP_GUIDE.md`.

**Q: Can I test it before adding the secret?**  
A: Yes, but it will return 401 Unauthorized. Generate and add the secret first, then test.

**Q: When does the cron job run?**  
A: Daily at midnight UTC (`0 0 * * *`). You can change this in `vercel.json` if needed.

---

**Last Updated:** December 3, 2025  
**Status:** Ready for Setup
