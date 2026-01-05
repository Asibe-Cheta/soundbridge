# ACRCloud Hybrid Audio Protection System - Implementation Guide

**Date:** January 2, 2026  
**Feature:** Hybrid audio protection using ACRCloud fingerprinting + ISRC verification  
**Status:** Phase 1-4 Complete, Phase 5+ In Progress

---

## 📋 Overview

This document describes the implementation of a hybrid audio protection system that uses ACRCloud audio fingerprinting combined with ISRC verification to prevent unauthorized uploads of already-released music.

---

## ✅ Completed Components

### 1. Database Schema (`database/add_acrcloud_protection_fields.sql`)

Added fields to `audio_tracks` table:

**ACRCloud Fields:**
- `acrcloud_checked` (BOOLEAN) - Whether audio was fingerprinted
- `acrcloud_match_found` (BOOLEAN) - Whether ACRCloud found a match
- `acrcloud_detected_artist` (TEXT) - Detected artist name
- `acrcloud_detected_title` (TEXT) - Detected track title
- `acrcloud_detected_isrc` (TEXT) - Detected ISRC code
- `acrcloud_detected_album` (TEXT) - Detected album name
- `acrcloud_detected_label` (TEXT) - Detected record label
- `acrcloud_checked_at` (TIMESTAMPTZ) - Timestamp of check
- `acrcloud_response_data` (JSONB) - Full API response

**Ownership Verification Fields:**
- `is_released` (BOOLEAN) - Whether track is released/known
- `release_status` (VARCHAR) - Status: `released_verified`, `unreleased_original`, `pending_review`, `cover`, `disputed`
- `ownership_verified` (BOOLEAN) - Whether ownership verified
- `ownership_verified_at` (TIMESTAMPTZ) - Verification timestamp
- `artist_name_match` (BOOLEAN) - Whether artist names match
- `artist_name_match_confidence` (FLOAT) - Match confidence (0.0-1.0)

**Indexes created for performance.**

### 2. ACRCloud API Client (`apps/web/src/lib/acrcloud-api.ts`)

Features:
- ✅ Audio fingerprinting via ACRCloud Identify API
- ✅ Signature generation for authentication
- ✅ Error handling (timeout, quota exceeded, API errors)
- ✅ Response parsing and metadata extraction
- ✅ Support for Buffer input (server-side)

**Functions:**
- `identifyAudio(buffer, timeout)` - Fingerprint audio and identify track
- `identifyAudioFromUrl(url, timeout)` - Identify from URL (fetches first)

**Environment Variables Required:**
- `ACRCLOUD_ACCESS_KEY` - Your ACRCloud access key
- `ACRCLOUD_ACCESS_SECRET` - Your ACRCloud access secret
- `ACRCLOUD_HOST` - Host (e.g., `identify-us-west-2.acrcloud.com`)
- `ACRCLOUD_TIMEOUT` - Timeout in ms (default: 10000)
- `ACRCLOUD_ENABLED` - Feature flag (default: true)

### 3. Artist Name Matcher (`apps/web/src/lib/artist-name-matcher.ts`)

Fuzzy matching logic for artist names:

**Features:**
- ✅ Normalization (lowercase, remove special chars, trim)
- ✅ Common prefix removal ("The", "A", "An")
- ✅ Featuring/feat/ft removal
- ✅ Levenshtein distance calculation
- ✅ Similarity scoring (0.0-1.0)
- ✅ Configurable threshold (default: 0.85 = 85%)

**Functions:**
- `normalizeArtistName(name)` - Normalize for comparison
- `matchArtistNames(artist1, artist2, threshold)` - Match two names
- `matchArtistNameAgainstList(userArtist, detectedArtists, threshold)` - Match against list

### 4. Fingerprinting API Endpoint (`apps/web/app/api/upload/fingerprint/route.ts`)

**Endpoint:** `POST /api/upload/fingerprint`

**Request:**
```json
{
  "audioFileUrl": "https://...",  // OR
  "fileData": "base64...",         // Audio file data
  "artistName": "User Artist Name" // Optional, for matching
}
```

**Response (Match Found):**
```json
{
  "success": true,
  "matchFound": true,
  "requiresISRC": true,
  "detectedArtist": "Detected Artist",
  "detectedTitle": "Detected Title",
  "detectedISRC": "USRC12345678",
  "detectedAlbum": "Album Name",
  "detectedLabel": "Record Label",
  "artistMatch": {
    "match": true,
    "confidence": 0.95
  },
  "artistMatchConfidence": 0.95,
  "detectedISRCVerified": true
}
```

**Response (No Match):**
```json
{
  "success": true,
  "matchFound": false,
  "requiresISRC": false,
  "isUnreleased": true
}
```

---

## 🔄 Integration Points

### Upload Flow Integration

The upload flow should:

1. **When user uploads audio file:**
   - Call `/api/upload/fingerprint` with audio file data
   - Show loading state: "Verifying audio..."

2. **If ACRCloud finds match:**
   - Display detected track info
   - Show ISRC input field (pre-filled if detected)
   - Require ISRC verification
   - Perform artist name matching
   - If artist names match AND ISRC verified → Approve
   - If artist names don't match → Reject/Flag for review

3. **If ACRCloud finds no match:**
   - Display: "This appears to be unreleased/original music"
   - Show checkbox: "I confirm this is my original music"
   - Allow upload without ISRC

4. **If ACRCloud API error/timeout:**
   - Fallback to manual selection
   - Flag for manual review
   - Allow upload to proceed

### Upload API Route Updates Needed

Update `apps/web/app/api/upload/route.ts` to:

