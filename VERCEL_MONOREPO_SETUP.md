# Vercel Monorepo Configuration Guide

**Issue:** Vercel deployment failing with schema validation error  
**Solution:** Configure Root Directory in Vercel Dashboard

---

## 🚨 The Problem

The `vercel.json` file cannot have `buildCommand`, `installCommand`, `outputDirectory`, or `root` properties at the root level. These cause schema validation errors:

```
The `vercel.json` schema validation failed with the following message: 
should NOT have additional property 'root'
```

---

## ✅ The Solution

Configure the monorepo settings **in the Vercel Dashboard** instead of `vercel.json`.

---

## 📋 Step-by-Step Setup

### **1. Go to Vercel Dashboard**

1. Navigate to: https://vercel.com/asibe-chetas-projects/soundbridge
2. Click on **Settings** (top navigation)
3. Scroll down to **Build & Development Settings**

---

### **2. Configure Root Directory**

**Root Directory:**
```
apps/web
```

✅ Click **Edit** next to "Root Directory"  
✅ Enter: `apps/web`  
✅ Click **Save**

---

### **3. Configure Build Settings**

Vercel should auto-detect Next.js, but if needed:

**Framework Preset:**
```
Next.js
```

**Build Command:** (leave as default or set to)
```
npm run build
```

**Output Directory:** (leave as default)
```
.next
```

**Install Command:** (leave as default or set to)
```
npm install
```

---

### **4. Environment Variables**

Make sure these are set in **Settings → Environment Variables**:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `TOTP_ENCRYPTION_KEY`
- `EXPO_ACCESS_TOKEN` ← **NEW** (for notifications)

**Optional but recommended:**
- `NEXT_PUBLIC_SITE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

### **5. Redeploy**

After saving the Root Directory setting:

**Option A: Automatic**
- The next `git push` will trigger a deployment with correct settings

**Option B: Manual**
- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment
- Or click **Deploy** → **Redeploy**

---

## 📁 Current File Structure

```
soundbridge/
├── apps/
│   └── web/              ← Root Directory points here
│       ├── package.json  ← Contains Next.js
│       ├── app/          ← Next.js App Router
│       ├── src/
│       └── public/
├── packages/
│   ├── shared/
│   ├── types/
│   └── supabase/
├── vercel.json           ← Only contains crons and headers
└── package.json          ← Root package.json (not used by Vercel)
```

---

## 📄 What's in `vercel.json` Now

The `vercel.json` file now **only** contains:
- ✅ Cron jobs (for notifications)
- ✅ CORS headers (for API routes)

**No longer contains:**
- ❌ `buildCommand`
- ❌ `installCommand`
- ❌ `outputDirectory`
- ❌ `root`

These are configured in the Dashboard instead.

---

## 🔍 Verify Configuration

After setting Root Directory, check:

1. **Go to:** Settings → General → Root Directory
2. **Should show:** `apps/web`
3. **Framework:** Should auto-detect as "Next.js"

---

## 🚀 Expected Deployment Flow

1. Push to `main` branch
2. Vercel detects change
3. Vercel runs commands from `apps/web` directory:
   ```bash
   cd apps/web
   npm install
   npm run build
   ```
4. Deployment succeeds ✅
5. Cron jobs are scheduled ✅

---

## 🐛 Troubleshooting

### **Error: "Next.js version not detected"**

**Cause:** Root Directory not set  
**Fix:** Set Root Directory to `apps/web` in Dashboard

---

### **Error: "should NOT have additional property 'root'"**

**Cause:** `vercel.json` has invalid properties  
**Fix:** Already fixed - `vercel.json` now only has `crons` and `headers`

---

### **Build succeeds but cron jobs not working**

**Cause:** `EXPO_ACCESS_TOKEN` not set  
**Fix:** Add to Environment Variables in Dashboard

---

### **Environment variables not found**

**Cause:** Variables might be set for wrong environment  
**Fix:** Make sure variables are set for "Production", "Preview", and "Development"

---

## 📚 References

- [Vercel Monorepo Documentation](https://vercel.com/docs/monorepos)
- [Vercel Configuration (vercel.json)](https://vercel.com/docs/projects/project-configuration)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)

---

## ✅ Checklist

Before redeploying, confirm:

- [ ] Root Directory set to `apps/web` in Dashboard
- [ ] Framework detected as "Next.js"
- [ ] All environment variables set (including `EXPO_ACCESS_TOKEN`)
- [ ] `vercel.json` only contains `crons` and `headers`
- [ ] Latest code pushed to `main` branch

---

**Status:** Configuration updated  
**Next Step:** Set Root Directory in Vercel Dashboard  
**Last Updated:** November 18, 2025

