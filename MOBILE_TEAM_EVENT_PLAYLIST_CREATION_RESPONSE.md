# 📋 Mobile Team Response - Event & Playlist Creation Setup

**Date:** January 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Priority:** ✅ **READY FOR IMPLEMENTATION**

---

## 🎯 **EXECUTIVE SUMMARY**

✅ **Event Creation:** Backend is ready and updated with Bearer token authentication  
✅ **Playlist Creation:** New API endpoints created and ready  
✅ **Storage Buckets:** Configured and ready  
✅ **Categories:** Updated to support mobile app categories  

**Status:** ✅ **ALL SETUP COMPLETE - READY FOR MOBILE APP INTEGRATION**

---

## 1️⃣ **EVENT CREATION**

### ✅ **Backend Status: READY**

**Endpoint:** `POST /api/events`

**Authentication:** ✅ Bearer token authentication (updated)

**Storage Bucket:** ✅ `event-images` bucket exists and is configured

**RLS Policies:** ✅ Configured to allow authenticated users to create events

---

### 📡 **API Endpoint Details**

**Endpoint:** `POST https://www.soundbridge.live/api/events`

**Authentication:** Required (Bearer token)

**Request Headers:**
```typescript
{
  'Authorization': 'Bearer {access_token}',
  'Content-Type': 'application/json'
}
```

**Request Body:**
```typescript
{
  title: string;              // Required, max 255 chars
  description: string;        // Required
  event_date: string;         // Required, ISO 8601 format (e.g., "2025-01-15T18:00:00Z")
  location: string;           // Required
  venue?: string;             // Optional
  category: string;          // Required (see valid categories below)
  price_gbp?: number;        // Optional, must be >= 0
  price_ngn?: number;        // Optional, must be >= 0
  max_attendees?: number;    // Optional, must be >= 1
  image_url?: string;        // Optional, URL to image in event-images bucket
}
```

**Success Response (200 OK):**
```typescript
{
  success: true,
  event: {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    venue: string | null;
    category: string;
    price_gbp: number | null;
    price_ngn: number | null;
    max_attendees: number | null;
    image_url: string | null;
    creator_id: string;
    current_attendees: number;
    created_at: string;
    updated_at: string;
    creator: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      banner_url: string | null;
    }
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Authentication required | No valid Bearer token |
| 400 | `{field} is required` | Missing required field |
| 400 | Invalid category | Category not in valid list |
| 400 | Invalid event date | Date format invalid or in past |
| 400 | Invalid GBP price | Price must be >= 0 |
| 400 | Invalid NGN price | Price must be >= 0 |
| 400 | Invalid max attendees | Must be >= 1 |
| 500 | Failed to create event | Database error |

---

### ✅ **Valid Event Categories**

**Mobile App Categories (Supported):**
- `Music Concert`
- `Birthday Party`
- `Carnival`
- `Get Together`
- `Music Karaoke`
- `Comedy Night`
- `Gospel Concert`
- `Instrumental`
- `Jazz Room`
- `Workshop`
- `Conference`
- `Festival`
- `Other`

**Legacy Categories (Also Supported):**
- `Christian`, `Secular`, `Gospel`, `Hip-Hop`, `Afrobeat`, `Jazz`, `Classical`, `Rock`, `Pop`

---

### 📅 **Date/Time Format**

**Format:** ISO 8601 string

**Example:**
```typescript
// Combine date and time
const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);
const isoString = eventDateTime.toISOString(); // "2025-01-15T18:00:00.000Z"

// Send to API
{
  event_date: isoString
}
```

**Validation:**
- ✅ Must be valid ISO 8601 format
- ✅ Must be in the future (not in the past)
- ✅ Timezone: UTC (recommended) or local timezone

---

### 🖼️ **Image Upload**

**Storage Bucket:** `event-images`

**Bucket Configuration:**
- ✅ Public bucket (images are publicly accessible)
- ✅ Max file size: 5MB
- ✅ Allowed types: JPEG, JPG, PNG, WebP, AVIF
- ✅ Upload permissions: Authenticated users can upload

**Upload Process:**

1. **Upload image to Supabase Storage:**
```typescript
const fileName = `event-${Date.now()}.jpg`;
const { data, error } = await supabase.storage
  .from('event-images')
  .upload(fileName, blob, {
    contentType: 'image/jpeg',
  });

