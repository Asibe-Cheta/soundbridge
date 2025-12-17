# Sentry Alerts Setup - Updated for Current UI

**Date:** December 17, 2025
**Status:** Updated for latest Sentry interface

---

## 🎯 Quick Setup (5 Minutes)

### **Step 1: Personal Email Notifications**

1. **Go to your account settings:**
   - Visit: https://sentry.io/settings/account/notifications/
   - Or click your profile icon (top right) → Account Settings → Notifications

2. **Enable email notifications:**
   - Scroll down to find notification preferences
   - Enable these:
     - ✅ **Issue Alerts** - Get notified when alert rules trigger
     - ✅ **Workflow** (optional) - Issue assignments and comments
     - ✅ **Weekly Reports** (optional) - Summary of your projects

3. **Save changes**

---

### **Step 2: Create Your First Alert (Simple)**

**Option A: Quick Setup - Default Alerts**

The easiest way is to let Sentry use default alert rules:

1. Go to your project: https://sentry.io/organizations/soundbridge/projects/soundbridge-web/
2. Click **"Alerts"** in the top navigation
3. If you see "Create Alert Rule" button, click it
4. Choose **"Issues"** as alert type
5. Select the template: **"Send a notification for new issues"**
6. Click **"Set Conditions"**
7. Keep defaults (or customize)
8. Click **"Next"**
9. Choose action: **"Send email"**
10. Click **"Save Rule"**

**Option B: Manual URL (if UI is confusing)**

Just go directly to:
```
https://sentry.io/organizations/soundbridge/alerts/soundbridge-web/new/
```

This takes you straight to the alert creation page.

---

### **Step 3: Recommended Alert Rules**

Create these 3 simple rules:

#### **Rule 1: New Production Errors**

**Purpose:** Get notified immediately when a new type of error occurs

- **When:** A new issue is created
- **And:** Environment equals "production"
- **Then:** Send notification to you via email
- **Name:** "New Production Errors"

#### **Rule 2: High Error Rate**

**Purpose:** Know when errors spike

- **When:** Number of events is greater than 10
- **In:** 1 hour
- **Then:** Send notification to you via email
- **Name:** "High Error Rate Alert"

#### **Rule 3: Critical Errors**

**Purpose:** Catch database and authentication errors

- **When:** Issue level equals "error"
- **And:** (Optional filter by title containing "column" or "auth")
- **Then:** Send notification to you via email
- **Name:** "Critical Errors"

---

## 🔔 What You'll Receive

### **Email Format:**

When an error occurs, you'll get an email like this:

```
From: Sentry <alerts@sentry.io>
Subject: [Sentry] New Issue in soundbridge-web

[soundbridge-web] PostgrestError: column audio_tracks.artist does not exist

First seen: 2 minutes ago
Events: 3
Users affected: 1

[View on Sentry]
```

**Click "View on Sentry"** to see:
- Full error details
- Stack trace (exact line of code)
- Which users were affected
- Session replay (if error occurred during recorded session)

---

## 🎛️ Alert Settings You Can Customize

### **Frequency:**
- **Every time** - Get email for every occurrence (noisy!)
- **Once per issue** - Only first time error appears (recommended)
- **Daily digest** - Summary once per day

### **Filters:**
- **Environment** - Only production, not development
- **Error level** - Only critical errors
- **Browser** - Specific browsers
- **Custom tags** - Filter by anything you tag

### **Actions:**
- **Email** - Send to your email
- **Slack** - Send to Slack channel (requires workspace)
- **Webhook** - Send to custom endpoint
- **Create Jira ticket** - Automatically file bugs

---

## 📊 Alert Dashboard

**View all your alerts:**
https://sentry.io/organizations/soundbridge/alerts/rules/

From here you can:
- See which alerts are active
- Edit alert conditions
- Disable/enable alerts
- See alert history

---

## ⚠️ About Slack

**You asked about Slack workspace:**

Slack integration requires that you have a **Slack workspace** (like `yourteam.slack.com`).

### **If you DON'T have a Slack workspace:**
- **Skip Slack integration** - Email is perfectly fine!
- You can create a free Slack workspace at https://slack.com/create if you want one later
- Most solo developers just use email

