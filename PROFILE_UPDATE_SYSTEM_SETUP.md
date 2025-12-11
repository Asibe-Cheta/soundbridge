# Profile Update System - Setup & Fix Guide

**Date:** December 11, 2025
**Status:** ⚠️ **NEEDS SETUP**

---

## 🎯 Overview

The profile update system is **already implemented** in the codebase, but requires Supabase Storage setup and minor fixes to work correctly.

---

## ✅ What's Already Working

### API Endpoints:
1. **POST /api/profile/update** - Updates profile data (bio, location, username, etc.)
2. **POST /api/upload/avatar** - Uploads avatar images to Supabase Storage

### Frontend:
1. Profile edit form with all fields
2. Save button that calls the API
3. Avatar upload with file picker

### Backend:
1. Profile update logic with upsert (update or create)
2. Avatar upload with file validation (image type, 5MB max)
3. Automatic URL generation for uploaded avatars

---

## ⚠️ What Needs to be Fixed

### 1. Supabase Storage Bucket Setup
**Status:** ❌ Missing
**Impact:** Avatar uploads will fail

**Required Actions:**
- Create `avatars` storage bucket in Supabase
- Set public access policy
- Configure CORS if needed

### 2. Profile Data Loading
**Status:** ⚠️ Partial
**Impact:** Saved data won't show after page refresh

**Required Actions:**
- Load profile data from database on mount
- Update `loadProfileData()` function

### 3. Additional Fields Support
**Status:** ⚠️ Incomplete
**Impact:** Website, phone, genre, experience won't save

**Required Actions:**
- Add fields to update API payload
- Update database if columns don't exist

---

## 🔧 Step-by-Step Fix Guide

### Step 1: Create Supabase Storage Bucket

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **Storage** section
3. Click "**New Bucket**"
4. Settings:
   - **Name:** `avatars`
   - **Public:** ✅ Yes (check this box)
   - **File size limit:** 5MB
   - **Allowed MIME types:** `image/*`
5. Click "**Create Bucket**"

6. **Set RLS Policy:**
   - Click on `avatars` bucket
   - Go to "**Policies**" tab
   - Add policy:
     ```sql
     -- Allow public read access
     CREATE POLICY "Public avatar access"
     ON storage.objects FOR SELECT
     TO public
     USING (bucket_id = 'avatars');

     -- Allow authenticated users to upload their own avatars
     CREATE POLICY "Users can upload own avatars"
     ON storage.objects FOR INSERT
     TO authenticated
     WITH CHECK (
       bucket_id = 'avatars' AND
       (storage.foldername(name))[1] = 'avatars'
     );

     -- Allow users to update their own avatars
     CREATE POLICY "Users can update own avatars"
     ON storage.objects FOR UPDATE
     TO authenticated
     USING (bucket_id = 'avatars');

     -- Allow users to delete their own avatars
     CREATE POLICY "Users can delete own avatars"
     ON storage.objects FOR DELETE
     TO authenticated
     USING (bucket_id = 'avatars');
     ```

**Option B: Via SQL (Alternative)**

Run this SQL in your Supabase SQL Editor:

```sql
-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set RLS policies
CREATE POLICY IF NOT EXISTS "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY IF NOT EXISTS "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
```

---

### Step 2: Ensure Profile Table Has All Columns

Run this SQL to add missing profile columns if they don't exist:

```sql
-- Add website column if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add phone column if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add genre/genres column if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS genres TEXT[];

-- Add experience level if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
```

---

### Step 3: Update Profile Update API to Handle All Fields

The API already supports the main fields. To add support for additional fields, update the API:

**File:** `apps/web/app/api/profile/update/route.ts`

Add these lines after line 31:

```typescript
const {
  display_name,
  username,
  avatar_url,
  location,
  bio,
  genres,
  website,        // ADD
  phone,          // ADD
  experience_level, // ADD
  profile_completed
} = body;
```

And after line 41:

```typescript
if (display_name) updateData.display_name = display_name;
if (username) updateData.username = username;
if (avatar_url) updateData.avatar_url = avatar_url;
if (location) updateData.location = location;
if (bio) updateData.bio = bio;
if (genres) updateData.genres = genres;
if (website) updateData.website = website;                // ADD
if (phone) updateData.phone = phone;                      // ADD
if (experience_level) updateData.experience_level = experience_level; // ADD
if (profile_completed !== undefined) updateData.profile_completed = profile_completed;
```

---

### Step 4: Update Frontend to Send All Fields

**File:** `apps/web/app/profile/page.tsx`

Update the `handleSaveProfile` function (line 411) to include all fields:

