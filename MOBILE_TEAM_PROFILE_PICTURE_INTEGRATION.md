# 📸 Profile Picture Upload Integration Guide

**From:** Web App Team  
**To:** Mobile Team  
**Date:** October 16, 2025  
**Status:** ✅ **READY FOR INTEGRATION**

---

## 🎯 **Overview**

The web app uses **Supabase Storage** (not Cloudinary) for profile picture uploads. This guide provides all the details you need to implement profile picture uploads in the mobile app with the same functionality as the web app.

---

## 🔌 **API Endpoint**

### **Primary Endpoint: `/api/upload/avatar`**

```
POST https://soundbridge.vercel.app/api/upload/avatar
```

This is the **recommended endpoint** for mobile app integration.

### **Alternative Endpoint: `/api/profile/upload-image`**

```
POST https://soundbridge.vercel.app/api/profile/upload-image
```

This endpoint uses cookie-based authentication (used by web app). The primary endpoint is better for mobile apps.

---

## 📦 **Request Format**

### **Headers**
```http
Content-Type: multipart/form-data
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
```

### **Form Data Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ Yes | The image file to upload |
| `userId` | string | ✅ Yes | The authenticated user's ID (UUID) |

### **Example Request (React Native)**

```typescript
const uploadProfilePicture = async (imageUri: string, userId: string, token: string) => {
  try {
    const formData = new FormData();
    
    // Append the image file
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg', // or 'image/png'
      name: 'profile.jpg',
    } as any);
    
    // Append the user ID
    formData.append('userId', userId);

    const response = await fetch('https://soundbridge.vercel.app/api/upload/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Note: Don't set Content-Type header - FormData will set it automatically
      },
      body: formData,
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw error;
  }
};
```

---

## ✅ **Success Response**

**Status Code:** `200 OK`

```json
{
  "success": true,
  "url": "https://aunxdbqukbxyyiusaeqi.supabase.co/storage/v1/object/public/avatars/bd8a455d-a54d-45c5-968d-e4cf5e8d928e-1729123456789.jpg",
  "path": "avatars/bd8a455d-a54d-45c5-968d-e4cf5e8d928e-1729123456789.jpg"
}
```

### **Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` on success |
| `url` | string | **Public URL** of the uploaded avatar (use this to display) |
| `path` | string | Storage path (for internal reference) |

**Important:** The `profiles` table is **automatically updated** with the new `avatar_url` by the API endpoint.

---

## ❌ **Error Responses**

### **400 Bad Request**

```json
{
  "success": false,
  "error": "No file provided"
}
```

**Common Causes:**
- Missing `file` field in form data
- Missing `userId` field in form data
- Invalid file type (not an image)
- File size exceeds 5MB limit

### **401 Unauthorized**

```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Cause:** Invalid or missing authorization token

### **500 Internal Server Error**

```json
{
  "success": false,
  "error": "Failed to upload avatar"
}
```

**Causes:**
- Supabase storage service issue
- Database update error
- Network connectivity issue

---

## 📋 **Image Requirements**

### **File Validation**

| Requirement | Value | Notes |
|-------------|-------|-------|
| **Max File Size** | 5 MB | Hard limit enforced by API |
| **Allowed Formats** | JPEG, JPG, PNG, WebP, AVIF | Validated by MIME type |
| **Recommended Dimensions** | 400x400 px | For optimal display quality |
| **Aspect Ratio** | Square (1:1) | Recommended but not enforced |

### **Supported MIME Types**

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`
- `image/avif`

---

## 🗄️ **Storage Architecture**

### **Supabase Storage Bucket**

- **Bucket Name:** `avatars`
- **Public Access:** ✅ Yes (images are publicly readable)
- **File Naming:** `{userId}-{timestamp}.{ext}`
- **Example Path:** `avatars/bd8a455d-a54d-45c5-968d-e4cf5e8d928e-1729123456789.jpg`

### **Automatic Features**

