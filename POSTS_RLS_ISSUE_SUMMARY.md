# ⚡ Feed Posts Not Showing - Quick Fix Summary

**Date:** December 18, 2025  
**Status:** 🔍 **INVESTIGATION & FIX READY**

---

## 🎯 **The Problem**

After fixing the `audio_tracks` RLS infinite recursion issue, feed posts stopped showing in the mobile app.

**Symptoms:**
- ✅ Users can create posts
- ❌ Posts don't appear in feed
- ❌ Existing posts don't show

---

## 🔍 **Likely Cause**

The `posts` table RLS policies might have a similar circular dependency issue, or they might be missing admin access that was added to other tables.

**Possible Issues:**
1. Posts policy references `user_roles` (circular dependency)
2. Posts policy queries `connections` which references `user_roles`
3. Missing admin check in posts policy
4. Policy syntax error (missing `WITH CHECK` clause)

---

## ⚡ **Quick Fix (3 Steps)**

### **Step 1: Diagnose (2 min)**

1. Open Supabase SQL Editor
2. Open `DIAGNOSE_POSTS_RLS_ISSUE.sql`
3. Copy & paste into SQL Editor
4. Click "Run"
5. Review results

**Look for:**
- `⚠️ REFERENCES user_roles` - Circular dependency risk
- Query returns 0 rows - RLS blocking access

### **Step 2: Fix (1 min)**

1. Open `FIX_POSTS_RLS_POLICIES.sql`
2. Copy & paste into SQL Editor
3. Click "Run"
4. Wait for success message

**What it does:**
- Ensures `is_admin_user()` function exists
- Fixes posts RLS policies
- Adds admin access (no circular dependency)
- Fixes related policies (attachments, comments)

### **Step 3: Verify (2 min)**

Run this test query:

```sql
SELECT * FROM posts 
WHERE deleted_at IS NULL 
  AND (visibility = 'public' OR user_id = auth.uid())
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected:** Should return posts (no errors)

Then test in mobile app:
- Open Feed screen
- Should see posts ✅

---

## 📁 **Files Created**

1. **`DIAGNOSE_POSTS_RLS_ISSUE.sql`** - Diagnostic script (run first)
2. **`FIX_POSTS_RLS_POLICIES.sql`** - Fix script (run after diagnosis)
3. **`POSTS_RLS_FIX_GUIDE.md`** - Complete guide with details

---

## ✅ **Success Checklist**

- [ ] Diagnostic script runs without errors
- [ ] Fix script runs without errors
- [ ] Test query returns posts
- [ ] Mobile app Feed shows posts
- [ ] Can create new posts
- [ ] New posts appear in feed

---

## 🚨 **If Still Not Working**

Check these:

1. **No posts in database:**
   ```sql
   SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL;
   ```

2. **API endpoint issue:**
   - Check `/api/posts/feed` response
   - Check API logs

3. **Frontend cache:**
   - Clear app cache
   - Restart Expo: `npx expo start --clear`

4. **Connections table:**
   - If `connections` has circular dependency, fix it separately

---

## 📞 **Need Help?**

Share:
- Diagnostic script output
- Test query results
- Mobile app console logs
- API endpoint response

---

**Total Time:** ~5 minutes  
**Risk:** Low (atomic operation)  
**Priority:** Medium (users can create but can't see posts)

---

**Go run the diagnostic script now! 🚀**