if (error) {
  // Handle error
  return;
}

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('event-images')
  .getPublicUrl(fileName);

// Use publicUrl in event creation
const imageUrl = publicUrl;
```

2. **Include image_url in event creation:**
```typescript
{
  ...eventData,
  image_url: imageUrl  // Optional
}
```

**Note:** Image upload is optional. You can create events without images.

---

### 🔧 **Mobile App Implementation**

**Update `CreateEventScreen.tsx`:**

1. **Use API endpoint instead of direct Supabase:**
```typescript
const handleSubmit = async () => {
  if (!validateForm()) return;

  setLoading(true);
  try {
    // Combine date and time
    const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);
    
    // Prepare request body
    const eventData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      event_date: eventDateTime.toISOString(),
      location: formData.location.trim(),
      venue: formData.venue.trim() || undefined,
      category: formData.category,
      price_gbp: formData.price_gbp ? parseFloat(formData.price_gbp) : undefined,
      price_ngn: formData.price_ngn ? parseFloat(formData.price_ngn) : undefined,
      max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : undefined,
      image_url: formData.image_url || undefined,
    };

    // Get access token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Call API endpoint
    const response = await fetch('https://www.soundbridge.live/api/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create event');
    }

    Alert.alert(
      'Success!',
      'Your event has been created successfully!',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  } catch (error) {
    console.error('Error creating event:', error);
    Alert.alert('Error', error.message || 'Failed to create event. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

2. **Update ProfileScreen to navigate:**
```typescript
// Replace "Coming Soon" alert with navigation
<TouchableOpacity
  onPress={() => navigation.navigate('CreateEvent')}
  // ... rest of props
>
  <Text>Create Event</Text>
</TouchableOpacity>
```

---

## 2️⃣ **PLAYLIST CREATION**

### ✅ **Backend Status: READY**

**Endpoints Created:**
- ✅ `POST /api/playlists` - Create playlist
- ✅ `POST /api/playlists/[id]/tracks` - Add tracks to playlist
- ✅ `DELETE /api/playlists/[id]/tracks?track_id={id}` - Remove track from playlist

**Authentication:** ✅ Bearer token authentication

**RLS Policies:** ✅ Configured (playlists table exists)

---

### 📡 **API Endpoint Details**

#### **1. Create Playlist**

**Endpoint:** `POST https://www.soundbridge.live/api/playlists`

**Authentication:** Required (Bearer token)

**Request Headers:**
```typescript
{
  'Authorization': 'Bearer {access_token}',
  'Content-Type': 'application/json'
}
```

**Request Body:**
```typescript
{
  name: string;              // Required, max 255 chars
  description?: string;      // Optional, max 5000 chars
  is_public?: boolean;       // Optional, defaults to true
  cover_image_url?: string;  // Optional, URL to cover image
}
```

**Success Response (200 OK):**
```typescript
{
  success: true,
  playlist: {
    id: string;
    creator_id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    is_public: boolean;
    tracks_count: number;
    total_duration: number;
    followers_count: number;
    created_at: string;
    updated_at: string;
    creator: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    }
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Authentication required | No valid Bearer token |
| 400 | Playlist name is required | Missing name field |
| 400 | Playlist name must be 255 characters or less | Name too long |
| 400 | Description must be 5000 characters or less | Description too long |
| 500 | Failed to create playlist | Database error |

---

#### **2. Add Tracks to Playlist**

**Endpoint:** `POST https://www.soundbridge.live/api/playlists/{playlistId}/tracks`

**Authentication:** Required (Bearer token)

**Request Headers:**
```typescript
{
  'Authorization': 'Bearer {access_token}',
  'Content-Type': 'application/json'
}
```

**Request Body (Single Track):**
```typescript
{
  track_id: string;          // Required
  position?: number;          // Optional, defaults to end of playlist
}
```

**Request Body (Multiple Tracks):**
```typescript
{
  track_ids: string[];       // Required, array of track IDs
  position?: number;         // Optional, defaults to end of playlist
}
```

**Success Response (200 OK):**
```typescript
{
  success: true,
  tracks: [
    {
      id: string;
      playlist_id: string;
      track_id: string;
      position: number;
      added_at: string;
    }
  ],
  message: "Added {count} track(s) to playlist"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Authentication required | No valid Bearer token |
| 403 | Unauthorized | Not playlist owner |
| 404 | Playlist not found | Invalid playlist ID |
| 400 | At least one track_id is required | Missing track_id(s) |
| 400 | One or more tracks not found | Invalid track ID(s) |
| 400 | One or more tracks are already in this playlist | Duplicate tracks |

---

#### **3. Remove Track from Playlist**

**Endpoint:** `DELETE https://www.soundbridge.live/api/playlists/{playlistId}/tracks?track_id={trackId}`

**Authentication:** Required (Bearer token)

**Success Response (200 OK):**
```typescript
{
  success: true,
  message: "Track removed from playlist"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Authentication required | No valid Bearer token |
| 403 | Unauthorized | Not playlist owner |
| 404 | Playlist not found | Invalid playlist ID |
| 400 | track_id query parameter is required | Missing track_id |

---

### 📋 **Playlist Fields**

**Required Fields:**
- ✅ `name` (string, max 255 chars)

**Optional Fields:**
- `description` (string, max 5000 chars)
- `is_public` (boolean, defaults to `true`)
- `cover_image_url` (string, URL to cover image)

**Auto-Generated Fields:**
- `tracks_count` (defaults to 0)
- `total_duration` (defaults to 0)
- `followers_count` (defaults to 0)
- `created_at`, `updated_at` (timestamps)

---

### 🖼️ **Cover Image Upload**

**Storage Bucket:** `playlist-covers` (if you want to create one) OR use `cover-art` bucket

**Recommendation:** Use existing `cover-art` bucket for consistency

**Upload Process:** Same as event images (see Event Creation section)

**Note:** Cover image is optional. Playlists can be created without cover images.

---

### 🔧 **Mobile App Implementation**

**Create `CreatePlaylistScreen.tsx`:**

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function CreatePlaylistScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Playlist name is required');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('https://www.soundbridge.live/api/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          is_public: isPublic,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create playlist');
      }

      Alert.alert(
        'Success!',
        'Playlist created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', error.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {/* Form fields */}
      <TextInput
        placeholder="Playlist Name"
        value={name}
        onChangeText={setName}
        maxLength={255}
      />
      <TextInput
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={5000}
      />
      {/* Public/Private toggle */}
      <TouchableOpacity onPress={handleCreate} disabled={loading}>
        <Text>Create Playlist</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Add tracks to playlist:**
```typescript
const addTracksToPlaylist = async (playlistId: string, trackIds: string[]) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `https://www.soundbridge.live/api/playlists/${playlistId}/tracks`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        track_ids: trackIds,
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to add tracks');
  }

  return result;
};
```

**Update ProfileScreen to navigate:**
```typescript
<TouchableOpacity
  onPress={() => navigation.navigate('CreatePlaylist')}
  // ... rest of props
