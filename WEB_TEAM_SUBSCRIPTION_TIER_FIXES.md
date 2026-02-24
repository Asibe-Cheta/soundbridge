# Web Team: Subscription Tier & Storage Fixes Applied to Mobile

## Status: FIXES APPLIED - BACKEND VERIFICATION NEEDED

## Date: January 20, 2026

---

## Summary

We discovered and fixed several inconsistencies in the mobile app related to subscription tier checks and storage quota calculations. This document explains what was fixed and requests backend verification.

---

## Issues Found & Fixed on Mobile

### 1. Create Event Screen - Paid Events Gate

**Problem:**
Premium subscribers were being told to "Upgrade to Premium to host paid events" even though they were already subscribed.

**Root Cause:**
The check required BOTH `role = 'creator'` AND `subscription_tier = 'premium'|'unlimited'`. Users with Premium subscription but `role = 'listener'` were blocked.

**Mobile Fix Applied:**
Changed the logic so that **subscription tier is the only gating factor** for paid events. Premium/Unlimited users can now create paid events regardless of their "creator" role.

```typescript
// OLD (incorrect)
const canCreatePaidEvents = isCreator && isSubscribed;

// NEW (correct)
const canCreatePaidEvents = isSubscribed; // Premium or Unlimited
```

**Backend Action Required:** None - this is UI-only

---

### 2. Storage Quota - "Storage Limit Reached" False Positive

**Problem:**
Premium users with plenty of storage available (2.48 MB used out of 2 GB) were seeing "Storage limit reached (0% used)" error.

**Root Cause:**
The grace period check was incorrectly returning `storage_status` values that blocked uploads. Even active Premium subscribers were being treated as if they were in grace period.

**Mobile Fix Applied:**
Updated `StorageQuotaService.getGracePeriodStatus()` to:
1. Check if user has an active subscription (premium/unlimited with status='active')
2. If yes, immediately return `storage_status: 'active_subscription'`
3. Only check grace period fields if user is on free tier or has expired subscription

```typescript
// If user has an active subscription, they're NOT in grace period
const isActiveSubscriber = profile.subscription_tier &&
  profile.subscription_tier !== 'free' &&
  (!profile.subscription_status || profile.subscription_status === 'active');

if (isActiveSubscriber) {
  return { storage_status: 'active_subscription', ... };
}
```

**Backend Action Required:** None - this is client-side logic

---

### 3. Event Details - Schema Cache Error

**Problem:**
Tapping event notifications opened the app but showed "Failed to load event details" with error: "Could not find a relationship between 'events' and 'profiles' in the schema cache"

**Root Cause:**
Supabase query used foreign key join (`profiles!organizer_id`) which requires schema cache to have the relationship defined.

**Mobile Fix Applied:**
Split the query into two separate queries to avoid schema cache dependency:
1. First fetch event data
2. Then fetch organizer profile separately using `organizer_id`

**Backend Action Required:** None, but you may want to ensure the foreign key constraint exists:
```sql
-- Verify this constraint exists in your database
ALTER TABLE events
ADD CONSTRAINT events_organizer_id_fkey
FOREIGN KEY (organizer_id) REFERENCES profiles(id);
```

---

## BACKEND VERIFICATION NEEDED

### Issue: `file_size` Column Not Populated

**Problem Observed:**
In the Storage Management screen, the track "The Gospel Prevails" shows **0 Bytes** file size, but the actual file is approximately 13 MB.

**Screenshot Evidence:**
- Storage shows: "2.48 MB of 2GB used" with 2 files
- File list shows:
  - "What a wonderful world" - 2.48 MB
  - "The Gospel Prevails" - **0 Bytes** (incorrect)

**Questions for Backend Team:**

1. **Is `file_size` being populated during upload?**
   - The upload endpoint should store the file size in bytes in the `audio_tracks.file_size` column
   - Check if recent uploads have `file_size = 0` or `file_size = NULL`

2. **Can you verify the upload flow?**
   ```sql
   -- Check for tracks with missing file_size
   SELECT id, title, file_size, created_at, file_url
   FROM audio_tracks
   WHERE file_size IS NULL OR file_size = 0
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **If file_size is missing, can you backfill it?**
   - For tracks uploaded to Supabase Storage, you can get the actual size from the storage bucket
   - Example backfill approach:
   ```sql
   -- This would need to be done via an Edge Function that reads storage metadata
   -- and updates the file_size column
   ```

4. **What's the expected flow?**
   ```
   Mobile Upload → Backend API → Supabase Storage → Save file_size to audio_tracks
   ```
   At which step should `file_size` be captured?

---

## Files Modified on Mobile

| File | Change |
|------|--------|
| `src/screens/CreateEventScreen.tsx` | Removed `isCreator` requirement for paid events |
| `src/services/StorageQuotaService.ts` | Fixed grace period check for active subscribers |
| `src/services/UploadQuotaService.ts` | Added logging for RevenueCat tier debugging |
| `src/screens/EventDetailsScreen.tsx` | Split query to avoid schema cache error |

---

## Testing Checklist for Backend

- [ ] Verify `file_size` is populated for new uploads
- [ ] Check if existing tracks need file_size backfill
- [ ] Confirm `events.organizer_id` foreign key exists
- [ ] Review Stripe webhook logs to ensure subscription updates are reaching the database

---

## Contact

If you have questions about these changes, please reach out to the mobile team.

---

*Document created by Claude Code - Mobile Team*