✅ **Automatic Profile Update:** The API automatically updates the `profiles.avatar_url` field  
✅ **Unique Filenames:** Files are named with user ID + timestamp to prevent collisions  
✅ **CDN Delivery:** Images are served via Supabase CDN for fast global access  
✅ **Upsert Disabled:** Each upload creates a new file (old files remain for cache)

---

## 🔒 **Authentication**

### **Getting the User Token**

```typescript
import { supabase } from '@/lib/supabase';

// Get the current session
const { data: { session }, error } = await supabase.auth.getSession();

if (session) {
  const token = session.access_token;
  const userId = session.user.id;
  
  // Use these for the upload
  await uploadProfilePicture(imageUri, userId, token);
}
```

### **Token Requirements**

- Must be a valid Supabase JWT token
- Must be from an authenticated user
- Token is validated server-side

---

## 📱 **Complete Mobile Implementation Example**

### **Step 1: Image Picker**

```typescript
import * as ImagePicker from 'expo-image-picker';

const pickProfilePicture = async () => {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Permission to access camera roll is required!');
    return null;
  }

  // Launch image picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1], // Square crop
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }
  
  return null;
};
```

### **Step 2: Upload Function**

```typescript
interface UploadAvatarResponse {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

const uploadProfilePicture = async (
  imageUri: string,
  userId: string,
  token: string
): Promise<UploadAvatarResponse> => {
  try {
    const formData = new FormData();
    
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);
    
    formData.append('userId', userId);

    const response = await fetch(
      'https://soundbridge.vercel.app/api/upload/avatar',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const result: UploadAvatarResponse = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

### **Step 3: UI Component with Loading State**

```typescript
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, ActivityIndicator, Text } from 'react-native';

const ProfilePictureUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      setUploading(true);

      // Step 1: Pick image
      const imageUri = await pickProfilePicture();
      if (!imageUri) return;

      // Step 2: Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to upload a profile picture');
        return;
      }

      // Step 3: Upload
      const result = await uploadProfilePicture(
        imageUri,
        session.user.id,
        session.access_token
      );

      // Step 4: Update UI
      if (result.success && result.url) {
        setAvatarUrl(result.url);
        alert('Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ alignItems: 'center', padding: 20 }}>
      <TouchableOpacity
        onPress={handleUpload}
        disabled={uploading}
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: '#e0e0e0',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {uploading ? (
          <ActivityIndicator size="large" color="#0066cc" />
        ) : avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={{ color: '#666' }}>Tap to Upload</Text>
        )}
      </TouchableOpacity>
      
      {uploading && (
        <Text style={{ marginTop: 10, color: '#666' }}>
          Uploading...
        </Text>
      )}
    </View>
  );
};

export default ProfilePictureUpload;
```

---

## 🔄 **Image Compression (Recommended)**

To optimize upload speed and reduce bandwidth, compress images before uploading:

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

const compressImage = async (uri: string): Promise<string> => {
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  return manipResult.uri;
};

// Usage in upload function
const imageUri = await pickProfilePicture();
if (imageUri) {
  const compressedUri = await compressImage(imageUri);
  await uploadProfilePicture(compressedUri, userId, token);
}
```

---

## 🧪 **Testing Guide**

### **Test Cases**

| Test Case | Expected Result |
|-----------|----------------|
| Upload JPEG image (< 5MB) | ✅ Success |
| Upload PNG image (< 5MB) | ✅ Success |
| Upload WebP image (< 5MB) | ✅ Success |
| Upload image > 5MB | ❌ Error: "File size must be less than 5MB" |
| Upload non-image file | ❌ Error: "File must be an image" |
| Upload without token | ❌ Error: "Authentication required" |
| Upload without userId | ❌ Error: "User ID required" |

### **Test Script**

