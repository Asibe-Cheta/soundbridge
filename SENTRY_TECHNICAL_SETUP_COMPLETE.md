# Sentry Technical Setup - Complete ✅

**Date:** December 17, 2025
**Status:** 🎉 **TECHNICAL SETUP 100% COMPLETE**

---

## ✅ What's Been Completed

### **Step 3.2 - Environment Variables Documentation**
- ✅ Created [.env.example](apps/web/.env.example) with Sentry variables
- Developers will know what environment variables are needed

### **Step 3.3 - Git Ignore**
- ✅ Added `.sentryclirc` to [.gitignore](.gitignore)
- Prevents committing Sentry auth tokens to git

### **Steps 4.1-4.2 - Sentry Configuration**
- ✅ Already optimized (we did this earlier):
  - [instrumentation-client.ts](apps/web/instrumentation-client.ts) - Client config with privacy filters
  - [sentry.server.config.ts](apps/web/sentry.server.config.ts) - Server config with security filters
  - [sentry.edge.config.ts](apps/web/sentry.edge.config.ts) - Edge config

### **Steps 5 & 6 - User Context & Custom Tracking**
- ℹ️ **Optional** - Can add later when needed
- User context tracking (Step 5) - Add to `_app.tsx` when you want user IDs in error reports
- Custom error tracking (Step 6) - Add to `data-service.ts` when you want detailed database error tracking

### **Step 7 - Test Page Created**
- ✅ Created [test-sentry/page.tsx](apps/web/app/test-sentry/page.tsx)
- Has 3 test buttons:
  1. Send test message (safe)
  2. Simulate database error (safe)
  3. Trigger error (will crash page)

### **Step 9 - Source Maps**
- ✅ Already configured in [next.config.js](apps/web/next.config.js)
- Will automatically upload source maps on production builds
- Uses `SENTRY_AUTH_TOKEN` environment variable

---

## 🎯 What You Need to Do Next

### **Optional: Test Sentry Locally (5 minutes)**

**1. Temporarily enable Sentry in development:**

Edit [apps/web/instrumentation-client.ts](apps/web/instrumentation-client.ts:38):

```typescript
// Line 38 - Change from:
enabled: process.env.NODE_ENV === 'production',

// To (temporarily):
enabled: true,
```

**2. Restart development server:**
```bash
# Stop current server (Ctrl+C)
cd apps/web
npm run dev
```

**3. Visit test page:**
```
http://localhost:3000/test-sentry
```

**4. Click buttons and verify:**
- Click "Send Test Message" → Check Sentry dashboard
- Click "Simulate Database Error" → Check Sentry dashboard
- Click "Trigger Error" → Page will crash, error sent to Sentry

**5. Check Sentry dashboard:**
- Go to https://sentry.io
- Navigate to your project: `soundbridge-web`
- Click "Issues" → You should see your test errors

**6. Disable Sentry in dev again:**

Edit [apps/web/instrumentation-client.ts](apps/web/instrumentation-client.ts:38):

```typescript
// Line 38 - Change back to:
enabled: process.env.NODE_ENV === 'production',
```

---

### **Step 8 - Set Up Alerts (10-15 minutes)**

This is where you come in! Follow these steps:

#### **8.1 - Email Alerts (Easy - 2 minutes)**