1. Accept ACRCloud verification data from frontend
2. Store ACRCloud fields in database
3. Store ownership verification fields
4. Set `release_status` based on verification results

---

## 📝 Remaining Implementation

### Phase 5: Upload Flow Logic Updates

**File:** `apps/web/app/api/upload/route.ts`

Add ACRCloud fields to `trackData`:
```typescript
const trackData: any = {
  // ... existing fields ...
  // ACRCloud fields
  acrcloud_checked: acrcloudData?.checked || false,
  acrcloud_match_found: acrcloudData?.matchFound || false,
  acrcloud_detected_artist: acrcloudData?.detectedArtist || null,
  acrcloud_detected_title: acrcloudData?.detectedTitle || null,
  acrcloud_detected_isrc: acrcloudData?.detectedISRC || null,
  acrcloud_detected_album: acrcloudData?.detectedAlbum || null,
  acrcloud_detected_label: acrcloudData?.detectedLabel || null,
  acrcloud_checked_at: acrcloudData?.checked ? new Date().toISOString() : null,
  acrcloud_response_data: acrcloudData?.rawResponse || null,
  // Ownership verification
  is_released: acrcloudData?.matchFound || false,
  release_status: determineReleaseStatus(acrcloudData, isCover),
  ownership_verified: acrcloudData?.artistMatch?.match && isrcVerified || false,
  ownership_verified_at: (acrcloudData?.artistMatch?.match && isrcVerified) ? new Date().toISOString() : null,
  artist_name_match: acrcloudData?.artistMatch?.match || null,
  artist_name_match_confidence: acrcloudData?.artistMatchConfidence || null
};
```

### Phase 6: UI Component Updates

**File:** `apps/web/app/upload/page.tsx`

Add states:
```typescript
const [acrcloudStatus, setAcrcloudStatus] = useState<'idle' | 'checking' | 'match' | 'no_match' | 'error'>('idle');
const [acrcloudData, setAcrcloudData] = useState<any>(null);
const [isOriginalConfirmed, setIsOriginalConfirmed] = useState(false);
```

Add fingerprinting call when file is uploaded:
```typescript
useEffect(() => {
  if (uploadState.audioFile && !acrcloudData) {
    fingerprintAudio(uploadState.audioFile);
  }
}, [uploadState.audioFile]);
```

### Phase 7: Error Handling & Fallback

- Handle ACRCloud quota exceeded
- Handle API timeouts
- Handle multiple matches
- Handle false positives (dispute mechanism)
- Rate limiting and caching

### Phase 8: Admin Dashboard (Optional)

Create admin review queue for:
- Flagged uploads
- Disputed matches
- Failed verifications
- Suspicious patterns

---

## 🧪 Testing Checklist

- [ ] Upload popular song (should match ACRCloud, require ISRC)
- [ ] Upload unreleased demo (should not match, allow upload)
- [ ] Upload with correct ISRC (should verify and approve)
- [ ] Upload with incorrect ISRC (should reject)
- [ ] Upload with artist name mismatch (should reject/flag)
- [ ] Upload cover song (should match original, require cover ISRC)
- [ ] Upload same file twice (should use cached fingerprint)
- [ ] ACRCloud API timeout (should fallback gracefully)
- [ ] ACRCloud quota exceeded (should fallback to manual)

---

## ⚙️ Configuration

**Environment Variables:**
```bash
ACRCLOUD_ACCESS_KEY=your_access_key
ACRCLOUD_ACCESS_SECRET=your_access_secret
ACRCLOUD_HOST=identify-us-west-2.acrcloud.com
ACRCLOUD_TIMEOUT=10000
ACRCLOUD_ENABLED=true
```

**ACRCloud Setup:**
1. Sign up at https://www.acrcloud.com/
2. Get API credentials from dashboard
3. Choose region (US West, EU, etc.)
4. Note free tier: 100 requests/day

---

## 📚 Related Files

- Database migration: `database/add_acrcloud_protection_fields.sql`
- ACRCloud client: `apps/web/src/lib/acrcloud-api.ts`
- Artist matcher: `apps/web/src/lib/artist-name-matcher.ts`
- Fingerprinting API: `apps/web/app/api/upload/fingerprint/route.ts`
- Upload API: `apps/web/app/api/upload/route.ts` (needs updates)
- Upload UI: `apps/web/app/upload/page.tsx` (needs updates)
- ISRC verification: `apps/web/src/lib/musicbrainz-api.ts` (existing)
- ISRC API: `apps/web/app/api/upload/verify-isrc/route.ts` (existing)

---

## 🚀 Next Steps

1. **Run database migration:**
   ```sql
   -- Run in Supabase SQL Editor
   \i database/add_acrcloud_protection_fields.sql
   ```

2. **Set environment variables** in Vercel/dotenv

3. **Get ACRCloud credentials** and test API

4. **Update upload API route** to store ACRCloud data

5. **Update upload UI** to call fingerprinting and handle responses

6. **Test end-to-end flow**

7. **Implement rate limiting/caching** for production

8. **Create admin review queue** (if needed)

---

## ⚠️ Important Notes

- ACRCloud free tier: 100 requests/day - implement caching/queueing
- Artist name matching threshold: 0.85 (85% similarity) - adjust as needed
- ISRC verification uses existing MusicBrainz integration
- Fallback to manual flow if ACRCloud fails (don't block uploads)
- Store full ACRCloud response in JSONB for debugging
- Consider upgrading ACRCloud plan for production (>100 uploads/day)

---

**Implementation Status:** Core infrastructure complete. Integration with upload flow and UI pending.

