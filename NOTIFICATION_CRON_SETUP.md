# Notification System Cron Jobs Setup

**Issue:** Vercel has strict cron job limits based on your plan  
**Solution:** Different configurations for Hobby vs Pro plans

---

## 🚨 The Problem

According to [Vercel's Cron Jobs documentation](https://vercel.com/docs/cron-jobs/usage-and-pricing):

| Plan | Cron Jobs Limit | Schedule Restrictions |
|------|----------------|----------------------|
| **Hobby** | 2 cron jobs | Once per day only |
| **Pro** | 40 cron jobs | Unlimited frequency |
| **Enterprise** | 100 cron jobs | Unlimited frequency |

**Hard limit:** 20 cron jobs per project (all plans)

---

## ✅ Solution: Remove Cron Jobs (Use Alternative)

Since the notification system requires frequent checks (every 15 minutes), and Hobby plan only allows daily crons, **we've removed cron jobs from `vercel.json`** for now.

### **Alternative Approaches:**

#### **Option 1: Manual Trigger (Recommended for Hobby)**
Call the notification API endpoint manually when needed:

```bash
# Trigger notification processing
curl https://soundbridge.vercel.app/api/cron/notifications?job=queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### **Option 2: External Cron Service (Free)**
Use a free external cron service to trigger your API:

**Services:**
- [cron-job.org](https://cron-job.org) - Free, reliable
- [EasyCron](https://www.easycron.com) - Free tier available
- [Cronitor](https://cronitor.io) - Free tier available

**Setup:**
1. Sign up for free account
2. Create cron job pointing to: `https://soundbridge.vercel.app/api/cron/notifications?job=queue`
3. Set schedule: Every 15 minutes
4. Add header: `Authorization: Bearer YOUR_CRON_SECRET`

#### **Option 3: Upgrade to Pro Plan**
If you need automated notifications:
- **Cost:** $20/month
- **Benefits:** 40 cron jobs, unlimited frequency
- **Setup:** Copy `vercel-crons-pro.json` contents into `vercel.json`

---

## 📋 Current Configuration

### **`vercel.json` (Current - No Crons)**

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers", 
          "value": "Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token"
        }
      ]
    }
  ]
}
```

### **`vercel-crons-pro.json` (For Pro Plan)**

If you upgrade to Pro, merge this into `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/notifications?job=morning",
      "schedule": "0 9 * * *",
      "description": "Morning notification batch (9 AM)"
    },
    {
      "path": "/api/cron/notifications?job=afternoon",
      "schedule": "0 14 * * *",
      "description": "Afternoon notification batch (2 PM)"
    },
    {
      "path": "/api/cron/notifications?job=evening",
      "schedule": "0 19 * * *",
      "description": "Evening notification batch (7 PM)"
    },
    {
      "path": "/api/cron/notifications?job=queue",
      "schedule": "*/15 * * * *",
      "description": "Process notification queue (every 15 min)"
    }
  ]
}
```

---

## 🔐 Security: Protect Cron Endpoints

Add authentication to your cron endpoints to prevent unauthorized access:

### **1. Set Environment Variable**

In Vercel Dashboard → Settings → Environment Variables:

```
CRON_SECRET=your_random_secret_here_generate_a_long_string
```

### **2. Update Cron API Route**

```typescript
// apps/web/app/api/cron/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // ... rest of your cron logic
}
```

### **3. Configure Vercel Cron (Pro Plan Only)**

Vercel automatically adds the `x-vercel-signature` header to cron requests. You can verify it:

```typescript
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Vercel crons include this header automatically
  const isVercelCron = request.headers.get('x-vercel-signature');
  
  if (!isVercelCron && process.env.NODE_ENV === 'production') {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // ... process notifications
}
```

---

## 🎯 Recommended Setup (By Plan)

### **Hobby Plan (Current)**

1. ✅ **No crons in `vercel.json`** (already done)
2. ✅ **Notification API endpoints work** (already deployed)
3. ⚠️ **Manual trigger or external cron service** (choose one)

**For testing:**
```bash
# Test the notification endpoint
curl https://soundbridge.vercel.app/api/cron/notifications?job=queue
```

### **Pro Plan ($20/month)**

1. Copy contents of `vercel-crons-pro.json` into `vercel.json`
2. Add `CRON_SECRET` environment variable
3. Deploy
4. Crons run automatically ✅

---

## 📊 Notification System Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ Deployed | All 5 tables created |
| API Endpoints | ✅ Deployed | 10 endpoints live |
| Expo Push Integration | ✅ Ready | Needs `EXPO_ACCESS_TOKEN` |
| Cron Jobs | ⚠️ Removed | Hobby plan limitation |
| Manual Trigger | ✅ Works | Can call API directly |

---

## 🔄 Using External Cron Service (Recommended)

### **Setup with cron-job.org (Free)**

1. **Sign up:** https://cron-job.org/en/signup/
2. **Create new cron job:**
   - **Title:** SoundBridge Notification Queue
   - **URL:** `https://soundbridge.vercel.app/api/cron/notifications?job=queue`
   - **Schedule:** Every 15 minutes
   - **Request method:** GET
   - **Headers:**
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```
3. **Save and enable**

### **Multiple Jobs Setup**

Create 4 separate cron jobs:

| Job | URL | Schedule |
|-----|-----|----------|
| Morning | `/api/cron/notifications?job=morning` | `0 9 * * *` (9 AM daily) |
| Afternoon | `/api/cron/notifications?job=afternoon` | `0 14 * * *` (2 PM daily) |
| Evening | `/api/cron/notifications?job=evening` | `0 19 * * *` (7 PM daily) |
| Queue | `/api/cron/notifications?job=queue` | `*/15 * * * *` (every 15 min) |

---

## 🚀 Next Steps

### **Immediate (Hobby Plan)**

1. ✅ Deploy current changes (no crons)
2. ⚠️ Set up external cron service (cron-job.org)
3. ✅ Add `EXPO_ACCESS_TOKEN` to Vercel
4. ✅ Add `CRON_SECRET` to Vercel
5. ✅ Test notification endpoint manually

### **Future (Pro Plan)**

1. Upgrade to Pro plan
2. Merge `vercel-crons-pro.json` into `vercel.json`
3. Deploy
4. Crons run automatically

---

## 📚 References

- [Vercel Cron Jobs Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [cron-job.org](https://cron-job.org) - Free external cron service

---

## ❓ FAQ

### **Q: Can I use notifications without cron jobs?**
**A:** Yes! The notification API endpoints work independently. You can:
- Call them manually via API
- Use an external cron service (free)
- Trigger them from your mobile app
- Upgrade to Pro for native Vercel crons

### **Q: Will notifications work on Hobby plan?**
**A:** Yes, but you need to trigger them manually or use an external cron service.

### **Q: How much does Pro plan cost?**
**A:** $20/month. Includes 40 cron jobs with unlimited frequency.

### **Q: Can I test notifications without crons?**
**A:** Yes! Just call the API endpoint:
```bash
curl https://soundbridge.vercel.app/api/cron/notifications?job=queue
```

---

**Status:** Cron jobs removed (Hobby plan compatible)  
**Recommendation:** Use external cron service (cron-job.org)  
**Alternative:** Upgrade to Pro plan for native crons  
**Last Updated:** November 18, 2025

