# Sentry Integration Guide

**Purpose:** Set up error monitoring to catch production issues before users report them.

**What Sentry Does:**
- Captures JavaScript errors in real-time
- Records user sessions leading to errors
- Tracks performance metrics
- Alerts team when errors occur
- Provides stack traces for debugging

---

## 🎯 Why We Need This

### **The Problem:**
Remember when the profile page broke and you had to report it manually? With Sentry, we would have been alerted immediately:

```
🚨 Alert: New Error in Production
Column "audio_tracks.artist" does not exist
Affected: 15 users in last 5 minutes
Page: /profile
```

### **What Sentry Catches:**
- Database column errors (like the ones we just fixed)
- API timeout errors
- JavaScript runtime errors
- Unhandled promise rejections
- Performance issues (slow pages)

---

## Step 1: Create Sentry Account

### **1.1 Sign Up**
1. Go to https://sentry.io/signup/
2. Choose "Create a new account"
3. Use your company email
4. Verify email address

### **1.2 Create New Project**
1. Click "Create Project"
2. Select "Next.js" as platform
3. Name it: `soundbridge-web`
4. Set alert frequency: "On every new issue"
5. Click "Create Project"

### **1.3 Get Your DSN**
After creating project, you'll see:
```
Sentry DSN: https://abc123@o123456.ingest.sentry.io/789012
```

**Copy this!** You'll need it in Step 2.

---

## Step 2: Install Sentry in Your Project

### **2.1 Install Sentry Packages**

Run this command from your project root:

```bash
cd apps/web
npm install --save @sentry/nextjs
```

### **2.2 Run Sentry Setup Wizard**

```bash
npx @sentry/wizard@latest -i nextjs
```

**The wizard will:**
1. Ask for your Sentry DSN (paste the one from Step 1.3)
2. Create `sentry.client.config.ts`
3. Create `sentry.server.config.ts`
4. Create `sentry.edge.config.ts`
5. Update `next.config.js`
6. Add `.sentryclirc` file

**When prompted:**
- "Do you want to create example page?" → **No**
- "Do you want to send source maps?" → **Yes** (for better error debugging)
- "Do you want to set up performance monitoring?" → **Yes**

---

## Step 3: Configure Sentry

### **3.1 Update Environment Variables**

Add to `apps/web/.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_DSN_HERE@o123456.ingest.sentry.io/789012
SENTRY_AUTH_TOKEN=your_auth_token_here

# Optional: Set environment
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

**How to get SENTRY_AUTH_TOKEN:**
1. Go to Sentry.io → Settings → Auth Tokens
2. Click "Create New Token"
3. Name: "SoundBridge Deploy"
4. Scopes: "project:releases" and "org:read"
5. Copy token to `.env.local`

### **3.2 Update `.env.example`**

Add these lines so other developers know what's needed:

```bash
# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
```

### **3.3 Add to `.gitignore`**

Ensure `.sentryclirc` is in `.gitignore`:

```bash
# Sentry
.sentryclirc
```

---

## Step 4: Configure Sentry Client

### **4.1 Edit `sentry.client.config.ts`**

The wizard created this file. Update it:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment (development, staging, production)
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',

  // Capture 100% of errors, but only 10% of transactions for performance
  tracesSampleRate: 0.1,

  // Capture replay sessions for debugging
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Don't send errors in development (optional)
  enabled: process.env.NODE_ENV === 'production',

  // Ignore common non-critical errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
  ],

  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive data from error reports
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }

    // Don't send errors from browser extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames) {
      const frames = event.exception.values[0].stacktrace.frames;
      if (frames.some(frame => frame.filename?.includes('extension://'))) {
        return null;
      }
    }

    return event;
  },
});
```

### **4.2 Edit `sentry.server.config.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',

  // Filter sensitive data on server-side too
  beforeSend(event) {
    // Remove environment variables from error reports
    delete event.contexts?.runtime?.env;
    return event;
  },
});
```

---

## Step 5: Add User Context to Errors

### **5.1 Update `_app.tsx`**

Add user context so you know which users experienced errors:

```typescript
// apps/web/app/_app.tsx or apps/web/pages/_app.tsx
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/src/lib/supabase/client';

