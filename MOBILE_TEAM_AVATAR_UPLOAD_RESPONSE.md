# 📱 Mobile Team - Avatar Upload Endpoint Response

**Date:** December 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Subject:** `/api/upload/avatar` Endpoint Specifications  
**Status:** ✅ **COMPLETE RESPONSE**

---

## 🎯 **QUICK ANSWER**

The issue is the **field name**. The endpoint expects `userId` (camelCase), but you're sending `user_id` (snake_case).

**Fix:**
```typescript
// ❌ Wrong
formData.append('user_id', user.id);

// ✅ Correct
formData.append('userId', user.id);
```

---

## ✅ **COMPLETE ENDPOINT SPECIFICATIONS**

### **1. User ID Field Name** ✅

**Answer:** `userId` (camelCase)

- ✅ **Correct:** `userId` (camelCase)
- ❌ **Wrong:** `user_id` (snake_case)
- ❌ **Wrong:** `user-id` (kebab-case)

**Note:** The endpoint does NOT extract user ID from the session token automatically. You must include it in FormData.

---

### **2. Request Format** ✅

**Endpoint:** `POST /api/upload/avatar`

**Headers:**
```typescript
{
  'Authorization': `Bearer ${session.access_token}`,  // Required
  // DO NOT set Content-Type manually - let fetch set it automatically
  // Setting it manually will break multipart/form-data boundary
}
```

**FormData Fields:**
```typescript
{
  file: File,        // Required - The image file
  userId: string     // Required - User's UUID (camelCase!)
}
```

**Complete Example:**
```typescript
const formData = new FormData();
formData.append('file', {
  uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
  name: `avatar_${Date.now()}.jpg`,
  type: 'image/jpeg',
} as any);
formData.append('userId', user.id); // ✅ camelCase!

const response = await fetch(`${API_BASE_URL}/api/upload/avatar`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    // DO NOT include Content-Type - fetch will set it automatically
  },
  body: formData,
});
```

---

### **3. Response Format** ✅

**Success Response (200):**
```json
{
  "success": true,
  "url": "https://aunxdbqukbxyyiusaeqi.supabase.co/storage/v1/object/public/avatars/user-id-timestamp.jpg",
  "path": "avatars/user-id-timestamp.jpg"
}
```

**Answer:** The avatar URL is in the `url` field (top level, not nested).

**Usage:**
```typescript
const data = await response.json();
if (data.success) {
  const avatarUrl = data.url; // ✅ Direct access
  // Update your UI with avatarUrl
}
```

**Error Responses:**

```json
// 400 - Bad Request
{
  "success": false,
  "error": "User ID required"
}

{
  "success": false,
  "error": "No file provided"
}

{
  "success": false,
  "error": "File must be an image"
}

{
  "success": false,
  "error": "File size must be less than 5MB"
}

// 500 - Internal Server Error
{
  "success": false,
  "error": "Failed to upload avatar"
}

{
  "success": false,
  "error": "Failed to update profile with avatar URL"
}
```

---

### **4. File Specifications** ✅

| Specification | Value |
|--------------|-------|
| **Max File Size** | 5 MB |
| **Allowed MIME Types** | Any `image/*` type (JPEG, PNG, WebP, AVIF, GIF, etc.) |
| **Max Dimensions** | No limit (but recommended: 400x400px) |
| **Recommended** | 400x400px, JPEG, 80% quality |

**Validation:**
- ✅ File type must start with `image/`
- ✅ File size must be ≤ 5MB
- ✅ File is automatically uploaded to Supabase Storage
- ✅ Profile is automatically updated with the new avatar URL

---

### **5. Authentication** ✅

**Answer:** User ID must be in FormData (not extracted from token)

- ✅ **Required:** User ID in FormData as `userId`
- ✅ **Required:** Authorization header with Bearer token
- ❌ **Not Supported:** Automatic extraction from session token

**Why?** The endpoint uses a service role client and doesn't parse the session token for user ID. This allows for flexibility and explicit user identification.

---

## 🔧 **CORRECTED IMPLEMENTATION**

