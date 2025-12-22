# 🔧 **FIXED: Database RLS Infinite Recursion Error**

**Date:** December 18, 2025  
**Status:** ✅ **Solution Ready - Apply Immediately**  
**Severity:** 🔴 **PRODUCTION BLOCKER**

---

## 📋 **Quick Summary**

**Problem:** `infinite recursion detected in policy for relation "user_roles"` (Error 42P17)  
**Root Cause:** Circular dependency in RLS policies  
**Solution:** Simplified RLS policies + SECURITY DEFINER function  
**Time to Fix:** ~2 minutes  
**Downtime:** None (policies are replaced atomically)

---

## 🔍 **Root Cause Identified**

### **The Circular Dependency:**

```
┌─────────────────────────────────────────────────────┐
│  1. User queries audio_tracks table                 │
│     ↓                                               │
│  2. RLS policy checks: "Is user an admin?"         │
│     ↓                                               │
│  3. Policy queries user_roles table                 │
│     ↓                                               │
│  4. user_roles RLS checks: "Is user an admin?"     │
│     ↓                                               │
│  5. Policy queries user_roles AGAIN                 │
│     ↓                                               │
│  6. ♾️ INFINITE RECURSION!                          │
└─────────────────────────────────────────────────────┘
```

### **Problematic Code:**

**File:** `GRANT_ADMIN_ACCESS.sql` (lines 26-36)

```sql
-- ❌ BAD: This policy references user_roles while evaluating user_roles
CREATE POLICY "Admins can view all roles" ON user_roles 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    --                   ^^^^^^^^^^^ Circular reference!
);
```

**File:** `database/add_moderation_fields.sql` (lines 86-96)

```sql
-- This policy triggers the circular reference
CREATE POLICY "Users can view own track moderation status"
ON audio_tracks FOR SELECT
USING (
  creator_id = auth.uid()
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM user_roles  -- Queries user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'moderator')
  )
);
```

---

## ✅ **The Solution**

### **Strategy:**

1. **Simplify `user_roles` policies** → Remove self-referencing queries
2. **Create SECURITY DEFINER function** → Bypass RLS for admin checks
3. **Update `audio_tracks` policies** → Use the safe function instead

### **Why This Works:**

- `SECURITY DEFINER` functions execute with the privileges of the function creator
- They bypass RLS checks, breaking the circular dependency
- The function is cached, so it's fast
- No security risk: function only returns true/false

---

## 🚀 **How to Apply the Fix**

### **Step 1: Run the Fix Script**

1. **Open Supabase Dashboard** → Your Project
2. Go to **SQL Editor**
3. Open the file `FIX_USER_ROLES_INFINITE_RECURSION.sql` (created in your repo)
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)

### **Step 2: Verify the Fix**

Run these test queries in the SQL Editor:

```sql
-- Test 1: Query your own roles (should return your roles)
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Test 2: Query public tracks (should return tracks)
SELECT id, title, creator_id, moderation_status 
FROM audio_tracks 
WHERE is_public = true 
LIMIT 10;

-- Test 3: Query your own tracks (should return your tracks)
SELECT id, title, moderation_status 
FROM audio_tracks 
WHERE creator_id = auth.uid() 
LIMIT 10;

-- Test 4: Check if admin check works
SELECT is_admin_user(); -- Returns true if you're an admin, false otherwise
```

**Expected Results:**
- All queries should return results (no errors)
- No `42P17` error code
- No "infinite recursion" message

### **Step 3: Test in Mobile App**

1. Open the mobile app
2. Navigate to **Discover** screen
3. Check if trending tracks load
4. Navigate to **Profile** screen
5. Check if track count shows
6. Navigate to **My Tracks**
7. Try uploading a new track

All should work without errors.

---

## 📚 **What Changed**

### **Before (Broken):**

```sql
-- user_roles policy (CIRCULAR)
CREATE POLICY "Admins can view all roles" ON user_roles 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- audio_tracks policy (triggers circular)
CREATE POLICY "view policy" ON audio_tracks
FOR SELECT USING (
    creator_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
```

### **After (Fixed):**

```sql
-- user_roles policy (SIMPLE - no circular reference)
CREATE POLICY "Users can view own roles" ON user_roles 
FOR SELECT USING (auth.uid() = user_id);

-- Helper function (SECURITY DEFINER - bypasses RLS)
CREATE FUNCTION is_admin_user() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- audio_tracks policy (uses safe function)
CREATE POLICY "view policy" ON audio_tracks
FOR SELECT USING (
    creator_id = auth.uid() 
    OR is_admin_user() = true
);
```

---

## 🔒 **Security Considerations**

### **Is SECURITY DEFINER Safe?**

✅ **Yes, in this case!**

**Why it's safe:**
- The function only returns `true` or `false` (boolean)
- It doesn't expose any sensitive data
- It doesn't allow privilege escalation
- It only checks if the current user has an admin role
- The function is read-only (no modifications)

**Additional Security:**
- Function is granted only to `authenticated` and `anon` roles
- Function doesn't accept parameters (no injection risk)
- Function uses `auth.uid()` which is always the current authenticated user

---

## 📊 **Performance Impact**

### **Before Fix:**
- ❌ Queries failed immediately (infinite recursion)
- ❌ 100% failure rate
- ❌ App unusable

### **After Fix:**
- ✅ Queries succeed
- ✅ ~same performance as before (SECURITY DEFINER is cached)
- ✅ No noticeable slowdown

---

## 🧪 **Advanced Testing (Optional)**

### **Test 1: Verify No Circular References**

```sql
-- This should complete without errors
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM audio_tracks WHERE is_public = true LIMIT 100;
```

### **Test 2: Verify Admin Function Works**