function MyApp({ Component, pageProps }) {
  const supabase = createClient();

  useEffect(() => {
    // Get current user and set context for Sentry
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username,
        });
      } else {
        Sentry.setUser(null);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username,
        });
      } else {
        Sentry.setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
```

---

## Step 6: Add Custom Error Tracking

### **6.1 Track Database Errors**

Update `apps/web/src/lib/data-service.ts` to report errors:

```typescript
import * as Sentry from '@sentry/nextjs';

class DataService {
  async getFeedPosts(limit = 25) {
    try {
      const { data, error } = await this.supabase
        .from('posts')
        .select('*')
        .limit(limit);

      if (error) {
        // Report to Sentry with context
        Sentry.captureException(error, {
          tags: {
            method: 'getFeedPosts',
            table: 'posts',
          },
          extra: {
            limit,
            errorCode: error.code,
          },
        });

        console.error('❌ Error loading feed posts:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { method: 'getFeedPosts' },
      });
      return { data: null, error };
    }
  }
}
```

### **6.2 Track Performance Issues**

For slow operations, create custom transactions:

```typescript
import * as Sentry from '@sentry/nextjs';

async function loadProfileAndAnalytics() {
  // Create a transaction to track performance
  const transaction = Sentry.startTransaction({
    name: 'Load Profile and Analytics',
    op: 'profile.load',
  });

  try {
    const { data, error } = await dataService.getProfileWithStats(userId);

    transaction.setStatus('ok');
    return data;
  } catch (error) {
    transaction.setStatus('internal_error');
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish(); // Records how long this took
  }
}
```

### **6.3 Add Breadcrumbs for Context**

Help debugging by adding breadcrumbs:

```typescript
import * as Sentry from '@sentry/nextjs';

// When user performs an action
const handleLikePost = async (postId) => {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: `User liked post ${postId}`,
    level: 'info',
  });

  try {
    await likePost(postId);
  } catch (error) {
    // Error report will include breadcrumb showing user action
    Sentry.captureException(error);
  }
};
```

---

## Step 7: Test Sentry Integration

### **7.1 Create Test Error Page**

Create `apps/web/app/test-sentry/page.tsx`:

```typescript
'use client';

import * as Sentry from '@sentry/nextjs';

export default function TestSentry() {
  const triggerError = () => {
    throw new Error('This is a test error from SoundBridge!');
  };

  const triggerManualCapture = () => {
    Sentry.captureMessage('Test message from SoundBridge', 'info');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Sentry Test Page</h1>
      <button onClick={triggerError}>
        Trigger Error (will crash page)
      </button>
      <br />
      <br />
      <button onClick={triggerManualCapture}>
        Send Test Message
      </button>
    </div>
  );
}
```

### **7.2 Test in Development**

1. Temporarily enable Sentry in dev:
   ```typescript
   // sentry.client.config.ts
   enabled: true, // Change from: process.env.NODE_ENV === 'production'
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Visit http://localhost:3000/test-sentry

4. Click "Send Test Message" button

5. Go to Sentry.io → Issues
   - You should see "Test message from SoundBridge"

6. Click "Trigger Error" button
   - You should see the error appear in Sentry within seconds
   - Click on it to see full stack trace

7. **Remember to revert the enabled flag:**
   ```typescript
   enabled: process.env.NODE_ENV === 'production',
   ```

---

## Step 8: Configure Alerts

### **8.1 Set Up Slack Notifications (Optional)**

1. Go to Sentry.io → Settings → Integrations
2. Find "Slack" and click "Install"
3. Authorize Sentry to access your Slack workspace
4. Choose channel: #engineering or #alerts
5. Configure alert rules:
   - New issue: Send to Slack immediately
   - Issue frequency: Alert if > 10 users affected
   - Resolved issue: Send notification

### **8.2 Set Up Email Alerts**

1. Go to Sentry.io → Settings → Notifications
2. Email notifications:
   - [x] New issues
   - [x] Issue escalations
   - [x] Resolved issues
   - [ ] Workflow notifications (too noisy)

### **8.3 Create Custom Alert Rules**

1. Go to Sentry.io → Alerts → Create Alert
2. Create rule: "Database Column Error"
   - When: Error message contains "column"
   - And: Error message contains "does not exist"
   - Then: Send email to team@soundbridge.com
   - And: Send Slack message to #engineering

3. Create rule: "High Error Rate"
   - When: Error count > 50 in 5 minutes
   - Then: Send urgent Slack notification
   - And: Page on-call engineer

---

## Step 9: Set Up Source Maps

Source maps make error stack traces readable.

### **9.1 Configure Source Maps Upload**

This should be done by the wizard, but verify `next.config.js` has:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const moduleExports = {
  // Your existing Next.js config
};

const sentryWebpackPluginOptions = {
  // Upload source maps to Sentry
  silent: true,
  org: 'your-org-name',
  project: 'soundbridge-web',
};

