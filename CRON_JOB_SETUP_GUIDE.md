# ⏰ Cron Job Setup Guide - Grace Period Downgrades

**Date:** December 3, 2025  
**Purpose:** Set up daily cron job to automatically downgrade accounts after grace period expires  
**Endpoint:** `/api/cron/downgrade-past-due`

---

## 📋 **Prerequisites**

Before setting up the cron job, you need:

1. ✅ **CRON_SECRET generated** (see `CRON_SECRET_SETUP_GUIDE.md`)
2. ✅ **CRON_SECRET added to environment variables**
3. ✅ **Endpoint deployed** (should be automatic with your deployment)

---

## 🔧 **Option 1: Vercel Cron Jobs (Recommended)**

Vercel has built-in cron job support. This is the easiest option if you're using Vercel.

### **Step 1: Create `vercel.json` File**

Create or update `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/downgrade-past-due",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Schedule Explanation:**
- `0 0 * * *` = Daily at midnight UTC (00:00 UTC)
- Format: `minute hour day month weekday`
- Other options:
  - `0 */6 * * *` = Every 6 hours
  - `0 0 * * 0` = Weekly on Sunday at midnight
  - `0 12 * * *` = Daily at noon UTC

### **Step 2: Update Cron Endpoint to Use Header Authentication**

Vercel Cron jobs send the secret via a header, not a query parameter. Update your cron endpoint:

**File:** `apps/web/app/api/cron/downgrade-past-due/route.ts`

Replace the GET method with this version that supports both query param and header:

```typescript
export async function GET(request: NextRequest) {
  try {
    // Check for secret in query param (for manual/external cron) or header (for Vercel Cron)
    const secret = request.nextUrl.searchParams.get('secret') || 
                   request.headers.get('x-vercel-cron-secret') ||
                   request.headers.get('authorization')?.replace('Bearer ', '');

    if (!secret || secret !== process.env.CRON_SECRET) {
      console.error('[cron] Unauthorized access attempt - invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ... rest of existing code ...
  }
}
```

**OR** Use Vercel's built-in cron header (simpler):

```typescript
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron sends a special header - check it first
    const cronHeader = request.headers.get('authorization');
    const isVercelCron = cronHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    // Also allow query parameter for external cron services
    const querySecret = request.nextUrl.searchParams.get('secret');
    
    const secretValid = isVercelCron || querySecret === process.env.CRON_SECRET;
    
    if (!secretValid) {
      console.error('[cron] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ... rest of existing code ...
  }
}
```

### **Step 3: Configure Vercel Cron**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Cron Jobs**
3. Vercel should automatically detect `vercel.json` cron configuration
4. You'll see the cron job listed with its schedule

**Alternative:** Add via Vercel Dashboard:
1. Go to **Settings** → **Cron Jobs**
2. Click **Create Cron Job**
3. Set:
   - **Name:** "Downgrade Past Due Subscriptions"
   - **Path:** `/api/cron/downgrade-past-due`
   - **Schedule:** `0 0 * * *` (daily at midnight UTC)
   - **Secret:** Leave empty (uses CRON_SECRET from env vars)

### **Step 4: Set CRON_SECRET in Vercel**

Make sure `CRON_SECRET` is set in Vercel environment variables:
- Go to **Settings** → **Environment Variables**
- Ensure `CRON_SECRET` is set for all environments

---

## 🔧 **Option 2: External Cron Service**

If you're not using Vercel or want more control, use an external cron service.

### **Services to Use:**
- **EasyCron** (https://www.easycron.com/) - Free tier available
- **cron-job.org** (https://cron-job.org/) - Free
- **UptimeRobot** (https://uptimerobot.com/) - Free tier available
- **AWS EventBridge** - If using AWS
- **Google Cloud Scheduler** - If using GCP

### **Setup Steps (Example: EasyCron)**

1. **Sign up** for EasyCron (or similar service)

2. **Create a new cron job:**
   - **URL:** `https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET`
   - **Schedule:** Daily at midnight UTC (`0 0 * * *`)
   - **Method:** GET
   - **Timeout:** 300 seconds (5 minutes)

3. **Test the cron job:**
   - Use "Test Now" or "Run Now" button
   - Check your server logs for execution

4. **Monitor:**
   - Set up email alerts for failures
   - Check execution logs regularly

### **Important Security Note:**

When using external cron services, the secret is in the URL. This is acceptable because:
- The secret is only used for authentication (not authorization)
- The endpoint only performs safe operations (downgrades expired subscriptions)
- You can rotate the secret if needed

**Best Practice:** Use a different secret for external cron services if possible.

---

## 🔧 **Option 3: Serverless Function (AWS Lambda, etc.)**

If you're using AWS or another cloud provider, create a scheduled Lambda function.

### **AWS Lambda + EventBridge Example:**

1. **Create Lambda Function:**
   ```javascript
   exports.handler = async (event) => {
     const secret = process.env.CRON_SECRET;
     const url = `https://soundbridge.live/api/cron/downgrade-past-due?secret=${secret}`;
     
     const response = await fetch(url);
     const result = await response.json();
     
     return {
       statusCode: 200,
       body: JSON.stringify(result)
     };
   };
   ```

2. **Create EventBridge Rule:**
   - Schedule: `cron(0 0 * * ? *)` (daily at midnight UTC)
   - Target: Your Lambda function

3. **Set Environment Variable:**
   - Add `CRON_SECRET` to Lambda environment variables

---

## ✅ **Testing Your Cron Job**

### **1. Manual Test (Before Scheduling)**

Test the endpoint manually with the secret:

```bash
# Using curl
curl "https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_SECRET"

# Expected response:
# {
#   "success": true,
#   "message": "Processed X subscriptions",
#   "downgraded": X
# }
```

### **2. Check Server Logs**

After cron job runs, check your server logs for:
- ✅ `[cron] Checking for past_due subscriptions to downgrade...`
- ✅ `[cron] Found X subscriptions to downgrade`
- ✅ `[cron] ✅ Downgraded user XXX to free tier`

### **3. Verify Email Sending**

Check that downgrade emails are sent:
- Check SendGrid activity dashboard
- Verify users receive downgrade notifications

---

## 📊 **Monitoring & Maintenance**

### **What to Monitor:**

1. **Cron Job Execution:**
   - Is it running daily?
   - Any errors in logs?
   - How many subscriptions processed?

2. **Email Delivery:**
   - Are downgrade emails being sent?
   - Any delivery failures?

3. **Downgrade Accuracy:**
   - Are subscriptions being downgraded correctly?
   - Is the 7-day grace period respected?

### **Logging:**

The cron endpoint logs:
- Number of subscriptions found
- Number successfully downgraded
- Any errors encountered
- User IDs processed

Check logs regularly to ensure it's working correctly.

---

## 🔄 **Schedule Recommendations**

**Recommended Schedule:** Daily at midnight UTC (`0 0 * * *`)

**Why Daily:**
- Grace period is 7 days
- Daily check ensures downgrades happen promptly
- Not too frequent (no performance impact)
- Not too infrequent (no delayed downgrades)

**Alternative Schedules:**
- `0 */6 * * *` - Every 6 hours (more frequent, ensures faster downgrades)
- `0 0 * * 0` - Weekly on Sunday (less frequent, may delay downgrades)

**Recommendation:** Stick with daily (`0 0 * * *`).

---

## ❓ **FAQ**

**Q: Do I need to set up the cron job immediately?**  
A: No, but without it, accounts won't be automatically downgraded after the grace period. You can manually trigger the endpoint for now.

**Q: Can I run it more than once per day?**  
A: Yes, it's safe to run multiple times. The endpoint only processes subscriptions that are actually past due for more than 7 days.

**Q: What happens if the cron job fails?**  
A: The endpoint will return an error. Set up monitoring/alerts to notify you if it fails.

**Q: Can I test the cron job manually?**  
A: Yes! Just call the endpoint URL with your secret. See "Testing Your Cron Job" section above.

**Q: What if I forget to set up the cron job?**  
A: Accounts will remain in `past_due` status until you manually downgrade them or set up the cron job. Set it up as soon as possible.

---

## 🎯 **Quick Setup Checklist**

- [ ] Generate `CRON_SECRET` (see `CRON_SECRET_SETUP_GUIDE.md`)
- [ ] Add `CRON_SECRET` to environment variables (local and production)
- [ ] Choose cron service (Vercel Cron, external service, or serverless)
- [ ] Configure cron job to run daily at midnight UTC
- [ ] Test endpoint manually with secret
- [ ] Verify cron job runs successfully
- [ ] Set up monitoring/alerts
- [ ] Check logs after first run

---

## 📝 **Recommended: Vercel Cron Setup**

**If using Vercel, this is the simplest setup:**

1. ✅ Generate `CRON_SECRET`
2. ✅ Add to Vercel environment variables
3. ✅ Create/update `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/cron/downgrade-past-due",
       "schedule": "0 0 * * *"
     }]
   }
   ```
4. ✅ Update cron endpoint to check Vercel cron header (optional, but recommended)
5. ✅ Deploy - Vercel will automatically set up the cron job

**That's it!** Vercel handles the rest.

---

**Last Updated:** December 3, 2025  
**Status:** Ready for Setup