>
  <Text>Create Playlist</Text>
</TouchableOpacity>
```

---

## 3️⃣ **VALIDATION RULES**

### **Event Creation:**

- ✅ `title`: Required, string, max 255 chars
- ✅ `description`: Required, string
- ✅ `event_date`: Required, ISO 8601 format, must be in future
- ✅ `location`: Required, string
- ✅ `venue`: Optional, string
- ✅ `category`: Required, must be in valid categories list
- ✅ `price_gbp`: Optional, number >= 0
- ✅ `price_ngn`: Optional, number >= 0
- ✅ `max_attendees`: Optional, integer >= 1
- ✅ `image_url`: Optional, string (URL)

### **Playlist Creation:**

- ✅ `name`: Required, string, max 255 chars
- ✅ `description`: Optional, string, max 5000 chars
- ✅ `is_public`: Optional, boolean (defaults to `true`)
- ✅ `cover_image_url`: Optional, string (URL)

### **Adding Tracks:**

- ✅ `track_id` or `track_ids`: Required
- ✅ `position`: Optional, integer (defaults to end)
- ✅ Tracks must exist in `audio_tracks` table
- ✅ Cannot add duplicate tracks to same playlist

---

## 4️⃣ **LIMITS & RESTRICTIONS**

### **Event Creation:**

- ✅ No creation limits per user
- ✅ No subscription tier restrictions
- ✅ Max attendees: No limit (database constraint)

### **Playlist Creation:**

- ✅ No creation limits per user
- ✅ No subscription tier restrictions
- ✅ Track limit per playlist: No limit (database constraint)
- ✅ Name length: Max 255 characters
- ✅ Description length: Max 5000 characters
- ✅ Duplicate names: Allowed (same user can have multiple playlists with same name)

---

## 5️⃣ **TESTING INSTRUCTIONS**

### **Event Creation:**

1. **Test with valid data:**
```bash
POST /api/events
Authorization: Bearer {token}
{
  "title": "Test Event",
  "description": "Test description",
  "event_date": "2025-12-31T18:00:00Z",
  "location": "London, UK",
  "category": "Music Concert"
}
```

2. **Test with missing required field:**
```bash
POST /api/events
{
  "title": "Test Event"
  // Missing description, event_date, location, category
}
# Should return 400 with field-specific error
```

3. **Test with invalid category:**
```bash
POST /api/events
{
  "category": "Invalid Category"
}
# Should return 400 with valid categories list
```

4. **Test with past date:**
```bash
POST /api/events
{
  "event_date": "2020-01-01T00:00:00Z"
}
# Should return 400 "Event date cannot be in the past"
```

### **Playlist Creation:**

1. **Test with valid data:**
```bash
POST /api/playlists
Authorization: Bearer {token}
{
  "name": "My Playlist",
  "description": "Test playlist",
  "is_public": true
}
```

2. **Test with missing name:**
```bash
POST /api/playlists
{
  "description": "Test"
}
# Should return 400 "Playlist name is required"
```

3. **Test adding tracks:**
```bash
POST /api/playlists/{playlistId}/tracks
Authorization: Bearer {token}
{
  "track_ids": ["track-id-1", "track-id-2"]
}
```

---

## 6️⃣ **SUMMARY**

### ✅ **What's Ready:**

1. ✅ Event creation endpoint (`POST /api/events`) - Updated with Bearer token auth
2. ✅ Playlist creation endpoint (`POST /api/playlists`) - **NEW**
3. ✅ Add tracks endpoint (`POST /api/playlists/[id]/tracks`) - **NEW**
4. ✅ Remove tracks endpoint (`DELETE /api/playlists/[id]/tracks`) - **NEW**
5. ✅ Event categories updated to support mobile app categories
6. ✅ Storage buckets configured (`event-images`, `cover-art`)
7. ✅ RLS policies configured
8. ✅ CORS headers configured for mobile app

### 📝 **What Mobile Team Needs to Do:**

1. ✅ Update `CreateEventScreen.tsx` to use API endpoint
2. ✅ Update `ProfileScreen.tsx` to navigate to CreateEvent instead of showing alert
3. ✅ Create `CreatePlaylistScreen.tsx`
4. ✅ Update `ProfileScreen.tsx` to navigate to CreatePlaylist instead of showing alert
5. ✅ Add navigation routes in `App.tsx`
6. ✅ Test end-to-end functionality

---

## 7️⃣ **NEXT STEPS**

1. **Mobile Team:** Review this documentation
2. **Mobile Team:** Implement API calls in screens
3. **Mobile Team:** Test event creation
4. **Mobile Team:** Test playlist creation
5. **Both Teams:** Verify end-to-end functionality
6. **Both Teams:** Deploy and test in production

---

## 📞 **SUPPORT**

If you encounter any issues:

1. Check error response for details
2. Verify Bearer token is valid and not expired
3. Verify all required fields are provided
4. Check category values match valid list
5. Verify date format is ISO 8601

**Questions?** Please provide:
- Exact error message
- Request body (sanitized)
- Response status code
- Response body

---

**Status:** ✅ **COMPLETE - READY FOR IMPLEMENTATION**  
**Last Updated:** January 2025  
**Next Steps:** Mobile team to implement and test

