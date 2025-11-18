# 🚨 How to Run Notification Schema in Supabase

## The Problem

Supabase SQL Editor is showing you the **OLD cached version** of the file. You're seeing `auth.users(id)` but the file has been corrected to `profiles(id)`.

## The Solution

### **Option 1: Copy-Paste Fresh File (RECOMMENDED)**

1. **Open this file:** `database/NOTIFICATION_SCHEMA_FIXED.sql`
2. **Select ALL** (Ctrl+A)
3. **Copy** (Ctrl+C)
4. **Go to Supabase** → SQL Editor → **New Query**
5. **Paste** (Ctrl+V)
6. **Click "Run"**

✅ This ensures you're running the CORRECTED version with `profiles(id)`

---

### **Option 2: Refresh Supabase Editor**

1. Close the "SoundBridge Notification Schema" tab in Supabase
2. Hard refresh your browser (Ctrl+Shift+R or Ctrl+F5)
3. Go back to SQL Editor
4. Re-open "SoundBridge Notification Schema"
5. It should now show `profiles(id)` instead of `auth.users(id)`
6. Click "Run"

---

## Verification

After running, execute this query to verify:

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
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

**Expected Result:** 5 rows showing all tables

---

## What Was Fixed

❌ **OLD (Incorrect):**
```sql
user_id UUID NOT NULL REFERENCES auth.users(id)
```

✅ **NEW (Correct):**
```sql
user_id UUID NOT NULL REFERENCES profiles(id)
```

This matches your existing database structure where `profiles(id)` extends `auth.users(id)`.

---

## Still Getting Errors?

If you still see errors after using **Option 1** above, please share:
1. The exact error message
2. A screenshot of the SQL you're running
3. The line number where the error occurs

---

**File to use:** `database/NOTIFICATION_SCHEMA_FIXED.sql`  
**Status:** ✅ Ready to run

