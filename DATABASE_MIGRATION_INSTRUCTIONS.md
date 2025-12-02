# 🗄️ Database Migration: Remove Enterprise Tier

**Date:** December 2, 2025  
**Script:** `database/remove_enterprise_tier_migration.sql`  
**Status:** ✅ Ready for Production

---

## 📋 **Overview**

This migration script removes the Enterprise tier from all database constraints, functions, and triggers. It converts any existing Enterprise users to Pro tier and updates all CHECK constraints to only allow `'free'` and `'pro'`.

---

## ⚠️ **Pre-Migration Checklist**

Before running this migration:

- [ ] **Backup your database** (Critical!)
- [ ] Review the migration script: `database/remove_enterprise_tier_migration.sql`
- [ ] Check for any active Enterprise subscriptions:
  ```sql
  SELECT COUNT(*) FROM user_subscriptions WHERE tier = 'enterprise' AND status = 'active';
  ```
- [ ] Verify you're running this in the correct environment (staging first, then production)
- [ ] Ensure no other migrations are running simultaneously

---

## 🚀 **Migration Steps**

### **Step 1: Run in Staging (Recommended)**

1. **Connect to Supabase Staging Project**
2. **Open Supabase SQL Editor**
3. **Copy the entire contents of** `database/remove_enterprise_tier_migration.sql`
4. **Paste into SQL Editor**
5. **Click "Run"**
6. **Review the output** for any warnings or errors

### **Step 2: Verify in Staging**

Run these verification queries:

```sql
-- 1. Check all tier constraints
SELECT 
  table_name, 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%tier%' 
ORDER BY table_name;

-- 2. Verify no Enterprise values remain
SELECT 'user_subscriptions' as table_name, COUNT(*) as enterprise_count
FROM user_subscriptions WHERE tier = 'enterprise'
UNION ALL
SELECT 'audio_tracks', COUNT(*)
FROM audio_tracks WHERE uploaded_during_tier = 'enterprise'
UNION ALL
SELECT 'downgrade_track_selections', COUNT(*)
FROM downgrade_track_selections 
WHERE from_tier = 'enterprise' OR to_tier = 'enterprise';

-- 3. Test constraint enforcement (should fail)
INSERT INTO user_subscriptions (user_id, tier) 
VALUES (gen_random_uuid(), 'enterprise');
-- Expected: ERROR: new row for relation "user_subscriptions" violates check constraint
```

### **Step 3: Run in Production**

Once verified in staging:

1. **Connect to Supabase Production Project**
2. **Open Supabase SQL Editor**
3. **Run the migration script**
4. **Verify using the same queries as Step 2**

---

## 📊 **What the Migration Does**

### **1. Converts Existing Enterprise Users**
- Finds all active Enterprise subscriptions
- Converts them to Pro tier
- Preserves subscription status and dates

### **2. Updates CHECK Constraints**
Updates constraints in these tables:
- `user_subscriptions` - Main subscription table
- `audio_tracks` - Track upload tier tracking
- `downgrade_track_selections` - Downgrade history
- `persistent_user_memory` - User memory tracking
- `tips` - Tipping tier tracking
- `user_upload_stats` - Upload statistics
- `upload_validation_logs` - Validation logs
- `tier_limits` - Tier limit configuration
- `creator_bank_accounts` - Bank account tier tracking

### **3. Updates Database Functions**
- `has_premium_feature()` - Removes Enterprise check
- `restore_tracks_on_upgrade()` - Removes Enterprise from restore logic

### **4. Updates Triggers**
- `restore_tracks_on_upgrade_trigger` - Only triggers for Pro tier

### **5. Data Migration**
- Converts all `'enterprise'` values to `'pro'` in all tables
- Preserves all other data

---

## ✅ **Post-Migration Verification**

After running the migration, verify:

1. **No Enterprise tiers remain:**
   ```sql
   SELECT COUNT(*) FROM user_subscriptions WHERE tier = 'enterprise';
   -- Should return 0
   ```

2. **Constraints are updated:**
   ```sql
   SELECT check_clause 
   FROM information_schema.check_constraints 
   WHERE constraint_name = 'user_subscriptions_tier_check';
   -- Should show: (tier IN ('free', 'pro'))
   ```

3. **Functions are updated:**
   ```sql
   SELECT pg_get_functiondef(oid) 
   FROM pg_proc 
   WHERE proname = 'has_premium_feature';
   -- Should not contain 'enterprise'
   ```

4. **Test constraint enforcement:**
   ```sql
   -- This should fail
   INSERT INTO user_subscriptions (user_id, tier) 
   VALUES (gen_random_uuid(), 'enterprise');
   ```

---

## 🔄 **Rollback Instructions**

If you need to rollback:

### **Option 1: Database Backup (Recommended)**
1. Restore from your pre-migration backup
2. This is the safest option

### **Option 2: Manual Rollback (Not Recommended)**
If you must manually rollback:

```sql
-- WARNING: Only use if absolutely necessary
-- This will re-add Enterprise to constraints, but Enterprise tier is no longer supported in code

-- Re-add Enterprise to user_subscriptions
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_tier_check;

ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_tier_check 
CHECK (tier IN ('free', 'pro', 'enterprise'));

-- Repeat for other tables...
```

**Note:** Manual rollback is NOT recommended because:
- Enterprise tier is removed from all application code
- No way to create new Enterprise subscriptions
- Application will not handle Enterprise tier correctly

---

## 📝 **Migration Script Features**

- ✅ **Idempotent:** Safe to run multiple times
- ✅ **Transactional:** Wrapped in BEGIN/COMMIT
- ✅ **Safe:** Converts existing Enterprise users to Pro (preserves data)
- ✅ **Comprehensive:** Updates all tables, functions, and triggers
- ✅ **Verification:** Includes built-in verification queries
- ✅ **Documented:** Clear comments and instructions

---

## ⚠️ **Important Notes**

1. **No Data Loss:** All Enterprise users are converted to Pro, not deleted
2. **Backward Compatible:** Existing Free and Pro users are unaffected
3. **Application Code:** Already updated to remove Enterprise support
4. **Stripe:** Enterprise price IDs should be removed from Vercel environment variables
5. **Future:** Enterprise tier can be re-added later if needed (would require code changes)

---

## 🐛 **Troubleshooting**

### **Error: Constraint already exists**
- The script uses `DROP CONSTRAINT IF EXISTS`, so this shouldn't happen
- If it does, manually drop the constraint first

### **Error: Function does not exist**
- Some functions may not exist in all environments
- The script uses `IF EXISTS` checks, so it should handle this gracefully

### **Warning: Found Enterprise values remaining**
- The script will show warnings if Enterprise values are found
- Check the verification queries to identify which tables still have Enterprise values
- Manually update those values if needed

---

## 📞 **Support**

If you encounter issues:
1. Check the migration script output for specific errors
2. Review the verification queries
3. Check Supabase logs for detailed error messages
4. Restore from backup if needed

---

## ✅ **Success Criteria**

After migration, you should see:
- ✅ All tier constraints only allow `'free'` and `'pro'`
- ✅ No Enterprise values in any tables
- ✅ Functions updated to remove Enterprise checks
- ✅ Triggers updated to remove Enterprise references
- ✅ Constraint enforcement prevents Enterprise tier insertion

---

**Last Updated:** December 2, 2025  
**Migration Script:** `database/remove_enterprise_tier_migration.sql`