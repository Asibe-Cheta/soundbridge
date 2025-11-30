# 📱 Mobile Team - Upload Storage Buckets & Upload Flow Reference

**Date:** November 29, 2025  
**Version:** 1.0  
**Status:** ✅ **COMPLETE RESPONSE**

---

## 🎯 **QUICK ANSWER SUMMARY**

1. **Bucket Names:** Use `audio-tracks`, `cover-art`, `profile-images`, `event-images` (NOT `audio-files`, `artwork`, `avatars`)
2. **Upload Method:** ✅ **Direct Supabase Storage uploads** (your current approach is correct)
3. **File Path:** `${userId}/${timestamp}_${filename}` format is acceptable
4. **Track Creation:** Use direct Supabase client insert (your current approach is correct)

---

## 1. ✅ **STORAGE BUCKET NAMES**

### **Correct Bucket Names:**

| Purpose | ✅ Correct Bucket Name | ❌ Incorrect (Don't Use) |
|---------|------------------------|--------------------------|
| Audio files (tracks/podcasts) | `audio-tracks` | `audio-files` |
| Cover artwork/album art | `cover-art` | `artwork` |
| User avatars/profile pictures | `profile-images` | `avatars` (legacy, still exists but use `profile-images`) |
| Event images | `event-images` | ✅ Correct |
| Post images/attachments | `post-attachments` | N/A |

### **Bucket Configuration:**

```typescript
// ✅ CORRECT - Use these bucket names
const BUCKETS = {
  AUDIO: 'audio-tracks',
  COVER_ART: 'cover-art',
  PROFILE_IMAGES: 'profile-images',
  EVENT_IMAGES: 'event-images',
  POST_ATTACHMENTS: 'post-attachments'
};
```

---

## 2. ✅ **UPLOAD METHOD**

### **Your Current Approach is CORRECT! ✅**

**Option C (Combination) is the recommended approach:**

1. ✅ Upload file directly to Supabase Storage using `supabase.storage.from('bucket-name').upload()`
2. ✅ Get the public URL from storage
3. ✅ Create record in `audio_tracks` table via Supabase client

**You do NOT need to use API endpoints** (`/api/tracks/upload`, etc.) - direct storage uploads are the standard approach.

### **Example Implementation:**

```typescript
// ✅ CORRECT - Direct storage upload
const uploadAudio = async (file: File, userId: string) => {
  // 1. Upload to storage
  const fileName = `${userId}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('audio-tracks')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // 2. Get public URL
  const { data: urlData } = await supabase.storage
    .from('audio-tracks')
    .getPublicUrl(fileName);

  // 3. Create database record
  const { data: track, error: dbError } = await supabase
    .from('audio_tracks')
    .insert({
      creator_id: userId,
      title: 'My Track',
      file_url: urlData.publicUrl,
      // ... other fields
    })
    .select()
    .single();

  return { track, url: urlData.publicUrl };
};
```

---

## 3. ✅ **FILE PATH STRUCTURE**

### **Accepted Path Format:**

Your current format is **acceptable and matches the web app**:

```typescript
// ✅ CORRECT - Your current format
const audioPath = `${userId}/${timestamp}_${filename}`;
const imagePath = `${userId}/${folder}/${timestamp}_${filename}`;
```

### **Examples:**

**Audio Files:**
```
295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce/1735123456789-track.mp3
295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce/1735123456789_my-song.mp3
```

**Cover Art:**
```
295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce/1735123456789-cover.jpg
295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce/cover-art/1735123456789_album-art.jpg
```

**Profile Images:**
```
295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce/1735123456789-avatar.jpg
```

### **Path Structure Rules:**

- ✅ Must start with `userId/` (for RLS policies to work)
- ✅ Use timestamp for uniqueness: `Date.now()` or `Date.now()_`
- ✅ Include original filename or sanitized version
- ✅ Use forward slashes `/` for path separators
- ✅ Optional subfolders are allowed (e.g., `userId/cover-art/filename`)

---

## 4. 📋 **TRACK CREATION FIELDS**

### **Required Fields:**

```typescript
{
  creator_id: string,      // ✅ REQUIRED - Current user's ID
  title: string,            // ✅ REQUIRED - Track title
  file_url: string          // ✅ REQUIRED - Public URL from storage upload
}
```

### **Optional Fields:**

```typescript
{
  description?: string | null,
  cover_art_url?: string | null,
  artwork_url?: string | null,        // Also accepted (for compatibility)
  duration?: number | null,            // In seconds
  tags?: string[] | null,
  is_public?: boolean,                // Default: true
  genre?: string | null,
  lyrics?: string | null,
  lyrics_language?: string | null,   // Default: 'en'
  has_lyrics?: boolean,
  
  // Audio quality fields (optional, auto-set if not provided)
  audio_quality?: string,             // Default: 'standard'
  bitrate?: number,                    // Default: 128
  sample_rate?: number,                // Default: 44100
  channels?: number,                   // Default: 2
  codec?: string                       // Default: 'mp3'
}
```

### **Auto-Generated Fields (Don't Include):**

- `id` - Auto-generated UUID
- `created_at` - Auto-set to current timestamp
- `updated_at` - Auto-set to current timestamp
- `play_count` - Default: 0
- `like_count` - Default: 0

### **Complete Example:**

```typescript
// ✅ CORRECT - Complete track creation payload
const trackData = {
  creator_id: userId,
  title: 'My Amazing Track',
  description: 'Track description',
  file_url: audioPublicUrl,
  cover_art_url: coverArtPublicUrl || null,
  duration: 180, // 3 minutes in seconds
  genre: 'Hip Hop',
  tags: ['rap', 'beats', 'hip-hop'],
  is_public: true,
  lyrics: 'Lyrics here...',
  lyrics_language: 'en',
  // Optional quality fields
  audio_quality: 'standard',
  bitrate: 128,
  sample_rate: 44100,
  channels: 2,
  codec: 'mp3'
};

