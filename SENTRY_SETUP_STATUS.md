# Sentry Setup Status

**Date:** December 16, 2025
**Status:** ✅ **95% COMPLETE - Just need to add environment variables**

---

## ✅ What's Already Done

### **1. Sentry Package Installed**
- `@sentry/nextjs` version 10.31.0 is installed in [apps/web/package.json](apps/web/package.json)

### **2. Configuration Files Created**
All required Sentry config files are in place:

- ✅ [apps/web/instrumentation.ts](apps/web/instrumentation.ts) - Entry point for Sentry
- ✅ [apps/web/sentry.client.config.ts](apps/web/sentry.client.config.ts) - Client-side config (just created!)
- ✅ [apps/web/sentry.server.config.ts](apps/web/sentry.server.config.ts) - Server-side config (optimized)
- ✅ [apps/web/sentry.edge.config.ts](apps/web/sentry.edge.config.ts) - Edge runtime config (optimized)

### **3. Sentry DSN Configured**
Your Sentry DSN is already set in all config files:
```
https://45312e8dcb67ebbdf015e23aa522953f@o4510547306283008.ingest.de.sentry.io/4510547389186128
```

### **4. Security Features Enabled**
All configs include:
- ✅ Sensitive data filtering (cookies, auth headers removed)
- ✅ Browser extension error filtering
- ✅ Environment variable filtering on server
- ✅ Only enabled in production (saves development noise)
- ✅ Reduced trace sampling in production (10% instead of 100% to save costs)

### **5. Session Replay Configured**
Client config includes session replay:
- 10% of normal sessions recorded
- 100% of sessions with errors recorded
- Text and media masked for privacy

---

## ⚠️ What You Need to Do

### **Step 1: Add Environment Variables**

Add these to your `apps/web/.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://45312e8dcb67ebbdf015e23aa522953f@o4510547306283008.ingest.de.sentry.io/4510547389186128
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development

# Optional: Auth token for uploading source maps (get from Sentry dashboard)
# SENTRY_AUTH_TOKEN=your_auth_token_here
```

**To get your SENTRY_AUTH_TOKEN:**
1. Go to https://sentry.io
2. Settings → Auth Tokens
3. Create New Token
4. Name: "SoundBridge Deploy"
5. Scopes: Select "project:releases" and "org:read"
6. Copy token and add to `.env.local`

### **Step 2: Update `.env.example`**

Add to `apps/web/.env.example` so other developers know what's needed:

```bash
# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_AUTH_TOKEN=
```

### **Step 3: Test Sentry (Optional - for development testing)**

To test in development, temporarily change in [sentry.client.config.ts](apps/web/sentry.client.config.ts:23):

```typescript
// Change this line:
enabled: process.env.NODE_ENV === 'production',

// To this temporarily:
enabled: true,
```

Then:
1. Run `npm run dev`
2. Open browser console
3. Paste this to trigger test error:
   ```javascript
   throw new Error('Test error from SoundBridge!')
   ```
4. Check https://sentry.io/issues/ to see if error appears

**Remember to change it back to `enabled: process.env.NODE_ENV === 'production'` after testing!**

---

## 🎯 How Sentry Will Help You

### **Real Example:**

Remember when the profile page broke with the `artist` column error? Here's what Sentry would have shown you:

```
🚨 New Issue: PostgrestError
column audio_tracks.artist does not exist

First seen: 2 minutes ago
Events: 15
Users affected: 3 users

Stack trace:
  at getProfileWithStats (data-service.ts:614)
  at loadProfileAndAnalytics (page.tsx:320)
  at useEffect (page.tsx:290)

User: user_abc123 (user@example.com)
Page: /profile
Browser: Chrome 120
Device: Desktop

Breadcrumbs:
  [User] Navigated to /profile
  [Database] Querying audio_tracks table
  [Error] PostgrestError: column does not exist

Session Replay: [Watch 30-second video of what user did]
```

**You would have:**
- ✅ Known about the error within 2 minutes
- ✅ Seen exactly which line caused it (line 614)
- ✅ Known how many users were affected (3)
- ✅ Watched a replay of what the user did before the error

