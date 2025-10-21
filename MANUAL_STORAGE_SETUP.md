# 🔧 Manual Storage Bucket Setup Guide

Since the SQL script has permission issues, here's how to set up storage buckets manually in Supabase:

## 📦 **Step 1: Create Storage Buckets**

### **1.1 Audio Tracks Bucket**
1. Go to **Storage** in your Supabase dashboard
2. Click **"New bucket"**
3. **Name:** `audio-tracks`
4. **Public:** ✅ **Yes** (for easy access)
5. **File size limit:** `50 MB`
6. **Allowed MIME types:** 
   ```
   audio/mpeg, audio/mp3, audio/wav, audio/x-wav, audio/m4a, audio/x-m4a, audio/aac, audio/ogg, audio/webm, audio/flac
   ```

### **1.2 Cover Art Bucket**
1. Click **"New bucket"** again
2. **Name:** `cover-art`
3. **Public:** ✅ **Yes** (for easy access)
4. **File size limit:** `5 MB`
5. **Allowed MIME types:**
   ```
   image/jpeg, image/jpg, image/png, image/webp, image/avif
   ```

## 🔐 **Step 2: Set Up Storage Policies**

### **2.1 Audio Tracks Policies**
Go to **Storage** → **Policies** → **audio-tracks**

**Add these policies:**

1. **Public Read Access:**
   - **Policy name:** `Audio tracks are publicly accessible`
   - **Operation:** `SELECT`
   - **Target roles:** `public`
   - **Policy definition:** `bucket_id = 'audio-tracks'`

2. **Authenticated Upload:**
   - **Policy name:** `Authenticated users can upload audio tracks`
   - **Operation:** `INSERT`
   - **Target roles:** `authenticated`
   - **Policy definition:** `bucket_id = 'audio-tracks' AND auth.role() = 'authenticated'`

3. **Owner Update/Delete:**
   - **Policy name:** `Users can manage their own audio tracks`
   - **Operation:** `UPDATE, DELETE`
   - **Target roles:** `authenticated`
   - **Policy definition:** `bucket_id = 'audio-tracks' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text`

### **2.2 Cover Art Policies**
Go to **Storage** → **Policies** → **cover-art`

**Add these policies:**

1. **Public Read Access:**
   - **Policy name:** `Cover art is publicly accessible`
   - **Operation:** `SELECT`
   - **Target roles:** `public`
   - **Policy definition:** `bucket_id = 'cover-art'`

2. **Authenticated Upload:**
   - **Policy name:** `Authenticated users can upload cover art`
   - **Operation:** `INSERT`
   - **Target roles:** `authenticated`
   - **Policy definition:** `bucket_id = 'cover-art' AND auth.role() = 'authenticated'`

3. **Owner Update/Delete:**
   - **Policy name:** `Users can manage their own cover art`
   - **Operation:** `UPDATE, DELETE`
   - **Target roles:** `authenticated`
   - **Policy definition:** `bucket_id = 'cover-art' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text`

## 🗄️ **Step 3: Create Database Table**

Run this SQL in the **SQL Editor**:

```sql
-- Create audio_tracks table
CREATE TABLE IF NOT EXISTS audio_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    cover_art_url TEXT,
    duration INTEGER DEFAULT 0,
    genre VARCHAR(100),
    tags TEXT[],
    lyrics TEXT,
    lyrics_language VARCHAR(10) DEFAULT 'en',
    is_public BOOLEAN DEFAULT true,
    audio_quality VARCHAR(50) DEFAULT 'standard',
    bitrate INTEGER DEFAULT 128,
    sample_rate INTEGER DEFAULT 44100,
    channels INTEGER DEFAULT 2,
    codec VARCHAR(20) DEFAULT 'mp3',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "audio_tracks_select_policy" ON audio_tracks
    FOR SELECT USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "audio_tracks_insert_policy" ON audio_tracks
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "audio_tracks_update_policy" ON audio_tracks
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "audio_tracks_delete_policy" ON audio_tracks
    FOR DELETE USING (creator_id = auth.uid());

-- Grant permissions
GRANT ALL ON audio_tracks TO authenticated;
GRANT ALL ON audio_tracks TO anon;
```

## ✅ **Step 4: Verify Setup**

1. **Check Storage Buckets:**
   - Go to **Storage** → Should see `audio-tracks` and `cover-art` buckets
   - Both should be **public**

2. **Check Database Table:**
   - Go to **Table Editor** → Should see `audio_tracks` table
   - Should have all the columns listed above

3. **Test Upload:**
   - Try uploading a file in your app
   - Check browser console for debugging logs
   - Should see successful upload messages

## 🚨 **Troubleshooting**

### **If Upload Still Fails:**
1. **Check browser console** for specific error messages
2. **Verify user is authenticated** - Check if `user.id` exists
3. **Check storage bucket permissions** - Make sure policies are correct
4. **Check database permissions** - Make sure RLS policies allow inserts

### **Common Issues:**
- **401 Unauthorized:** User not logged in
- **403 Forbidden:** Storage policy blocking upload
- **Database error:** RLS policy blocking insert
- **File too large:** Check file size limits

## 📞 **Need Help?**

If you're still having issues:
1. **Share the exact error message** from browser console
2. **Check if storage buckets exist** in Supabase dashboard
3. **Verify user authentication** is working
4. **Test with a small file first** (under 1MB)

The manual setup should resolve the permission issues you're experiencing!