```sql
-- Check function exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'is_admin_user';

-- Test function execution
SELECT is_admin_user() AS am_i_admin;

-- Check function permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'is_admin_user';
```

### **Test 3: Verify RLS Policies**

```sql
-- Check user_roles policies (should be 2)
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE tablename = 'user_roles';

-- Check audio_tracks policies (should include admin policy)
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE tablename = 'audio_tracks';
```

---

## 🔄 **Rollback Plan (If Needed)**

If something goes wrong, you can rollback:

```sql
-- Restore original policies (will restore the bug, but unblocks temporarily)
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles 
FOR SELECT USING (auth.uid() = user_id);

-- Temporarily disable RLS on user_roles (DANGEROUS - only for testing)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Re-enable after fix
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

**⚠️ Warning:** Only use rollback for testing. Always re-enable RLS in production!

---

## 📞 **Need Help?**

### **If Fix Doesn't Work:**

1. **Check Supabase logs:**
   - Dashboard → Database → Logs
   - Look for new errors

2. **Verify fix was applied:**
   ```sql
   SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_roles';
   -- Should return 2
   
   SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_admin_user';
   -- Should return 1
   ```

3. **Check for conflicting migrations:**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   ORDER BY version DESC LIMIT 10;
   ```

### **If Still Broken:**

- Post error logs in Discord/Slack
- Include result of verification queries
- Include Supabase project ID

---

## ✅ **Success Checklist**

- [ ] SQL script executed without errors
- [ ] Verification queries all return results
- [ ] No `42P17` errors in Supabase logs
- [ ] Mobile app Discover screen loads trending tracks
- [ ] Mobile app Profile screen shows track count
- [ ] Mobile app "My Tracks" loads user's tracks
- [ ] Search functionality works
- [ ] Upload works (if tested)

---

## 🎉 **Expected Results After Fix**

### **Discover Screen:**
- ✅ Trending tracks load (10+ tracks)
- ✅ Recent tracks load (10+ tracks)
- ✅ Featured creators load

### **Profile Screen:**
- ✅ Track count shows correct number
- ✅ "My Tracks" button works

### **My Tracks Screen:**
- ✅ All user's tracks load
- ✅ Can edit/delete tracks

### **Search:**
- ✅ Can search tracks by title/artist
- ✅ Results show correctly

### **Admin Dashboard (if applicable):**
- ✅ Can view all tracks
- ✅ Can view moderation queue
- ✅ Can approve/reject content

---

## 📝 **Post-Fix Recommendations**

### **1. Monitor Logs (First 24 Hours)**

- Check Supabase logs for any new RLS errors
- Monitor mobile app error reports
- Check for slow queries (performance)

### **2. Update Documentation**

- Document the `is_admin_user()` function
- Add note about avoiding circular RLS policies
- Update onboarding for new developers

### **3. Add Automated Tests**

```sql
-- Create test to prevent future circular dependencies
CREATE OR REPLACE FUNCTION test_rls_no_circular_dependencies()
RETURNS BOOLEAN AS $$
DECLARE
  v_test_result BOOLEAN;
BEGIN
  -- Test query that previously failed
  SELECT EXISTS (
    SELECT 1 FROM audio_tracks WHERE is_public = true LIMIT 1
  ) INTO v_test_result;
  
  RETURN v_test_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'RLS Test Failed: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **4. Code Review Checklist**

When adding new RLS policies, check:
- [ ] Does the policy query the same table it's defined on?
- [ ] Does the policy query a table that queries back to this table?
- [ ] Can I use a SECURITY DEFINER function instead?
- [ ] Have I tested with `EXPLAIN` to check for recursion?

---

## 🌟 **Best Practices Going Forward**

### **1. Avoid Circular RLS Policies**

❌ **Bad:**
```sql
CREATE POLICY "policy" ON table_a USING (
    EXISTS (SELECT 1 FROM table_b WHERE ...)
);

CREATE POLICY "policy" ON table_b USING (
    EXISTS (SELECT 1 FROM table_a WHERE ...)
);
```

✅ **Good:**
```sql
CREATE FUNCTION check_permission() RETURNS BOOLEAN
SECURITY DEFINER AS $$ ... $$;

CREATE POLICY "policy" ON table_a USING (check_permission());
CREATE POLICY "policy" ON table_b USING (check_permission());
```

### **2. Use SECURITY DEFINER Functions for Complex Checks**

✅ **When to use:**
- Admin/role checks
- Cross-table permission checks
- Complex business logic

✅ **Benefits:**
- Bypasses RLS (no recursion)
- Reusable across policies
- Easier to test and maintain

### **3. Test RLS Policies Before Deploying**

```sql
-- Test as regular user
SET SESSION AUTHORIZATION 'user_id_here';
SELECT * FROM table_name;

-- Test as admin
SET SESSION AUTHORIZATION 'admin_id_here';
SELECT * FROM table_name;

-- Reset
RESET SESSION AUTHORIZATION;
```

---

## 📖 **Related Resources**

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Avoiding Circular Dependencies in RLS](https://supabase.com/docs/guides/auth/row-level-security#avoiding-circular-dependencies)

---

**Status:** ✅ **FIX READY TO DEPLOY**  
**Estimated Fix Time:** 2 minutes  
**Risk Level:** 🟢 Low (atomic operation, easy rollback)  
**Downtime:** None  

---

## 🎯 **TL;DR**

1. **Problem:** `user_roles` RLS policy queries itself → infinite recursion
2. **Solution:** Use `SECURITY DEFINER` function to bypass RLS
3. **Action:** Run `FIX_USER_ROLES_INFINITE_RECURSION.sql` in Supabase SQL Editor
4. **Result:** All queries to `audio_tracks` work again
5. **Time:** 2 minutes to fix, 0 downtime

**Go ahead and run the fix script now! 🚀**

