# Event Notification Trigger - Quick Setup Guide

## 🔑 Finding Your Credentials

### Step 1: Find YOUR_PROJECT_REF

1. Go to your Supabase project dashboard
2. Look at the URL in your browser
3. It will look like: `https://YOUR_PROJECT_REF.supabase.co`
4. **Copy the part before `.supabase.co`**

**Example:**
- URL: `https://abcdefghijklmnop.supabase.co`
- YOUR_PROJECT_REF = `abcdefghijklmnop`

### Step 2: Find YOUR_SERVICE_ROLE_KEY

1. In Supabase Dashboard, go to **Settings** → **API**
2. Scroll down to **Project API keys**
3. Find the **`service_role`** key (NOT the `anon` or `public` key!)
4. Click the **eye icon** 👁️ to reveal it
5. **Copy the entire key** (it's very long, starts with `eyJ...`)

⚠️ **IMPORTANT:** 
- Use the **service_role** key, NOT the anon/public key
- Keep this secret - never commit it to git
- This key has admin access to your database

## 📝 How to Replace in SQL File

Open the file: `supabase/migrations/20260108000001_event_notification_trigger.sql`

Find these two lines (around lines 13-14):

```sql
function_url TEXT := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications';
service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY';
```

Replace them with your actual values:

```sql
function_url TEXT := 'https://abcdefghijklmnop.supabase.co/functions/v1/send-event-notifications';
service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

## ✅ Quick Checklist

Before running the SQL:

- [ ] Found YOUR_PROJECT_REF from Supabase URL
- [ ] Found YOUR_SERVICE_ROLE_KEY from Settings → API
- [ ] Replaced `YOUR_PROJECT_REF` in line 13
- [ ] Replaced `YOUR_SERVICE_ROLE_KEY` in line 14 (entire key, including quotes)
- [ ] Verified the function URL looks correct
- [ ] Verified the service_role_key is the long JWT token (starts with `eyJ`)

## 🚀 After Replacing Values

1. **Copy the entire updated SQL file**
2. **Paste into Supabase SQL Editor**
3. **Click "Run"**
4. **Verify success:** Should see "Success. No rows returned"

## 🔍 Verification

After running, verify the trigger was created:

```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_event_created';

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'trigger_event_notifications';
```

Both should return results.

## ⚠️ Common Mistakes

1. **Using anon key instead of service_role key** ❌
   - The anon key won't work - you MUST use service_role key

2. **Not including the full key** ❌
   - Service role keys are very long (200+ characters)
   - Make sure you copy the ENTIRE key

3. **Wrong project reference** ❌
   - Make sure you're using the project ref from YOUR project URL
   - Not from documentation or examples

4. **Forgetting quotes** ❌
   - Both values must be in single quotes: `'your-value'`

## 📞 Need Help?

If you're stuck:
1. Double-check you're in the correct Supabase project
2. Make sure you're looking at Settings → API (not other settings)
3. Verify the service_role key is revealed (click the eye icon)
4. Check that your Edge Function is deployed first (the URL must exist)