const { data: track, error } = await supabase
  .from('audio_tracks')
  .insert(trackData)
  .select()
  .single();
```

---

## 5. 🔐 **STORAGE POLICIES & PERMISSIONS**

### **RLS Policies:**

Your assumptions are **mostly correct**:

✅ **Users can upload to their own folder:** `${userId}/...`  
✅ **Public read access** for all files (for `cover-art`, `profile-images`, `event-images`)  
✅ **Users can only modify/delete their own files**

### **Policy Details:**

**Audio Tracks Bucket (`audio-tracks`):**
- ✅ Public read access (anyone can view)
- ✅ Authenticated users can upload
- ✅ Users can only update/delete files in their own folder (`${userId}/...`)

**Cover Art Bucket (`cover-art`):**
- ✅ Public read access
- ✅ Authenticated users can upload
- ✅ Users can only update/delete files in their own folder

**Profile Images Bucket (`profile-images`):**
- ✅ Public read access
- ✅ Authenticated users can upload
- ✅ Users can only update/delete files in their own folder

**Event Images Bucket (`event-images`):**
- ✅ Public read access
- ✅ Authenticated users can upload
- ✅ Users can only update/delete files in their own folder

### **Important Notes:**

- The path **must start with `userId/`** for RLS policies to work correctly
- Files uploaded outside the user's folder will be rejected by RLS
- Public buckets allow anyone to read, but only authenticated users can upload

---

## 6. 📏 **FILE SIZE LIMITS**

### **Current Limits:**

| File Type | Limit | Notes |
|-----------|-------|-------|
| Audio files | **100MB** | Maximum for enterprise tier |
| Cover art images | **5MB** | Standard limit |
| Profile images | **5MB** | Standard limit |
| Event images | **5MB** | Standard limit |
| Post attachments | **10MB** | For post audio/images |

### **Validation:**

```typescript
// ✅ CORRECT - Validate before upload
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB

if (audioFile.size > MAX_AUDIO_SIZE) {
  throw new Error('Audio file must be less than 100MB');
}

if (imageFile.size > MAX_IMAGE_SIZE) {
  throw new Error('Image file must be less than 5MB');
}
```

---

## 7. 📄 **SUPPORTED FILE TYPES**

### **Audio File Types:**

```typescript
// ✅ CORRECT - Supported audio MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/flac'
];
```

### **Image File Types:**

```typescript
// ✅ CORRECT - Supported image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif'
];
```

### **Validation:**

```typescript
// ✅ CORRECT - Validate file type before upload
const isValidAudioType = (mimeType: string) => {
  return ALLOWED_AUDIO_TYPES.includes(mimeType);
};