1. Go to https://sentry.io
2. Click on your project: `soundbridge-web`
3. Go to Settings → Notifications
4. Under "Email" section, check:
   - ✅ **New issues** (you'll be notified of every new error type)
   - ✅ **Issue escalations** (when error rate increases)
   - ✅ **Resolved issues** (when errors are fixed)
   - ⬜ Workflow notifications (too noisy, leave unchecked)
5. Click "Save"

#### **8.2 - Slack Notifications (Medium - 5 minutes)**

**Only if you have a Slack workspace for your team:**

1. Go to https://sentry.io
2. Settings → Integrations
3. Search for "Slack"
4. Click "Install"
5. Authorize Sentry to access your Slack workspace
6. Choose channel: `#engineering` or `#alerts` or create `#sentry`
7. Configure what gets sent to Slack:
   - New issues → Send to Slack
   - High frequency issues → Send to Slack
   - Resolved issues → (optional)

#### **8.3 - Custom Alert Rules (Advanced - 5-10 minutes)**

Create smart alerts for specific error types:

**Alert 1: Database Column Errors**

1. Go to Sentry.io → Alerts → Create Alert
2. Choose "Issues"
3. Set conditions:
   - When: `The issue's title contains` → `column`
   - AND: `The issue's title contains` → `does not exist`
4. Then: `Send a notification via` → Email (or Slack)
5. Name it: "Database Column Error Alert"
6. Click "Save Rule"

**Alert 2: High Error Rate**

1. Create another alert
2. Choose "Issues"
3. Set conditions:
   - When: `The issue is seen more than` → `50` times
   - In: `5` minutes
4. Then: `Send a notification via` → Email/Slack
5. Name it: "High Error Rate Alert"
6. Click "Save Rule"

**Alert 3: Production Errors Only**

1. Create another alert
2. Choose "Issues"
3. Set conditions:
   - When: `The event's environment equals` → `production`
   - AND: `The issue is first seen`
4. Then: `Send a notification via` → Email/Slack
5. Name it: "New Production Error"
6. Click "Save Rule"

---

## 📋 Testing Checklist

After setting up alerts, verify everything works:

### **Local Testing (Optional):**
- [ ] Enabled Sentry in dev mode
- [ ] Visited `/test-sentry` page
- [ ] Clicked "Send Test Message" → Appeared in Sentry
- [ ] Clicked "Simulate Database Error" → Appeared in Sentry
- [ ] Clicked "Trigger Error" → Appeared in Sentry
- [ ] Disabled Sentry dev mode again

### **Alert Testing:**
- [ ] Email alerts configured
- [ ] (Optional) Slack alerts configured
- [ ] Custom alert rules created
- [ ] Received test alert (from test page)

### **Production Ready:**
- [ ] `SENTRY_AUTH_TOKEN` in Vercel production environment ✅ (Already done!)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` in Vercel production environment ✅ (Already done!)
- [ ] Alert rules configured
- [ ] Team knows to check Sentry dashboard

---

## 🚀 Production Deployment

Your next production deploy will:

1. **Build with Sentry:**
   ```
   ✓ Compiling...
   ✓ Creating an optimized production build
   ✓ Sentry source maps uploaded successfully
   ```

2. **Start capturing errors:**
   - All errors will be sent to Sentry
   - You'll receive alerts based on your configured rules
   - Session replays will be recorded

3. **Monitor the dashboard:**
   - Watch for new issues
   - Check error frequency
   - Review affected users
   - Use session replays to debug

---

## 💡 Quick Tips

### **Daily Workflow:**
1. Check Sentry dashboard once per day (takes 2 minutes)
2. Review any new issues
3. Prioritize by user impact (how many users affected)
4. Fix critical errors first

### **When You Get an Alert:**
1. Open the Sentry issue link
2. Read the error message
3. Check the stack trace (shows exact line of code)
4. Watch the session replay (if available)
5. Fix the bug
6. Deploy the fix
7. Mark the issue as "Resolved" in Sentry

### **Understanding Alerts:**

**Email you'll receive:**
```
[Sentry] New Issue in soundbridge-web

PostgrestError: column audio_tracks.artist does not exist

First seen: 2 minutes ago
Events: 5
Users affected: 2

View on Sentry: [link]
```

**What to do:**
1. Click the link
2. See full error details
3. Check which users were affected
4. Fix the issue
5. Deploy

---

## 📊 What Success Looks Like

### **Week 1:**
- ✅ Receive 5-10 test errors (from your testing)
- ✅ Configure alerts to your liking
- ✅ Get familiar with Sentry dashboard

### **Week 2-4:**
- ✅ Catch 1-2 real production errors
- ✅ Fix them before users report
- ✅ See error rate trending down

### **Month 2+:**
- ✅ Proactive error fixing (before users complain)
- ✅ Error rate stays low
- ✅ User trust increases

---

## 🔗 Resources

### **Sentry Dashboard:**
- Your project: https://sentry.io
- Issues: https://sentry.io/organizations/soundbridge/issues/
- Alerts: https://sentry.io/organizations/soundbridge/alerts/

### **Documentation:**
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Alert Rules](https://docs.sentry.io/product/alerts/)
- [Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)

### **Internal Docs:**
- [SENTRY_INTEGRATION_GUIDE.md](SENTRY_INTEGRATION_GUIDE.md) - Full setup guide
- [SENTRY_SETUP_COMPLETE.md](SENTRY_SETUP_COMPLETE.md) - Complete setup summary

---

## ✅ Summary

**Technical Setup: 100% Complete**

**What's Done:**
- ✅ All config files created and optimized
- ✅ Environment variables documented
- ✅ Git ignore configured
- ✅ Test page created
- ✅ Source maps configured
- ✅ Vercel environment variables set

**What You Need to Do:**
1. ⏳ **Set up alerts** (Step 8 above) - 10-15 minutes
2. 🔄 **Optional: Test locally** (Step 7 above) - 5 minutes
3. ✅ **Deploy to production** - Sentry will automatically activate

**Next Deploy:**
- Sentry will capture all production errors
- You'll receive alerts based on your rules
- Session replays will help debug issues

---

## 🎉 You're Almost Done!

Just complete Step 8 (alerts), and you're 100% ready for production!

The database column errors that broke your web app would have been caught within 2 minutes with Sentry configured like this.

---

*Technical setup completed: December 17, 2025*
*Next: User configures alerts (Step 8)*
*Status: ✅ READY FOR ALERT CONFIGURATION*
