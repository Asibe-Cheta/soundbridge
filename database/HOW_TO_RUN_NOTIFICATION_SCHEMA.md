# How to Run the Notification System Schema

This guide explains how to deploy the SoundBridge notification system database schema.

---

## 📋 Prerequisites

Before running the schema:

1. **Profiles table must exist** - The schema references `profiles(id)` for all foreign keys
2. **Supabase project** - You need a Supabase project with admin access
3. **uuid-ossp extension** - Should be enabled by default in Supabase

---

## 🚀 Deployment Steps

### **Option 1: Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** → **New Query**
3. Copy the entire contents of `notification_system_schema.sql`
4. Paste into the SQL editor
5. Click **Run** or press `Ctrl+Enter`
6. Wait for completion (should take 2-3 seconds)

**Success message:**
```
✅ SUCCESS! All 5 notification tables created successfully!
Tables: user_notification_preferences, creator_subscriptions, user_push_tokens, notification_logs, notification_queue
```

---

### **Option 2: Supabase CLI**

```bash
# Make sure you're in the project root
cd /path/to/soundbridge

# Login to Supabase (if not already)
supabase login

# Link to your project (if not already)
supabase link --project-ref your-project-ref

# Run the schema
supabase db push database/notification_system_schema.sql
```

---

## ✅ Verification

After running the schema, verify the tables were created:

```sql
-- Run this query to verify
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_notification_preferences',
    'creator_subscriptions',
    'user_push_tokens',
    'notification_logs',
    'notification_queue'
  )
ORDER BY table_name;
```

**Expected result:**
```
creator_subscriptions              | 9
notification_logs                  | 15
notification_queue                 | 14
user_notification_preferences      | 19
user_push_tokens                   | 10
```

---

## 🔄 Re-running the Schema

The schema is **idempotent** - it's safe to run multiple times. It will:
1. Drop existing notification tables (if they exist)
2. Create fresh tables with correct structure
3. Recreate all indexes, RLS policies, functions, and triggers

**Note:** Running again will delete all existing notification data. In production, use migrations instead.

---

## 📊 What Gets Created

### **5 Tables:**
1. `user_notification_preferences` - User settings and rate limiting
2. `creator_subscriptions` - Creator follows with notification controls
3. `user_push_tokens` - Expo push tokens for mobile devices
4. `notification_logs` - Full audit trail of sent notifications
5. `notification_queue` - Scheduled notification queue

### **13 Indexes:**
- Optimized for user lookups, notification history, and queue processing

### **3 Functions:**
- `update_updated_at_column()` - Auto-update timestamps
- `increment_notification_count()` - Track daily notification count
- `reset_notification_counts()` - Reset counts at midnight

### **3 Triggers:**
- Auto-update `updated_at` on preferences, subscriptions, and tokens

### **11 RLS Policies:**
- User privacy: Users can only access their own data
- Service role: Backend can manage notification queue

---

## 🚨 Troubleshooting

### **Error: "relation 'profiles' does not exist"**

**Cause:** The `profiles` table doesn't exist yet.

**Fix:** Create the profiles table first, or check if it's named differently in your database.

---

### **Error: "column 'user_id' does not exist"**

**Cause:** Misleading error - usually means RLS is preventing access.

**Fix:** Make sure you're running as admin in Supabase Dashboard (not as an authenticated user).

---

### **Error: "function uuid_generate_v4() does not exist"**

**Cause:** The `uuid-ossp` extension isn't enabled.

**Fix:** Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

### **Success message but tables don't show up**

**Cause:** Browser cache or Supabase dashboard cache.

**Fix:**
1. Refresh the browser (Ctrl+F5)
2. Navigate away and back to Table Editor
3. Run the verification query above to confirm tables exist

---

## 📚 Next Steps

After deploying the schema:

1. **Add environment variable:**
   ```
   EXPO_ACCESS_TOKEN=your_expo_access_token
   ```
   Add this to Vercel Dashboard → Settings → Environment Variables

2. **Deploy API endpoints:**
   All 10 notification API endpoints are already deployed at:
   ```
   https://soundbridge.vercel.app/api/user/...
   ```

3. **Start mobile integration:**
   See `MOBILE_TEAM_NOTIFICATION_SYSTEM_READY.md` for integration guide

---

## 📞 Support

**Issues?** Check the troubleshooting section above or contact the web team.

**Schema bugs?** The schema is in `database/notification_system_schema.sql`

---

**Last Updated:** November 18, 2025  
**Version:** 1.0  
**Status:** Production Ready

