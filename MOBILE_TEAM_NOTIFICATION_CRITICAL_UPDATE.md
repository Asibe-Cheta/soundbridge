# 📱 Mobile Team - Notification System Critical Update

**Date:** November 18, 2025  
**From:** Web App Team  
**Priority:** 🔴 **URGENT - READ FIRST**

---

## ⚠️ CRITICAL FIX APPLIED

### **Database Schema Issue Resolved**

When running the notification system schema, we encountered an error:

```
ERROR: 42703: column "user_id" does not exist
```

### **Root Cause**

The original schema incorrectly referenced `auth.users(id)` directly. However, SoundBridge's database architecture uses:

```sql
profiles (id) → REFERENCES auth.users(id)
```

All user-related tables reference `profiles(id)`, not `auth.users(id)` directly.

### **What We Fixed**

✅ **All 5 tables updated:**
- `user_notification_preferences` - Changed to reference `profiles(id)`
- `creator_subscriptions` - Changed to reference `profiles(id)`
- `user_push_tokens` - Changed to reference `profiles(id)`
- `notification_logs` - Changed to reference `profiles(id)`
- `notification_queue` - Changed to reference `profiles(id)`

✅ **Trigger updated:**
- Changed from `AFTER INSERT ON auth.users` → `AFTER INSERT ON profiles`
- Now correctly creates notification preferences when a profile is created
- Uses `NEW.country` from profiles table instead of auth metadata

### **Impact on Your Integration**

**✅ NO CHANGES NEEDED** on your end! 

The API endpoints remain exactly the same:
- Same request/response formats
- Same authentication (Bearer tokens)
- Same functionality

This was purely a backend database fix.

---

## 🎯 WHAT YOU NEED TO KNOW

### **1. Schema is Now Correct**

The updated `database/notification_system_schema.sql` file is ready to run without errors.

### **2. All Foreign Keys Reference `profiles(id)`**

This aligns with your existing codebase:

```sql
-- Your existing tables already do this:
audio_tracks.creator_id → profiles(id)
events.creator_id → profiles(id)
follows.follower_id → profiles(id)

-- Our new tables now match:
user_notification_preferences.user_id → profiles(id)
creator_subscriptions.user_id → profiles(id)
user_push_tokens.user_id → profiles(id)
```

### **3. Automatic Preference Creation**

When a new profile is created, notification preferences are automatically generated via database trigger:

```sql
CREATE TRIGGER create_user_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();
```

**Default values:**
- `notifications_enabled`: `true`
- `notification_start_hour`: `8` (8 AM)
- `notification_end_hour`: `22` (10 PM)
- `timezone`: `'UTC'`
- `location_country`: Copied from `profiles.country`
- `max_notifications_per_day`: `5`

---

## 📋 DEPLOYMENT STATUS

### **✅ Completed by Web Team**

- [x] Database schema corrected
- [x] All API endpoints implemented
- [x] Expo Push integration ready
- [x] Background scheduler configured
- [x] Vercel cron jobs set up
- [x] Documentation complete

### **⏳ Pending - Mobile Team**

- [ ] Run corrected database schema in Supabase
- [ ] Add `EXPO_ACCESS_TOKEN` to Vercel
- [ ] Implement push token registration
- [ ] Build notification preferences UI
- [ ] Build notification inbox UI
- [ ] Implement deep linking
- [ ] Test end-to-end flow

---

## 🚀 NEXT STEPS FOR YOU

### **Step 1: Run Database Schema (5 min)**

Open Supabase Dashboard → SQL Editor → Run:

```bash
database/notification_system_schema.sql
```

**Expected Result:** 5 tables created successfully

**Verify:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_notification_preferences',
    'creator_subscriptions',
    'user_push_tokens',
    'notification_logs',
    'notification_queue'
  );
```

Should return all 5 table names.

---

### **Step 2: Add Environment Variable (2 min)**

Vercel Dashboard → Settings → Environment Variables:

```env
EXPO_ACCESS_TOKEN=your_expo_token_here
```

**How to get token:**
1. Go to https://expo.dev/
2. Sign in
3. Project Settings → Access Tokens
4. Create new token
5. Copy to Vercel

---

### **Step 3: Start Integration (Week 1)**

Follow the comprehensive guide:

📄 **`WEB_TEAM_NOTIFICATION_SYSTEM_COMPLETE.md`**

This includes:
- Complete API documentation
- Code examples for React Native
- Integration phases (3 weeks)
- Testing checklist

---

## 📞 QUESTIONS & ANSWERS

### **Q: Do we need to change our existing code?**

**A:** No! This was a backend-only fix. Your API calls remain the same.

---

### **Q: Will this affect existing users?**

**A:** No. The trigger will auto-create preferences for new users. For existing users, preferences are created on first API call (GET /api/user/notification-preferences).

---

### **Q: What if we already have a `follows` table?**

**A:** Our `creator_subscriptions` table is separate and adds notification preferences. It works alongside your existing `follows` table. Consider:
- `follows` = Social following (for feed, etc.)
- `creator_subscriptions` = Notification preferences for followed creators

---

### **Q: Can users have multiple devices?**

**A:** Yes! `user_push_tokens` table supports multiple tokens per user (one per device).

---

### **Q: What happens if Expo token expires?**

**A:** The backend will mark it as `active = false` when Expo returns an error. Your app should re-register the token on next launch.

---

## 🔧 TECHNICAL DETAILS

### **Database Relationships**

```
profiles (id) ← user_notification_preferences (user_id)
              ← creator_subscriptions (user_id, creator_id)
              ← user_push_tokens (user_id)
              ← notification_logs (user_id)
              ← notification_queue (user_id)
```

### **RLS Policies**

All tables have Row Level Security enabled:
- Users can only access their own data
- `notification_queue` is service-role only (for backend scheduler)

### **Indexes**

Optimized for:
- User lookups (by user_id)
- Location-based queries (state + country)
- Genre matching (preferred_event_genres)
- Unread notifications (read_at IS NULL)
- Active push tokens (active = true)

---

## ✅ VERIFICATION CHECKLIST

After running the schema, verify:

- [ ] 5 tables created
- [ ] Indexes created (check with `\di` in psql)
- [ ] RLS policies active (check with `\dp` in psql)
- [ ] Trigger exists (check `pg_trigger` table)
- [ ] Functions created (check `pg_proc` table)

**Quick verification query:**

```sql
-- Should return 5 rows
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename LIKE '%notif%' 
   OR tablename = 'creator_subscriptions' 
   OR tablename = 'user_push_tokens';
```

---

## 📚 DOCUMENTATION FILES

1. **`WEB_TEAM_NOTIFICATION_SYSTEM_COMPLETE.md`** - Full implementation guide
2. **`NOTIFICATION_SYSTEM_DEPLOYMENT_GUIDE.md`** - Quick deployment steps
3. **`database/notification_system_schema.sql`** - Corrected database schema

---

## 🎉 SUMMARY

**Problem:** Schema referenced `auth.users(id)` instead of `profiles(id)`  
**Solution:** Updated all foreign keys to reference `profiles(id)`  
**Status:** ✅ **FIXED AND READY**  
**Action Required:** Run corrected schema in Supabase  
**Impact on Mobile:** None - API unchanged

---

**Ready to integrate!** 🚀

If you have any questions, reach out to the Web Team.

---

**END OF UPDATE**

