# ⚠️ Bookmark Endpoint - Deployment Required

**Date:** December 18, 2025  
**Status:** 🔴 **ENDPOINT CREATED BUT NEEDS DEPLOYMENT**

---

## 🎯 **Issue**

The mobile app is getting **405 Method Not Allowed** when calling:
```
POST https://www.soundbridge.live/api/social/bookmark
```

**Root Cause:** The endpoint files exist in the codebase but haven't been deployed to production yet.

---

## ✅ **What's Been Created**

### **1. Bookmark Endpoints (Created)**

- ✅ `apps/web/app/api/social/bookmark/route.ts` - Singular endpoint
- ✅ `apps/web/app/api/social/bookmarks/route.ts` - Plural endpoint (for compatibility)

Both endpoints support:
- `POST` - Toggle bookmark (add/remove)
- `GET` - Check status / get all bookmarks
- `OPTIONS` - CORS preflight
- CORS headers for mobile app

### **2. Saved Posts Endpoint (Created)**

- ✅ `apps/web/app/api/posts/saved/route.ts` - Get user's saved posts for profile screen

**Endpoint:** `GET /api/posts/saved?page=1&limit=20`

**Returns:**
- Saved posts with full post data
- Author information
- Pagination info
- Sorted by when user saved them (not when post was created)

### **3. Database Table (Already Exists)**

- ✅ `bookmarks` table exists
- ✅ Supports `content_type = 'post'`
- ✅ RLS policies configured

---

## 🚀 **Action Required: Deploy to Production**

The endpoints need to be deployed to `https://www.soundbridge.live` for the mobile app to work.

### **Deployment Steps:**

1. **Commit the new route files:**
   ```bash
   git add apps/web/app/api/social/bookmark/route.ts
   git add apps/web/app/api/social/bookmarks/route.ts
   git add apps/web/app/api/posts/saved/route.ts
   git commit -m "Add bookmark endpoints and saved posts endpoint"
   ```

2. **Deploy to production:**
   - Push to main branch (if auto-deploy)
   - Or deploy manually via your deployment platform

3. **Verify deployment:**
   ```bash
   # Test the endpoint
   curl -X POST https://www.soundbridge.live/api/social/bookmark \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"content_id":"test","content_type":"post"}'
   ```

   **Expected:** Should return JSON response (not 405)

---

## 📋 **Endpoints Summary**

### **1. Toggle Bookmark**
- **URL:** `POST /api/social/bookmark` or `POST /api/social/bookmarks`
- **Body:** `{ "content_id": "uuid", "content_type": "post" }`
- **Response:** `{ "success": true, "data": {...} }` or `{ "success": true, "data": null }`

### **2. Get Saved Posts (Profile Screen)**
- **URL:** `GET /api/posts/saved?page=1&limit=20`
- **Response:** 
```json
{
  "success": true,
  "data": [
    {
      "id": "post-uuid",
      "content": "Post content",
      "user_id": "author-uuid",
      "author": {
        "id": "author-uuid",
        "username": "username",
        "display_name": "Display Name",
        "avatar_url": "...",
        "role": "creator"
      },
      "saved_at": "2025-12-18T19:30:00Z",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "has_more": false
  }
}
```

### **3. Check Bookmark Status**
- **URL:** `GET /api/social/bookmark?content_id=uuid&content_type=post`
- **Response:** `{ "success": true, "data": true }` or `{ "success": true, "data": false }`

### **4. Get All Bookmarks**
- **URL:** `GET /api/social/bookmarks?content_type=post&limit=20&offset=0`
- **Response:** Array of bookmark objects

---

## 🔍 **Troubleshooting**

### **If Still Getting 405 After Deployment:**

1. **Check route file exists:**
   - Verify `apps/web/app/api/social/bookmark/route.ts` exists
   - Verify it exports `POST` function

2. **Check Next.js routing:**
   - Ensure file is in correct location: `app/api/social/bookmark/route.ts`
   - Not `app/api/social/bookmark.ts` (wrong)

3. **Check deployment logs:**
   - Look for build errors
   - Check if route files were included in deployment

4. **Test locally:**
   ```bash
   cd apps/web
   npm run dev
   # Test: POST http://localhost:3000/api/social/bookmark
   ```

---

## 📊 **Database Schema**

The `bookmarks` table already exists:

```sql
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event', 'post')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);
```

**RLS Policies:**
- ✅ Users can view all bookmarks
- ✅ Users can insert their own bookmarks
- ✅ Users can delete their own bookmarks

---

## ✅ **Verification Checklist**

After deployment:

- [ ] `POST /api/social/bookmark` returns 200 (not 405)
- [ ] `GET /api/posts/saved` returns saved posts
- [ ] Mobile app can save posts
- [ ] Mobile app can unsave posts
- [ ] Profile screen can display saved posts

---

**Status:** 🟡 **AWAITING DEPLOYMENT**  
**Priority:** 🔴 **HIGH** (blocking save feature)  
**ETA:** Deploy ASAP

---

**The code is ready - just needs to be deployed to production! 🚀**