```typescript
// Test 1: Valid upload
const testValidUpload = async () => {
  const testImageUri = 'file:///path/to/test-image.jpg';
  const result = await uploadProfilePicture(testImageUri, userId, token);
  console.log('✅ Test 1 passed:', result.success === true);
};

// Test 2: File too large (simulate)
const testLargeFile = async () => {
  // Create or use a > 5MB image
  try {
    await uploadProfilePicture(largeImageUri, userId, token);
    console.log('❌ Test 2 failed: Should have thrown error');
  } catch (error) {
    console.log('✅ Test 2 passed: Correctly rejected large file');
  }
};

// Test 3: Missing authentication
const testNoAuth = async () => {
  try {
    await uploadProfilePicture(imageUri, userId, '');
    console.log('❌ Test 3 failed: Should have thrown error');
  } catch (error) {
    console.log('✅ Test 3 passed: Correctly rejected unauthorized request');
  }
};
```

---

## 🚀 **Performance Optimization**

### **Best Practices**

1. **Compress Before Upload**
   - Resize to 400x400px maximum
   - Use 80% JPEG quality
   - This reduces upload time by ~70%

2. **Show Progress Indicator**
   - Display loading spinner during upload
   - Disable upload button while in progress
   - Provide user feedback

3. **Cache Avatar URLs**
   - Store avatar URL locally after upload
   - Use cached URL for immediate display
   - Reduces API calls

4. **Error Retry Logic**
   - Implement exponential backoff for network errors
   - Max 3 retry attempts
   - Show clear error messages

### **Example with Retry Logic**

```typescript
const uploadWithRetry = async (
  imageUri: string,
  userId: string,
  token: string,
  maxRetries: number = 3
): Promise<UploadAvatarResponse> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadProfilePicture(imageUri, userId, token);
    } catch (error) {
      lastError = error as Error;
      console.log(`Upload attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  throw lastError;
};
```

---

## 🔗 **Integration with Existing Profile System**

### **Database Update**

The API automatically updates:

```sql
UPDATE profiles
SET avatar_url = 'https://...'
WHERE id = '{userId}';
```

### **Fetching Updated Profile**

After successful upload, refresh the user profile:

```typescript
const refreshProfile = async (userId: string) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (profile) {
    // Update your local state with new avatar_url
    console.log('New avatar URL:', profile.avatar_url);
  }
};
```

---

## 📊 **Summary**

| Feature | Web App | Mobile App (To Implement) |
|---------|---------|---------------------------|
| Storage Provider | Supabase Storage | ✅ Same (Supabase Storage) |
| API Endpoint | `/api/upload/avatar` | ✅ Same |
| Max File Size | 5 MB | ✅ Same |
| Supported Formats | JPEG, PNG, WebP, AVIF | ✅ Same |
| Authentication | Supabase JWT | ✅ Same |
| Auto Profile Update | ✅ Yes | ✅ Yes |

---

## 🎯 **Quick Start Checklist**

- [ ] Install `expo-image-picker` for image selection
- [ ] Install `expo-image-manipulator` for compression (optional but recommended)
- [ ] Copy the `uploadProfilePicture` function to your codebase
- [ ] Copy the `ProfilePictureUpload` component
- [ ] Test with a small JPEG image (< 1MB)
- [ ] Test with a 5MB+ image (should fail)
- [ ] Test without authentication (should fail)
- [ ] Implement image compression before upload
- [ ] Add retry logic for network errors
- [ ] Update UI to show loading/success/error states

---

## 💬 **Questions & Support**

If you have any questions or encounter issues:

1. Check the error response for specific error messages
2. Verify your Supabase token is valid and not expired
3. Ensure the `userId` matches the authenticated user
4. Test with the web app first to rule out backend issues
5. Contact the web team for assistance

---

## 📅 **Implementation Timeline**

| Task | Estimated Time |
|------|----------------|
| Setup image picker | 15 minutes |
| Implement upload function | 30 minutes |
| Add UI component | 30 minutes |
| Add compression | 15 minutes |
| Testing | 30 minutes |
| **Total** | **2 hours** |

---

**Status:** ✅ Ready for mobile team integration  
**Web App Endpoint:** Live and tested  
**Documentation:** Complete  
**Support:** Available for questions

Good luck with the integration! 🚀