const isValidImageType = (mimeType: string) => {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
};
```

---

## 8. 🔧 **COMPLETE UPLOAD IMPLEMENTATION**

### **Audio Track Upload (Complete Example):**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

async function uploadAudioTrack(
  audioFile: File,
  coverImage: File | null,
  trackMetadata: {
    title: string;
    description?: string;
    genre?: string;
    tags?: string[];
    isPublic?: boolean;
    lyrics?: string;
  },
  userId: string
) {
  try {
    // 1. Validate file size
    const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
    if (audioFile.size > MAX_AUDIO_SIZE) {
      throw new Error('Audio file must be less than 100MB');
    }

    // 2. Validate file type
    const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac'];
    if (!ALLOWED_TYPES.includes(audioFile.type)) {
      throw new Error('Invalid audio file type');
    }

    // 3. Upload audio file
    const audioFileName = `${userId}/${Date.now()}_${audioFile.name}`;
    const { data: audioData, error: audioError } = await supabase.storage
      .from('audio-tracks')
      .upload(audioFileName, audioFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (audioError) {
      throw new Error(`Audio upload failed: ${audioError.message}`);
    }

    // 4. Get audio public URL
    const { data: audioUrlData } = await supabase.storage
      .from('audio-tracks')
      .getPublicUrl(audioFileName);

    // 5. Upload cover art (if provided)
    let coverArtUrl: string | null = null;
    if (coverImage) {
      // Validate image
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
      if (coverImage.size > MAX_IMAGE_SIZE) {
        throw new Error('Cover image must be less than 5MB');
      }

      const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!ALLOWED_IMAGE_TYPES.includes(coverImage.type)) {
        throw new Error('Invalid image file type');
      }

      const coverFileName = `${userId}/${Date.now()}_${coverImage.name}`;
      const { data: coverData, error: coverError } = await supabase.storage
        .from('cover-art')
        .upload(coverFileName, coverImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (coverError) {
        console.warn('Cover art upload failed:', coverError);
        // Continue without cover art
      } else {
        const { data: coverUrlData } = await supabase.storage
          .from('cover-art')
          .getPublicUrl(coverFileName);
        coverArtUrl = coverUrlData.publicUrl;
      }
    }

    // 6. Create track record in database
    const { data: track, error: dbError } = await supabase
      .from('audio_tracks')
      .insert({
        creator_id: userId,
        title: trackMetadata.title,
        description: trackMetadata.description || null,
        file_url: audioUrlData.publicUrl,
        cover_art_url: coverArtUrl,
        genre: trackMetadata.genre || null,
        tags: trackMetadata.tags || null,
        is_public: trackMetadata.isPublic !== false, // Default true
        lyrics: trackMetadata.lyrics || null,
        lyrics_language: 'en'
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded files if database insert fails
      await supabase.storage.from('audio-tracks').remove([audioFileName]);
      if (coverArtUrl) {
        const coverFileName = coverArtUrl.split('/').pop() || '';
        await supabase.storage.from('cover-art').remove([`${userId}/${coverFileName}`]);
      }
      throw new Error(`Failed to create track: ${dbError.message}`);
    }

    return {
      success: true,
      track,
      audioUrl: audioUrlData.publicUrl,
      coverArtUrl
    };

  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}
```

---

## 9. ⚠️ **COMMON ISSUES & SOLUTIONS**

### **Issue 1: "Bucket not found" Error**

**Problem:** Using wrong bucket name

**❌ Wrong:**
```typescript
.from('audio-files')  // ❌ Doesn't exist
.from('artwork')      // ❌ Doesn't exist
```

**✅ Correct:**
```typescript
.from('audio-tracks')    // ✅ Correct
.from('cover-art')       // ✅ Correct
```

---

### **Issue 2: "Permission denied" Error**

**Problem:** File path doesn't start with `userId/`