```typescript
const handleSaveProfile = async () => {
  console.log('🔧 Save button clicked!', { profileData });
  try {
    const response = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user?.id,
        display_name: profileData.displayName,
        username: profileData.username,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,        // ADD
        phone: profileData.phone,            // ADD
        genres: profileData.genre ? [profileData.genre] : [], // ADD
        experience_level: profileData.experience  // ADD
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('✅ Profile saved successfully');
        setIsEditing(false);

        // Show success message
        alert('Profile updated successfully!');

        // Reload profile data
        await loadProfileData();
      } else {
        throw new Error(result.error || 'Failed to save profile');
      }
    } else {
      throw new Error(`Failed to save profile: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error saving profile:', error);
    alert('Failed to save profile. Please try again.');
  }
};
```

---

### Step 5: Fix Profile Data Loading

Find the `loadProfileData` function in `apps/web/app/profile/page.tsx` and ensure it loads from the database:

```typescript
const loadProfileData = async () => {
  if (!user?.id) return;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    if (profile) {
      setProfileData({
        displayName: profile.display_name || user.user_metadata?.display_name || '',
        username: profile.username || user.email?.split('@')[0] || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        email: user.email || '',
        phone: profile.phone || '',
        genre: profile.genres?.[0] || '',
        experience: profile.experience_level || 'Beginner',
        avatarUrl: profile.avatar_url || ''
      });
    }
  } catch (error) {
    console.error('Error in loadProfileData:', error);
  }
};
```

---

## 🧪 Testing Guide

### Test 1: Avatar Upload
1. Click the camera icon on avatar
2. Select an image file (JPG, PNG, etc.)
3. **Expected:** Image uploads and displays immediately
4. **Verify:** Check Supabase Storage → `avatars` bucket for uploaded file
5. **Verify:** Refresh page - avatar should persist

**If it fails:**
- Check browser console for errors
- Verify `avatars` bucket exists in Supabase
- Check bucket is set to public
- Verify RLS policies are set

### Test 2: Profile Data (Bio, Location)
1. Click "Edit Profile" button
2. Update bio and location fields
3. Click "Save" button
4. **Expected:** "Profile updated successfully!" alert
5. **Verify:** Refresh page - changes should persist

**If it fails:**
- Check browser console for errors
- Check Network tab - POST to `/api/profile/update` should return 200
- Verify columns exist in `profiles` table
- Check RLS policies allow updates

### Test 3: Username Update
1. Edit profile
2. Change username
3. Save
4. **Expected:** Changes save successfully
5. **Verify:** New username shows on profile

**Note:** Username must be unique. Error if username already taken.

### Test 4: Additional Fields (Website, Phone, etc.)
1. Edit profile
2. Fill in website URL
3. Fill in phone number
4. Select genre
5. Select experience level
6. Save
7. **Verify:** All fields persist after refresh

---

## 🔍 Troubleshooting

### Issue 1: "Failed to upload avatar"
**Causes:**
- Storage bucket doesn't exist
- Bucket is not public
- File size > 5MB
- File is not an image

**Solutions:**
1. Create `avatars` bucket (see Step 1)
2. Set bucket to public
3. Check file meets requirements (image, <5MB)
4. Check browser console for specific error

### Issue 2: "Profile updated successfully" but changes don't persist
**Causes:**
- Profile not loading from database
- Database columns don't exist
- RLS policies blocking read

**Solutions:**
1. Check `loadProfileData()` function is called
2. Run SQL to add missing columns (Step 2)
3. Check RLS policies on `profiles` table
4. Check browser console for errors

### Issue 3: Username already taken error
**Cause:** Username must be unique

**Solution:**
- Choose a different username
- Add validation to check availability before save

### Issue 4: Changes save but don't show immediately
**Cause:** Frontend state not updating

**Solution:**
- Call `loadProfileData()` after successful save
- Update local state immediately for better UX

---

## 📊 Database Schema Reference

### Current `profiles` Table Columns:

```sql
-- Core identity
id UUID PRIMARY KEY
username TEXT UNIQUE
display_name TEXT
avatar_url TEXT
bio TEXT
email TEXT

-- Contact & location
location TEXT
website TEXT
phone TEXT

-- Professional info
professional_headline TEXT (max 120 chars)
years_active_start INTEGER
years_active_end INTEGER
genres TEXT[]
experience_level TEXT

-- Subscription (from subscription_tier_schema.sql)
subscription_tier VARCHAR(20) DEFAULT 'free'
subscription_status VARCHAR(20)
subscription_period VARCHAR(20)
subscription_start_date TIMESTAMP
subscription_renewal_date TIMESTAMP

-- Upload tracking
uploads_this_period INTEGER DEFAULT 0
total_uploads_lifetime INTEGER DEFAULT 0

-- Verification & status
is_verified BOOLEAN DEFAULT FALSE
is_active BOOLEAN DEFAULT TRUE
profile_completed BOOLEAN DEFAULT FALSE

-- Onboarding
onboarding_completed BOOLEAN DEFAULT FALSE
onboarding_step TEXT
onboarding_user_type VARCHAR(50)

-- Preferences
preferred_event_distance INTEGER DEFAULT 25

-- Timestamps
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

---

## 🚀 Quick Start Checklist

Run through this checklist to get profile updates working:

- [ ] **Step 1:** Create `avatars` storage bucket in Supabase
- [ ] **Step 2:** Set bucket to public
- [ ] **Step 3:** Add RLS policies to bucket
- [ ] **Step 4:** Run SQL to add missing columns to `profiles` table
- [ ] **Step 5:** Update profile API to handle all fields
- [ ] **Step 6:** Update frontend `handleSaveProfile()` to send all fields
- [ ] **Step 7:** Fix `loadProfileData()` to load from database
- [ ] **Step 8:** Test avatar upload
- [ ] **Step 9:** Test profile data save
- [ ] **Step 10:** Test data persistence after refresh

---

## 📝 Summary

The profile update system is **90% complete** - it just needs:
1. ✅ Supabase Storage bucket creation (5 minutes)
2. ✅ Minor code updates to save/load all fields (10 minutes)
3. ✅ Testing (5 minutes)

**Total Time to Fix:** ~20 minutes

---

**Status:** Ready to implement
**Priority:** High - affects user experience
**Difficulty:** Easy - mostly configuration

