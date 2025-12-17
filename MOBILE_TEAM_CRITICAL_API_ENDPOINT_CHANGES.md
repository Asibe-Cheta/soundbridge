# 🚨 CRITICAL: Web API Endpoint Changes - Mobile Team Action Required

**Date:** December 17, 2025
**Severity:** HIGH - Requires immediate action
**Affected:** All mobile app features using playlists, events, creators, and tracks

---

## Executive Summary

The web team has removed duplicate API route files that were causing production errors. **If your mobile app calls any of the deleted endpoints, those API calls will fail after the next deployment.**

**Action Required:** Review your mobile codebase and update any API calls to match the new endpoint structure.

---

## What Changed on the Web API

### Deleted Endpoints (Will Return 404 After Deployment)

| **Deleted Endpoint** | **Use This Instead** | **Affected Features** |
|---------------------|---------------------|----------------------|
| ❌ `/api/playlists/[id]` | ✅ `/api/playlists/[playlistId]` | Playlist details, playlist tracks |
| ❌ `/api/events/[eventId]` | ✅ `/api/events/[id]` | Event details, RSVP, tickets |
| ❌ `/creator/[creatorId]` | ✅ `/creator/[username]` | Creator profiles by ID |
| ❌ `/track/[id]` | ✅ `/track/[trackId]` | Track details by ID |

### Why This Change Was Made

The web app had **duplicate route files** with different parameter names for the same paths. This caused a Next.js routing error:

```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'playlistId')
```

Sentry (our new error monitoring system) caught this in production, and we had to remove the conflicting routes to fix it.

---

## How to Check If Your Mobile App Is Affected

### Step 1: Search Your Codebase

Run these commands in your mobile app directory:

```bash
# Check for playlist endpoint calls
grep -r "/api/playlists/" src/ components/ screens/ lib/ services/

# Check for event endpoint calls
grep -r "/api/events/" src/ components/ screens/ lib/ services/

# Check for creator endpoint calls
grep -r "/creator/" src/ components/ screens/ lib/ services/

# Check for track endpoint calls
grep -r "/track/" src/ components/ screens/ lib/ services/
```

**Alternative (Windows PowerShell):**
```powershell
# Search all TypeScript/JavaScript files
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Select-String -Pattern "/api/playlists/|/api/events/|/creator/|/track/"
```

### Step 2: Identify Affected API Calls

Look for API calls like these in your mobile code:

**❌ WILL BREAK:**
```typescript
// These will return 404 after deployment
fetch('https://soundbridge.live/api/playlists/123')
fetch('https://soundbridge.live/api/events/456')
fetch('https://soundbridge.live/creator/789')
fetch('https://soundbridge.live/track/101')
```

**✅ SAFE (No changes needed):**
```typescript
// These endpoints still exist and work correctly
fetch('https://soundbridge.live/api/playlists/abc-123')  // Already using playlistId
fetch('https://soundbridge.live/api/events/def-456')     // Already using id
fetch('https://soundbridge.live/creator/johndoe')        // Using username
fetch('https://soundbridge.live/track/track-789')        // Already using trackId
```

---

## How to Fix Affected Code

### Fix 1: Playlist Endpoints

**Before (❌ Will break):**
```typescript
// Mobile API service
const getPlaylistDetails = async (playlistId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/playlists/${playlistId}`
  );
  return response.json();
};
```

**After (✅ Works):**
```typescript
// No code change needed - endpoint path is the same!
// The web API still accepts /api/playlists/[playlistId]
// Just verify you're actually calling the correct endpoint
const getPlaylistDetails = async (playlistId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/playlists/${playlistId}` // ✅ Still works
  );
  return response.json();
};
```

**Important:** The URL path `/api/playlists/{playlistId}` hasn't changed! We only removed the duplicate file that used `[id]` instead of `[playlistId]`.

### Fix 2: Event Endpoints

**Before (❌ Might break if using wrong parameter name):**
```typescript
// If you're doing this, you're fine
const getEventDetails = async (eventId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}` // ✅ Works - we kept [id]
  );
  return response.json();
};
```

**After (✅ Confirmed working):**
```typescript
// Events use [id] parameter - no changes needed
const getEventDetails = async (eventId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}` // ✅ Still works
  );
  return response.json();
};
```