### **If you DO have a Slack workspace:**
1. Make sure you're signed into your Slack workspace first
2. Go back to Sentry → Settings → Integrations → Slack
3. Click "Add to Slack" (not "Install")
4. Authorize Sentry
5. Choose channel to send alerts to

**My recommendation: Skip Slack for now.** You can always add it later when you have a team.

---

## 🧪 Testing Your Alerts

### **Option 1: Wait for Real Errors**
- Deploy to production
- Wait for first error
- You'll receive email

### **Option 2: Trigger Test Error (Optional)**

Only if you want to test immediately:

1. **Temporarily enable Sentry in dev:**
   ```typescript
   // apps/web/instrumentation-client.ts line 38
   enabled: true, // Changed from: process.env.NODE_ENV === 'production'
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Visit test page:**
   ```
   http://localhost:3000/test-sentry
   ```

4. **Click "Send Test Message"**

5. **Check your email** (should arrive in 1-2 minutes)

6. **Disable Sentry in dev again:**
   ```typescript
   // apps/web/instrumentation-client.ts line 38
   enabled: process.env.NODE_ENV === 'production',
   ```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Personal notifications enabled at https://sentry.io/settings/account/notifications/
- [ ] At least 1 alert rule created
- [ ] Test alert received (optional)
- [ ] Know where to view alerts: https://sentry.io/organizations/soundbridge/issues/

---

## 📱 Mobile App (Optional)

**Download Sentry mobile app** to get push notifications:

- **iOS:** https://apps.apple.com/app/sentry/id1475195146
- **Android:** https://play.google.com/store/apps/details?id=io.sentry.mobile

Sign in with your Sentry account to get:
- Push notifications for new errors
- View errors on mobile
- Quick access to dashboard

---

## 🎯 What Success Looks Like

### **First Week:**
- ✅ Receive 0-5 email alerts
- ✅ Get familiar with alert emails
- ✅ Know how to click through to Sentry dashboard

### **First Month:**
- ✅ Catch 1-2 real production errors
- ✅ Fix them based on Sentry alerts
- ✅ See error rate trending down

### **Long Term:**
- ✅ Find out about errors before users report them
- ✅ Fix bugs faster with stack traces
- ✅ Use session replays to understand user issues

---

## 🔗 Quick Links

**Your Sentry Dashboard:**
- Main dashboard: https://sentry.io/organizations/soundbridge/projects/soundbridge-web/
- Issues: https://sentry.io/organizations/soundbridge/issues/
- Alerts: https://sentry.io/organizations/soundbridge/alerts/rules/
- Settings: https://sentry.io/settings/account/notifications/

**Create Alert Rule Directly:**
```
https://sentry.io/organizations/soundbridge/alerts/soundbridge-web/new/
```

---

## 💡 Pro Tips

### **Daily Workflow:**
1. Check Sentry once per day (2 minutes)
2. Review any new issues
3. Fix critical errors first
4. Mark as resolved after deploying fix

### **When You Get an Alert:**
1. Click the link in email
2. Read error message
3. Check stack trace for exact line
4. Watch session replay (if available)
5. Fix the bug
6. Deploy
7. Mark issue as "Resolved"

### **Ignore Non-Critical Errors:**
- Browser extension errors (already filtered)
- One-off network errors
- Third-party script errors

Focus on:
- Database errors
- Authentication errors
- Errors affecting multiple users

---

## 🎉 You're Done!

Your Sentry is now set up to:
- ✅ Capture all production errors
- ✅ Send you email alerts
- ✅ Provide stack traces for debugging
- ✅ Record session replays

The database column errors that broke your web app would now be caught within 2 minutes! 🚀

---

## ❓ Need Help?

**Can't find something in Sentry UI?**
- Try the search bar (top right)
- Or go directly to URLs provided above
- Or contact Sentry support: https://sentry.io/support/

**Questions about alerts?**
- Check Sentry docs: https://docs.sentry.io/product/alerts/
- Or ask me!

---

*Guide updated: December 17, 2025*
*Based on latest Sentry UI (December 2025)*
*Next: Deploy to production and wait for first alert!*