```typescript
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

const uploadAvatar = async () => {
  try {
    // 1. Get session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // 2. Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    // 3. Prepare FormData
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' 
        ? asset.uri.replace('file://', '') 
        : asset.uri,
      name: `avatar_${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);
    
    // ✅ CORRECT: Use camelCase 'userId'
    formData.append('userId', session.user.id);

    // 4. Upload
    const response = await fetch(
      'https://www.soundbridge.live/api/upload/avatar',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // DO NOT set Content-Type - fetch handles it
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Upload failed');
    }

    // 5. Get URL
    const avatarUrl = data.url; // ✅ Direct access to 'url' field
    console.log('Avatar uploaded:', avatarUrl);

    return avatarUrl;
  } catch (error) {
    console.error('Avatar upload error:', error);
    throw error;
  }
};
```

---

## 📋 **CHECKLIST FOR MOBILE TEAM**

- [x] Use `userId` (camelCase) in FormData
- [x] Use `file` as the field name for the image
- [x] Include Authorization header with Bearer token
- [x] Do NOT set Content-Type header manually
- [x] Access avatar URL from `data.url` (top level)
- [x] Handle error responses with `data.error`
- [x] Validate file size (max 5MB)
- [x] Validate file type (must be image)

---

## 🐛 **TROUBLESHOOTING**

### **Error: "User ID required"**

**Cause:** Field name is wrong or missing.

**Fix:**
```typescript
// ❌ Wrong
formData.append('user_id', user.id);

// ✅ Correct
formData.append('userId', user.id);
```

---

### **Error: "No file provided"**

**Cause:** File field is missing or incorrectly named.

**Fix:**
```typescript
// ✅ Correct
formData.append('file', {
  uri: asset.uri,
  name: 'avatar.jpg',
  type: 'image/jpeg',
} as any);
```

---

### **Error: Network or CORS issues**

**Cause:** Content-Type header set manually.

**Fix:**
```typescript
// ❌ Wrong - Don't set Content-Type
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'multipart/form-data', // ❌ This breaks it!
}

// ✅ Correct - Let fetch set it automatically
headers: {
  'Authorization': `Bearer ${token}`,
  // Content-Type is set automatically by fetch
}
```

---

## 📊 **COMPARISON: What Changed**

| Aspect | Your Current Code | Correct Code |
|--------|------------------|--------------|
| **User ID Field** | `user_id` (snake_case) | `userId` (camelCase) |
| **File Field** | `file` ✅ | `file` ✅ |
| **Authorization** | ✅ Correct | ✅ Correct |
| **Content-Type** | Not set ✅ | Not set ✅ |
| **Response URL** | `data.url` ✅ | `data.url` ✅ |

**Only change needed:** `user_id` → `userId`

---

## 🎯 **QUICK FIX**

Replace this line in your code:

```typescript
// Before
formData.append('user_id', user.id);

// After
formData.append('userId', user.id);
```

That's it! The rest of your implementation is correct.

---

## 📚 **ADDITIONAL RESOURCES**

- **Full Documentation:** `PROFILE_PICTURE_QUICK_REFERENCE.md`
- **Integration Guide:** `MOBILE_TEAM_PROFILE_PICTURE_INTEGRATION.md`
- **Endpoint Source:** `apps/web/app/api/upload/avatar/route.ts`

---

## ✅ **NEXT STEPS**

1. ✅ Update `ProfileScreen.tsx` to use `userId` instead of `user_id`
2. ✅ Test the avatar upload functionality
3. ✅ Verify the avatar URL is displayed correctly
4. ✅ Update your documentation with the correct field name

---

## 🧪 **TEST REQUEST**

After making the change, test with:

```typescript
const formData = new FormData();
formData.append('file', {
  uri: testImageUri,
  name: 'test.jpg',
  type: 'image/jpeg',
} as any);
formData.append('userId', testUserId); // ✅ camelCase

const response = await fetch('https://www.soundbridge.live/api/upload/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${testToken}`,
  },
  body: formData,
});

const result = await response.json();
console.log(result); // Should see { success: true, url: "..." }
```

---

**Status:** ✅ **READY TO INTEGRATE**  
**Last Updated:** December 2025  
**Web Team**

---

**Questions?** Contact the web team or refer to the source code at `apps/web/app/api/upload/avatar/route.ts`