### Fix 3: Creator Endpoints (⚠️ MOST LIKELY TO BREAK)

**Before (❌ WILL BREAK if using creatorId):**
```typescript
const getCreatorProfile = async (creatorId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/creator/${creatorId}` // ❌ DELETED!
  );
  return response.json();
};
```

**After (✅ Use username instead):**
```typescript
// Option 1: Fetch by username (RECOMMENDED)
const getCreatorProfile = async (username: string) => {
  const response = await fetch(
    `${API_BASE_URL}/creator/${username}` // ✅ Works
  );
  return response.json();
};

// Option 2: If you only have creatorId, fetch profile from user API first
const getCreatorProfile = async (creatorId: string) => {
  // Step 1: Get username from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', creatorId)
    .single();

  // Step 2: Use username to fetch creator page
  const response = await fetch(
    `${API_BASE_URL}/creator/${profile.username}` // ✅ Works
  );
  return response.json();
};
```

### Fix 4: Track Endpoints

**Before (❌ Might break if using wrong parameter):**
```typescript
const getTrackDetails = async (trackId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/track/${trackId}` // ✅ Should work - we kept [trackId]
  );
  return response.json();
};
```

**After (✅ Confirmed working):**
```typescript
// Tracks use [trackId] parameter - no changes needed
const getTrackDetails = async (trackId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/track/${trackId}` // ✅ Still works
  );
  return response.json();
};
```

---

## Testing Checklist

After making any changes, test these features in your mobile app:

### Playlist Features
- [ ] View playlist details
- [ ] Load playlist tracks
- [ ] Add/remove tracks from playlist
- [ ] Delete playlist
- [ ] Share playlist

### Event Features
- [ ] View event details
- [ ] RSVP to events
- [ ] Cancel RSVP
- [ ] Purchase event tickets
- [ ] View friends attending
- [ ] Cancel/refund tickets

### Creator Profile Features
- [ ] View creator profile by username
- [ ] View creator profile by ID (if applicable)
- [ ] Follow/unfollow creators
- [ ] View creator's content (tracks, events, podcasts)
- [ ] Navigate to creator profile from search

### Track Features
- [ ] View track details
- [ ] Play track
- [ ] Like/unlike track
- [ ] Add track to playlist
- [ ] Share track

---

## Migration Timeline

| **Date** | **Status** | **Action** |
|---------|-----------|-----------|
| ✅ Dec 17, 2025 | DEPLOYED | Web API changes are live in production |
| ⏳ ASAP | PENDING | Mobile team reviews and updates code |
| 🎯 Dec 18-19, 2025 | TARGET | Mobile app updated and tested |

---

## Current Web API Endpoint Reference

### Playlists API
```
GET    /api/playlists                    # List all playlists
POST   /api/playlists                    # Create playlist
GET    /api/playlists/[playlistId]       # Get playlist details ✅
PUT    /api/playlists/[playlistId]       # Update playlist ✅
DELETE /api/playlists/[playlistId]       # Delete playlist ✅
GET    /api/playlists/[playlistId]/tracks # Get playlist tracks ✅
POST   /api/playlists/[playlistId]/tracks # Add track to playlist ✅
DELETE /api/playlists/[playlistId]/tracks/[trackId] # Remove track ✅
GET    /api/playlists/user/[userId]      # Get user's playlists
```

### Events API
```
GET    /api/events                       # List all events
POST   /api/events                       # Create event
GET    /api/events/[id]                  # Get event details ✅
PUT    /api/events/[id]                  # Update event ✅
DELETE /api/events/[id]                  # Delete event ✅
POST   /api/events/[id]/rsvp             # RSVP to event ✅
DELETE /api/events/[id]/rsvp             # Cancel RSVP ✅
GET    /api/events/[id]/tickets          # Get event tickets ✅
POST   /api/events/[id]/cancel           # Cancel event ✅
GET    /api/events/[id]/friends-attending # Get friends attending ✅
```

### Creator Pages
```
GET    /creator/[username]               # Get creator profile ✅
GET    /creator/[username]/music         # Get creator's music ✅
GET    /creator/[username]/events        # Get creator's events ✅
GET    /creator/[username]/podcasts      # Get creator's podcasts ✅
```

### Tracks API
```
GET    /api/track/[trackId]              # Get track details ✅
POST   /api/track/upload                 # Upload track
DELETE /api/track/[trackId]              # Delete track ✅
GET    /api/user/[userId]/tracks         # Get user's tracks
```

---

## Quick Migration Checklist

Use this checklist to track your progress:

- [ ] **Step 1:** Search codebase for affected endpoints (grep/PowerShell commands above)
- [ ] **Step 2:** Identify all API calls that need updating
- [ ] **Step 3:** Update API calls to use correct endpoint paths
- [ ] **Step 4:** Update TypeScript types/interfaces if parameter names changed
- [ ] **Step 5:** Test playlist features (view, create, edit, delete)
- [ ] **Step 6:** Test event features (view, RSVP, tickets)
- [ ] **Step 7:** Test creator profiles (by username and by ID if applicable)
- [ ] **Step 8:** Test track features (view, play, like, add to playlist)
- [ ] **Step 9:** Run full regression test suite
- [ ] **Step 10:** Deploy updated mobile app

---

## Recommended: Set Up Sentry for Mobile

We just set up Sentry error monitoring on the web app, which is how we caught this routing issue immediately. **We highly recommend setting up Sentry for React Native** to catch similar issues on mobile.

### Benefits of Sentry for Mobile
- ✅ Real-time error tracking for production crashes
- ✅ Session replay to see what users did before crash
- ✅ Performance monitoring for slow API calls
- ✅ Email/Slack alerts when errors spike
- ✅ Stack traces with source maps for debugging

### Quick Setup Guide
1. Create free Sentry account: https://sentry.io
2. Add to your mobile app:
   ```bash
   npm install @sentry/react-native
   npx @sentry/wizard@latest -i reactNative
   ```
3. Initialize in `App.tsx`:
   ```typescript
   import * as Sentry from "@sentry/react-native";

   Sentry.init({
     dsn: "YOUR_SENTRY_DSN",
     environment: __DEV__ ? 'development' : 'production',
     enableNative: true,
     enableNativeCrashHandling: true,
   });
   ```

Full guide: https://docs.sentry.io/platforms/react-native/

---

## Questions or Issues?

If you encounter any problems after updating your code:

1. **Check the web API logs** in Vercel dashboard
2. **Test endpoints directly** using Postman/Insomnia
3. **Contact web team** if endpoints are returning unexpected errors
4. **Review full API documentation:** See `API_ENDPOINTS_DOCUMENTATION.md` in the repo

---

## Summary

**What You Need to Do:**
1. ✅ Search your mobile codebase for API calls to deleted endpoints
2. ✅ Update any calls to `/creator/[creatorId]` to use `/creator/[username]` instead
3. ✅ Verify playlist, event, and track endpoints are using correct parameter names
4. ✅ Test all affected features thoroughly
5. ✅ Consider setting up Sentry for mobile error monitoring

**What You DON'T Need to Do:**
- ❌ No database schema changes required
- ❌ No authentication changes required
- ❌ No API response format changes
- ❌ Routes that were already correct don't need updates

**Timeline:**
- Web changes are **LIVE NOW** in production
- Mobile team should **review and update code ASAP** (target: 24-48 hours)

---

**Web Team Contact:**
- For endpoint questions: Check `API_ENDPOINTS_DOCUMENTATION.md`
- For Sentry setup help: Check `SENTRY_INTEGRATION_GUIDE.md`
- For urgent issues: Contact web team lead

---

*Document created: December 17, 2025*
*Last updated: December 17, 2025*
*Web commit: d00b7b88 - "Fix: Remove duplicate dynamic route parameters"*
