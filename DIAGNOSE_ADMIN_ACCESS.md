# 🔍 Diagnose Admin Access Issue

**Date:** December 23, 2024  
**Issue:** Redirect loop on `/admin/moderation` page

---

## 🔍 **Step 1: Verify User Has Admin Role**

Run this in Supabase SQL Editor:

```sql
-- Check if your user has admin role
SELECT 
    u.email,
    u.id as user_id,
    ur.role,
    ur.created_at as role_created_at
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- Replace with your email
```

**Expected Result:**
- Should show a row with `role = 'admin'` or `'super_admin'` or `'moderator'`
- If no row or NULL role → **You don't have admin role**

---

## 🔧 **Step 2: Grant Admin Role (If Missing)**

If Step 1 shows no admin role, run this:

```sql
-- Grant admin role to your user
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
    u.id,
    'admin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'YOUR_EMAIL_HERE'  -- Replace with your email
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it was added
SELECT 
    u.email,
    ur.role
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'YOUR_EMAIL_HERE';
```

---

## 🔍 **Step 3: Check Browser Console**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to access `/admin/moderation`
4. Look for errors:
   - `Unauthorized` → Session issue
   - `Forbidden` → Not admin role
   - `401` → Authentication failed
   - `403` → Not admin

---

## 🔍 **Step 4: Check Network Tab**

1. Open browser DevTools → Network tab
2. Try to access `/admin/moderation`
3. Look for `/api/admin/moderation/queue` request
4. Check:
   - **Status Code:** Should be 200 (not 401 or 403)
   - **Response:** Should have `"success": true`

---

## 🔧 **Step 5: Clear Browser Data**

Sometimes cookies/session get corrupted:

1. Clear browser cookies for `soundbridge.live`
2. Clear localStorage
3. Log out completely
4. Log back in
5. Try accessing `/admin/moderation` again

---

## 🔍 **Step 6: Check Vercel Environment Variables**

Verify these are set in Vercel:
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Required for admin API
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ✅ **Quick Fix: Verify Admin Role**

Most likely issue: **User doesn't have admin role in database**

Run this SQL (replace email):

```sql
-- Quick check and fix
SELECT 
    u.email,
    u.id,
    ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role IN ('admin', 'super_admin', 'moderator')
WHERE u.email = 'asibechetachukwu@gmail.com';

-- If no role, add it:
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
    u.id,
    'admin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'asibechetachukwu@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 🚨 **Common Issues**

### **Issue 1: No Admin Role**
**Symptom:** API returns 403 Forbidden  
**Fix:** Run SQL above to grant admin role

### **Issue 2: Session Expired**
**Symptom:** API returns 401 Unauthorized  
**Fix:** Clear cookies, log out, log back in

### **Issue 3: Cookie Issues**
**Symptom:** Redirect loop  
**Fix:** Clear all cookies for domain, try incognito mode

### **Issue 4: Missing Environment Variables**
**Symptom:** API returns 500 error  
**Fix:** Check Vercel environment variables

---

## 📞 **Next Steps**

1. Run Step 1 SQL query
2. If no admin role → Run Step 2 SQL
3. Clear browser cookies
4. Log out and log back in
5. Try accessing `/admin/moderation` again

If still not working, check browser console for specific error messages.

