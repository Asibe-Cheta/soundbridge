# 📸 Profile Picture Upload - Quick Reference Card

**For:** Mobile Team  
**Status:** ✅ Ready to Integrate  
**Time:** ~2 hours

---

## 🚀 **One-Minute Overview**

```typescript
// 1. Pick image
const uri = await ImagePicker.launchImageLibraryAsync({...});

// 2. Upload
const formData = new FormData();
formData.append('file', { uri, type: 'image/jpeg', name: 'profile.jpg' });
formData.append('userId', userId);

const response = await fetch('https://soundbridge.vercel.app/api/upload/avatar', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData,
});

// 3. Get URL
const { url } = await response.json();
```

---

## 📍 **API Endpoint**

```
POST https://soundbridge.vercel.app/api/upload/avatar
```

---

## 📋 **Request**

**Headers:**
```
Authorization: Bearer {SUPABASE_JWT_TOKEN}
Content-Type: multipart/form-data
```

**Body (FormData):**
```
file: {File} - The image file
userId: {string} - User's UUID
```

---

## ✅ **Success Response (200)**

```json
{
  "success": true,
  "url": "https://aunxdbqukbxyyiusaeqi.supabase.co/storage/v1/object/public/avatars/...",
  "path": "avatars/..."
}
```

---

## ❌ **Error Responses**

```json
// 400 - Bad Request
{ "success": false, "error": "No file provided" }
{ "success": false, "error": "User ID required" }
{ "success": false, "error": "File must be an image" }
{ "success": false, "error": "File size must be less than 5MB" }

// 401 - Unauthorized
{ "success": false, "error": "Authentication required" }

// 500 - Internal Server Error
{ "success": false, "error": "Failed to upload avatar" }
```

---

## 📏 **Validation Rules**

| Rule | Value |
|------|-------|
| **Max Size** | 5 MB |
| **Formats** | JPEG, PNG, WebP, AVIF |
| **Recommended** | 400x400px, JPEG, 80% quality |

---

## 🔐 **Authentication**

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;
const userId = session.user.id;
```

---

## 💾 **Storage Details**

- **Provider:** Supabase Storage
- **Bucket:** `avatars`
- **Public:** Yes (images are publicly accessible)
- **CDN:** Supabase CDN
- **Auto-Update:** Profile table updated automatically

---

## 📦 **Required Packages**

```bash
npx expo install expo-image-picker
npx expo install expo-image-manipulator  # Optional: for compression
```

---

## 🎨 **Complete Component Example**

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export const ProfilePicture = () => {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      setUploading(true);

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Upload
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);
      formData.append('userId', session.user.id);

      const response = await fetch(
        'https://soundbridge.vercel.app/api/upload/avatar',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const data = await response.json();
      if (data.success) {
        setAvatarUrl(data.url);
      }
    } catch (error) {
      console.error(error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleUpload}
      disabled={uploading}
      style={{ width: 120, height: 120, borderRadius: 60 }}
    >
      {uploading ? (
        <ActivityIndicator />
      ) : avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 120, height: 120 }} />
      ) : (
        <Image source={require('./default-avatar.png')} />
      )}
    </TouchableOpacity>
  );
};
```

---

## 🧪 **Quick Test**

```typescript
// Test upload
const testUpload = async () => {
  const formData = new FormData();
  formData.append('file', {
    uri: 'file:///path/to/test.jpg',
    type: 'image/jpeg',
    name: 'test.jpg',
  } as any);
  formData.append('userId', 'your-user-id');

  const response = await fetch(
    'https://soundbridge.vercel.app/api/upload/avatar',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer your-token` },
      body: formData,
    }
  );

  const result = await response.json();
  console.log(result); // Should see { success: true, url: "..." }
};
```

---

## 🚨 **Common Errors & Fixes**

| Error | Fix |
|-------|-----|
| "No file provided" | Check FormData has 'file' field |
| "User ID required" | Check FormData has 'userId' field |
| "File must be an image" | Use image MIME type |
| "File size must be less than 5MB" | Compress image first |
| "Authentication required" | Check token is valid |
| Network error | Add retry logic |

---

## 🔄 **With Compression**

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

// Before upload
const compressed = await ImageManipulator.manipulateAsync(
  imageUri,
  [{ resize: { width: 400 } }],
  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
);

// Then upload compressed.uri instead of original
```

---

## 📊 **Performance Tips**

- ✅ Compress to 400x400px before upload
- ✅ Use JPEG with 80% quality
- ✅ Show loading indicator
- ✅ Cache URL locally
- ✅ Implement retry logic

---

## 🎯 **Checklist**

- [ ] Install expo-image-picker
- [ ] Copy upload function
- [ ] Add UI component
- [ ] Test with small image
- [ ] Add compression (recommended)
- [ ] Add error handling
- [ ] Add loading state
- [ ] Test edge cases

---

## 📚 **Full Documentation**

See: `MOBILE_TEAM_PROFILE_PICTURE_INTEGRATION.md`

---

## ⏱️ **Integration Time: ~2 hours**

**Questions?** Check the full documentation or contact the web team.

---

**Status:** ✅ Live & Ready  
**Last Updated:** October 16, 2025