Instead of waiting for user reports!

---

## 📊 What Sentry Will Track

### **Errors Caught:**
- Database column errors (the ones we just fixed!)
- API timeout errors
- JavaScript runtime errors
- Unhandled promise rejections
- Network request failures

### **Performance Monitoring:**
- Page load times
- API response times
- Database query performance
- Core Web Vitals (LCP, FID, CLS)

### **User Context:**
- Which users experienced errors
- What page they were on
- What browser/device they used
- What actions led to the error

---

## 🚀 Production Deployment

When you deploy to production:

1. **Set environment variables in your hosting platform:**
   - Vercel: Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_SENTRY_DSN`
   - Add `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production`
   - Add `SENTRY_AUTH_TOKEN` (for source maps)

2. **Build and deploy:**
   ```bash
   npm run build
   ```
   You should see in the output:
   ```
   ✓ Sentry source maps uploaded successfully
   ```

3. **Monitor the dashboard:**
   - Go to https://sentry.io
   - Select your project: `soundbridge-web`
   - Watch for new issues

4. **Set up alerts:**
   - Settings → Alerts → Create Alert
   - Example: "Email me when error rate > 10/min"
   - Example: "Send to Slack when new database error"

---

## 📝 Configuration Details

### **Client Config** ([sentry.client.config.ts](apps/web/sentry.client.config.ts))

```typescript
- Environment detection (dev/staging/production)
- 10% trace sampling in production (reduces costs)
- Session replay (10% normal, 100% on error)
- Filters browser extension errors
- Filters localhost errors
- Masks sensitive data (cookies, auth headers)
- Privacy: Masks all text and media in replays
```

### **Server Config** ([sentry.server.config.ts](apps/web/sentry.server.config.ts))

```typescript
- Environment detection
- 10% trace sampling in production
- Filters environment variables (contain secrets)
- Filters auth headers
- Only enabled in production
```

### **Edge Config** ([sentry.edge.config.ts](apps/web/sentry.edge.config.ts))

```typescript
- Same as server config
- Runs on edge runtime (middleware, edge routes)
```

---

## 🔒 Privacy & Security

### **Data Filtered Out:**
- ✅ Cookies (may contain auth tokens)
- ✅ Authorization headers
- ✅ Environment variables (may contain secrets)
- ✅ API keys
- ✅ User input (masked in session replays)

### **Data Sent to Sentry:**
- Error messages
- Stack traces
- User ID (not email by default)
- Page URL
- Browser/device info
- Session replay (with text masked)

### **GDPR Compliance:**
- Set `sendDefaultPii: false` if you don't want any PII sent
- Users can opt-out of session replay
- Data retention configurable in Sentry settings

---

## 🧪 Testing Checklist

- [ ] Environment variables added to `.env.local`
- [ ] Run `npm run dev` - no errors in console
- [ ] Trigger test error - appears in Sentry dashboard
- [ ] User context visible in error report
- [ ] Session replay works
- [ ] Sensitive data filtered out
- [ ] Change `enabled` back to production-only

---

## 📞 Support & Resources

**Sentry Dashboard:**
https://sentry.io

**Your Project:**
https://sentry.io/organizations/YOUR_ORG/projects/soundbridge-web/

**Documentation:**
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)

**Need Help?**
- Sentry Support: https://sentry.io/support/
- Full setup guide: [SENTRY_INTEGRATION_GUIDE.md](SENTRY_INTEGRATION_GUIDE.md)

---

## ✅ Summary

**Setup Status: 95% Complete**

**What's Done:**
- ✅ Sentry installed
- ✅ All config files created and optimized
- ✅ Security and privacy features enabled
- ✅ Session replay configured
- ✅ Production optimizations applied

**What's Needed:**
1. Add 3 environment variables to `.env.local`
2. Test in development (optional)
3. Deploy to production with environment variables

**Result:**
You'll be alerted within minutes when errors occur, with full context to debug and fix them quickly!

---

*Setup completed: December 16, 2025*
*Sentry version: 10.31.0*
*Next step: Add environment variables*
