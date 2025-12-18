# ✅ Bookmark Endpoint - Deployment Checklist

**Date:** December 18, 2025  
**Status:** 🟢 **MOBILE APP WORKING - ENDPOINT READY FOR DEPLOYMENT**

---

## 🎉 **Current Status**

✅ **Mobile App:** Working via Supabase fallback  
✅ **API Endpoints:** Created and ready  
⏳ **Deployment:** Pending  

**Mobile Team Confirmation:**
> "The mobile bookmark feature is working via Supabase fallback. When you deploy the `/api/social/bookmark` endpoint (POST), the app will automatically switch from Supabase to the API. No mobile changes needed."

---

## 📋 **Deployment Checklist**

### **Files to Deploy:**

- [ ] `apps/web/app/api/social/bookmark/route.ts`
- [ ] `apps/web/app/api/social/bookmarks/route.ts`
- [ ] `apps/web/app/api/posts/saved/route.ts`

### **Pre-Deployment Verification:**

- [ ] All files exist in codebase
- [ ] No TypeScript/linting errors
- [ ] CORS headers included
- [ ] Authentication checks in place
- [ ] Error handling implemented

### **Deployment Steps:**

1. [ ] **Commit files:**
   ```bash
   git add apps/web/app/api/social/bookmark/route.ts
   git add apps/web/app/api/social/bookmarks/route.ts
   git add apps/web/app/api/posts/saved/route.ts
   git commit -m "Add bookmark endpoints and saved posts endpoint"
   ```

2. [ ] **Push to repository:**
   ```bash
   git push origin main
   ```

3. [ ] **Deploy to production:**
   - If auto-deploy: Wait for deployment to complete
   - If manual: Deploy via your platform (Vercel, Railway, etc.)

4. [ ] **Verify deployment:**
   ```bash
   # Test the endpoint
   curl -X POST https://www.soundbridge.live/api/social/bookmark \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"content_id":"test-uuid","content_type":"post"}'
   ```
   
   **Expected:** JSON response (not 405)

---

## 🧪 **Post-Deployment Testing**

### **Test 1: Toggle Bookmark**
```bash
POST https://www.soundbridge.live/api/social/bookmark
Body: {"content_id": "post-uuid", "content_type": "post"}
```

**Expected:**
- ✅ Returns 200 with bookmark object (when saving)
- ✅ Returns 200 with `data: null` (when unsaving)
- ✅ No 405 errors

### **Test 2: Check Bookmark Status**
```bash
GET https://www.soundbridge.live/api/social/bookmark?content_id=post-uuid&content_type=post
```

**Expected:**
- ✅ Returns 200 with `data: true` or `data: false`
- ✅ No 405 errors

### **Test 3: Get Saved Posts**
```bash
GET https://www.soundbridge.live/api/posts/saved?page=1&limit=20
```

**Expected:**
- ✅ Returns 200 with saved posts array
- ✅ Includes author information
- ✅ Includes pagination info

### **Test 4: Mobile App**
- [ ] Open mobile app
- [ ] Tap save button on a post
- [ ] Verify it saves (no 405 error)
- [ ] Tap save button again
- [ ] Verify it unsaves
- [ ] Check profile screen saved posts
- [ ] Verify posts load correctly

---

## 📊 **Endpoint Summary**

### **Created Endpoints:**

1. **`POST /api/social/bookmark`** - Toggle bookmark
2. **`GET /api/social/bookmark`** - Check bookmark status
3. **`POST /api/social/bookmarks`** - Toggle bookmark (alternative)
4. **`GET /api/social/bookmarks`** - Get all bookmarks
5. **`GET /api/posts/saved`** - Get saved posts for profile

### **All Endpoints Include:**
- ✅ CORS headers for mobile app
- ✅ Authentication checks
- ✅ Error handling
- ✅ Proper response formats

---

## 🔄 **Mobile App Behavior**

**Before Deployment:**
- Uses Supabase fallback (direct database queries)
- Works correctly ✅
- No errors ✅

**After Deployment:**
- Automatically switches to API endpoint
- No mobile app changes needed ✅
- Same functionality, better performance ✅

**Transition:**
- Mobile app detects 405 error → Uses Supabase
- Mobile app detects 200 response → Uses API
- Seamless switch, no user impact ✅

---

## ✅ **Success Criteria**

After deployment, verify:

- [ ] `POST /api/social/bookmark` returns 200 (not 405)
- [ ] Mobile app can save posts via API
- [ ] Mobile app can unsave posts via API
- [ ] Mobile app shows saved posts in profile
- [ ] No 405 errors in mobile app logs
- [ ] No errors in server logs

---

## 📞 **If Issues After Deployment**

### **Still Getting 405:**
1. Check deployment logs for errors
2. Verify route files were included in build
3. Check Next.js routing configuration
4. Test endpoint directly with curl

### **Getting 401:**
1. Check authentication token
2. Verify user is logged in
3. Check token expiration

### **Getting 500:**
1. Check server logs
2. Verify database connection
3. Check RLS policies on `bookmarks` table

---

## 🎯 **Next Steps**

1. **Deploy the endpoints** (this checklist)
2. **Test endpoints** (post-deployment testing)
3. **Verify mobile app** (automatic switch)
4. **Monitor for issues** (first 24 hours)

---

**Status:** 🟢 **READY FOR DEPLOYMENT**  
**Mobile App:** ✅ **WORKING (Supabase fallback)**  
**Priority:** 🟡 **MEDIUM** (feature works, deployment improves performance)

---

**Once deployed, the mobile app will automatically use the API endpoint! 🚀**