**❌ Wrong:**
```typescript
const fileName = `tracks/${Date.now()}_${file.name}`;  // ❌ No userId
```

**✅ Correct:**
```typescript
const fileName = `${userId}/${Date.now()}_${file.name}`;  // ✅ Has userId
```

---

### **Issue 3: "File too large" Error**

**Problem:** Exceeding size limits

**Solution:** Validate before upload:
```typescript
if (file.size > 100 * 1024 * 1024) {
  throw new Error('File too large');
}
```

---

### **Issue 4: "Invalid file type" Error**

**Problem:** File type not in allowed list

**Solution:** Validate MIME type:
```typescript
const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', ...];
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

---

## 10. 📝 **UPDATED MOBILE IMPLEMENTATION**

### **Updated UploadService.ts:**

```typescript
// ✅ CORRECT - Updated bucket names
class UploadService {
  private readonly BUCKETS = {
    AUDIO: 'audio-tracks',        // ✅ Changed from 'audio-files'
    COVER_ART: 'cover-art',       // ✅ Changed from 'artwork'
    PROFILE_IMAGES: 'profile-images', // ✅ Changed from 'avatars'
    EVENT_IMAGES: 'event-images'
  };

  async uploadAudioTrack(
    file: File,
    userId: string,
    trackId?: string
  ) {
    // ✅ CORRECT - Use audio-tracks bucket
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(this.BUCKETS.AUDIO)  // ✅ 'audio-tracks'
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: urlData } = await supabase.storage
      .from(this.BUCKETS.AUDIO)
      .getPublicUrl(fileName);

    return {
      success: true,
      url: urlData.publicUrl
    };
  }

  async uploadTrackCover(
    file: File,
    userId: string,
    trackId?: string
  ) {
    // ✅ CORRECT - Use cover-art bucket
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(this.BUCKETS.COVER_ART)  // ✅ 'cover-art'
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: urlData } = await supabase.storage
      .from(this.BUCKETS.COVER_ART)
      .getPublicUrl(fileName);

    return {
      success: true,
      url: urlData.publicUrl
    };
  }
}
```

---

## 11. ✅ **CHECKLIST FOR MOBILE TEAM**

Before deploying, verify:

- [ ] ✅ Changed `audio-files` → `audio-tracks`
- [ ] ✅ Changed `artwork` → `cover-art`
- [ ] ✅ Changed `avatars` → `profile-images` (or keep `avatars` if it exists)
- [ ] ✅ File paths start with `${userId}/`
- [ ] ✅ File size validation (100MB for audio, 5MB for images)
- [ ] ✅ File type validation (check MIME types)
- [ ] ✅ Track creation includes required fields: `creator_id`, `title`, `file_url`
- [ ] ✅ Error handling for upload failures
- [ ] ✅ Cleanup uploaded files if database insert fails

---

## 12. 📊 **SUMMARY**

| Item | Value |
|------|-------|
| **Audio Bucket** | `audio-tracks` |
| **Cover Art Bucket** | `cover-art` |
| **Profile Images Bucket** | `profile-images` |
| **Event Images Bucket** | `event-images` |
| **Upload Method** | Direct Supabase Storage |
| **File Path Format** | `${userId}/${timestamp}_${filename}` |
| **Audio Size Limit** | 100MB |
| **Image Size Limit** | 5MB |
| **Track Creation** | Direct Supabase client insert |

---

## 13. 🚀 **NEXT STEPS**

1. ✅ Update `UploadService.ts` with correct bucket names
2. ✅ Test audio upload with `audio-tracks` bucket
3. ✅ Test cover art upload with `cover-art` bucket
4. ✅ Verify file paths start with `${userId}/`
5. ✅ Test complete upload flow (upload → get URL → create record)
6. ✅ Test error handling (file too large, invalid type, etc.)

---

## 14. 📞 **SUPPORT**

If you encounter issues:

1. Check bucket names match exactly (case-sensitive)
2. Verify file paths start with `userId/`
3. Check file size and type validation
4. Verify authentication token is valid
5. Check Supabase storage policies are configured

**Contact:** Web App Team

---

**Last Updated:** November 29, 2025  
**Status:** ✅ Ready for Implementation