module.exports = withSentryConfig(moduleExports, sentryWebpackPluginOptions);
```

### **9.2 Test Source Maps**

1. Build production bundle:
   ```bash
   npm run build
   ```

2. Check output for:
   ```
   ✓ Sentry source maps uploaded successfully
   ```

3. Start production server:
   ```bash
   npm start
   ```

4. Trigger test error
5. Check Sentry for readable stack trace (not minified)

---

## Step 10: Monitor in Production

### **10.1 Deploy to Production**

1. Push code to git
2. Deploy to production (Vercel, etc.)
3. Verify Sentry DSN environment variable is set

### **10.2 Verify It's Working**

1. Visit your production site
2. Go to Sentry.io → Issues
3. Filter by "Environment: production"
4. You should see session replays starting

### **10.3 Watch for Errors**

For the first few hours after deployment:

1. Keep Sentry dashboard open
2. Monitor for new issues
3. Check error frequency
4. Review affected users
5. Be ready to rollback if error rate spikes

---

## 📊 What to Monitor

### **Critical Errors (Fix Immediately):**
- Database column errors
- Authentication errors
- Payment processing errors
- Data loss errors

### **High Priority (Fix This Week):**
- Performance issues (pages > 5s)
- Frequent user-facing errors
- API timeout errors

### **Medium Priority (Fix This Month):**
- Rare edge case errors
- Browser compatibility issues
- Non-critical feature errors

### **Low Priority (Backlog):**
- Console warnings
- Third-party script errors
- Browser extension conflicts

---

## 🎓 Best Practices

### **1. Don't Ignore Errors**
Set aside 30 minutes daily to review Sentry issues.

### **2. Add Context**
Always include relevant data in error reports:
```typescript
Sentry.captureException(error, {
  tags: { page: 'profile', action: 'load-analytics' },
  extra: { userId, attemptCount: 3 },
});
```

### **3. Use Error Grouping**
Sentry groups similar errors. Review groups, not individual occurrences.

### **4. Set Up Performance Monitoring**
Track slow pages:
```typescript
Sentry.startTransaction({
  name: 'Page Load',
  op: 'pageload',
});
```

### **5. Respect User Privacy**
Filter sensitive data before sending to Sentry:
- Passwords
- API keys
- Personal information
- Payment details

---

## 🚨 Common Issues

### **"Sentry is not capturing errors"**
- Check `enabled` flag in config
- Verify DSN is correct
- Check browser console for Sentry init errors
- Ensure environment is "production" in production

### **"Source maps not working"**
- Verify `SENTRY_AUTH_TOKEN` is set
- Check build output for upload errors
- Run `npm run build` with verbose flag

### **"Too many errors from browser extensions"**
Add to `ignoreErrors`:
```typescript
ignoreErrors: [
  /chrome-extension/,
  /moz-extension/,
],
```

### **"Errors from localhost appearing"**
Filter by environment:
```typescript
beforeSend(event) {
  if (event.request?.url?.includes('localhost')) {
    return null;
  }
  return event;
}
```

---

## 📈 Success Metrics

After integrating Sentry, you should see:

1. **Error Discovery Time: < 5 minutes**
   - Before: Hours/days (when users report)
   - After: Real-time alerts

2. **Error Resolution Time: 50% faster**
   - Stack traces show exact line
   - User context helps reproduce
   - Session replays show user actions

3. **User Impact Visibility**
   - Know how many users affected
   - See which features are broken
   - Prioritize fixes by impact

4. **Performance Insights**
   - Identify slow pages
   - Track Core Web Vitals
   - Optimize based on data

---

## 🔗 Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Error Filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Sentry Performance Monitoring](https://docs.sentry.io/platforms/javascript/performance/)
- [Sentry Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)

---

## ✅ Checklist

After completing this guide, you should have:

- [ ] Sentry account created
- [ ] Project created: `soundbridge-web`
- [ ] Sentry packages installed
- [ ] Configuration files created
- [ ] Environment variables set
- [ ] User context tracking added
- [ ] Database errors reporting to Sentry
- [ ] Test error page created and tested
- [ ] Alerts configured (email/Slack)
- [ ] Source maps uploading
- [ ] Deployed to production
- [ ] Verified errors appear in dashboard

---

**Once Sentry is set up, you'll never miss a production error again!**

The column name errors that broke the web app would have been caught immediately, alerting you before users even noticed.

---

*Document created: December 16, 2025*
*Next: User registers Sentry account and provides DSN for integration*
