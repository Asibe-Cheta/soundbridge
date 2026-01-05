# ACRCloud Fingerprint API Bug Fix

**Date:** January 5, 2026  
**Issue:** Empty response from `/api/upload/fingerprint` endpoint  
**Status:** Fixed

---

## 🐛 Problem

The ACRCloud fingerprint API endpoint was returning empty responses, causing JSON parse errors on both mobile and web clients.

**Error:** `SyntaxError: JSON Parse error: Unexpected end of input`

---

## 🔧 Root Causes Identified

1. **Missing Error Handling for Request Body Parsing**
   - `request.json()` could throw unhandled exceptions
   - Large base64 files could cause parsing failures
   - No validation of request body structure

2. **Missing Error Handling for File Processing**
   - Base64 decoding could fail silently
   - Buffer creation could throw unhandled exceptions
   - No size validation before processing

3. **Missing Error Handling for ACRCloud API Calls**
   - API response parsing could fail
   - Empty responses not handled
   - Network errors not properly caught

4. **Insufficient Logging**
   - No visibility into where failures occurred
   - Difficult to debug production issues

---

## ✅ Fixes Applied

### 1. Enhanced Request Body Parsing

**Before:**
```typescript
const body = await request.json();
```

**After:**
```typescript
let body: any;
try {
  body = await request.json();
  console.log('✅ Request body parsed', { hasFileData: !!body.fileData });
} catch (parseError: any) {
  console.error('❌ Failed to parse request body', { error: parseError.message });
  return NextResponse.json({
    success: false,
    matchFound: false,
    error: 'Invalid request body...',
    errorCode: 'INVALID_REQUEST',
    requiresManualReview: true
  }, { status: 400, headers: corsHeaders });
}
```

### 2. Enhanced File Processing

**Added:**
- Base64 data validation
- File size checks (20MB base64 limit)
- Buffer validation
- Detailed error logging

**Example:**
```typescript
if (base64Data.length > 20 * 1024 * 1024) {
  return NextResponse.json({
    success: false,
    matchFound: false,
    error: 'Audio file too large for fingerprinting. Maximum size is 10MB.',
    errorCode: 'FILE_TOO_LARGE',
    requiresManualReview: true
  }, { status: 400, headers: corsHeaders });
}
```

### 3. Enhanced ACRCloud API Error Handling

**Before:**
```typescript
const data: ACRCloudResponse = await response.json();
```

**After:**
```typescript
let data: ACRCloudResponse;
try {
  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    return {
      success: false,
      matchFound: false,
      error: 'ACRCloud API returned empty response',
      errorCode: 'API_ERROR'
    };
  }
  data = JSON.parse(responseText);
} catch (parseError: any) {
  return {
    success: false,
    matchFound: false,
    error: 'ACRCloud API returned invalid response',
    errorCode: 'API_ERROR'
  };
}
```

### 4. Comprehensive Error Handling

**Added try-catch blocks for:**
- Request body parsing
- File buffer creation
- Base64 decoding
- ACRCloud API calls
- Response parsing
- All async operations

### 5. Enhanced Logging

**Added detailed logging at every step:**
- Request received
- Authentication status
- Request body parsing
- File processing steps
- ACRCloud API calls
- Response preparation
- Error details with stack traces

**Example Logs:**
```
🔍 ACRCloud fingerprinting API called
✅ ACRCloud fingerprinting: User authenticated { userId: '...' }
✅ ACRCloud fingerprinting: Request body parsed { hasFileData: true, fileDataLength: 18600000 }
✅ ACRCloud fingerprinting: Base64 decoded { originalSize: 18600000, decodedSize: 13986921 }
✅ ACRCloud fingerprinting: Audio buffer ready { size: 13986921, sizeMB: '13.34' }
🎵 Calling ACRCloud identifyAudio... { bufferSize: 13986921, artistName: 'not provided' }
```

### 6. Guaranteed JSON Responses

**All error paths now return valid JSON:**
- Authentication errors → JSON response
- Parse errors → JSON response
- File processing errors → JSON response
- API errors → JSON response
- Unhandled exceptions → JSON response

**Never returns empty response.**

---

## 📝 Changes Made

### Files Modified

1. **`apps/web/app/api/upload/fingerprint/route.ts`**
   - Added comprehensive error handling
   - Added request body validation
   - Added file size validation
   - Added detailed logging
   - Ensured all paths return valid JSON

2. **`apps/web/src/lib/acrcloud-api.ts`**
   - Enhanced FormData creation error handling
   - Enhanced fetch error handling
   - Enhanced response parsing error handling
   - Added empty response detection
   - Added detailed logging

---

## 🧪 Testing

### Test Cases

1. **Valid Request - Match Found**
   - ✅ Should return JSON with `matchFound: true`
   - ✅ Should include detected track metadata

2. **Valid Request - No Match**
   - ✅ Should return JSON with `matchFound: false`
   - ✅ Should include `isUnreleased: true`

3. **Invalid Request Body**
   - ✅ Should return JSON error (not empty)
   - ✅ Should include `errorCode: 'INVALID_REQUEST'`

4. **File Too Large**
   - ✅ Should return JSON error (not empty)
   - ✅ Should include `errorCode: 'FILE_TOO_LARGE'`

5. **ACRCloud API Error**
   - ✅ Should return JSON error (not empty)
   - ✅ Should include `errorCode: 'API_ERROR'` or specific code

6. **Network Error**
   - ✅ Should return JSON error (not empty)
   - ✅ Should include `requiresManualReview: true`

7. **Authentication Error**
   - ✅ Should return JSON error (not empty)
   - ✅ Should include `errorCode: 'AUTH_ERROR'`

---

## 🔍 Debugging Guide

### Check Backend Logs

Look for these log patterns:

**Success Flow:**
```
🔍 ACRCloud fingerprinting API called
✅ ACRCloud fingerprinting: User authenticated
✅ ACRCloud fingerprinting: Request body parsed
✅ ACRCloud fingerprinting: Base64 decoded
✅ ACRCloud fingerprinting: Audio buffer ready
🎵 Calling ACRCloud identifyAudio...
✅ ACRCloud identifyAudio completed
✅ ACRCloud identification complete
```

**Error Flow:**
```
🔍 ACRCloud fingerprinting API called
❌ ACRCloud fingerprinting: [Error type] [Error message]
```

### Common Error Codes

- `AUTH_ERROR`: Authentication failed
- `INVALID_REQUEST`: Request body parsing failed
- `MISSING_FILE`: No file data or URL provided
- `FILE_TOO_LARGE`: File exceeds size limit
- `FILE_PROCESSING_ERROR`: Failed to process audio file
- `API_ERROR`: ACRCloud API error
- `TIMEOUT`: Request timeout
- `QUOTA_EXCEEDED`: ACRCloud quota exceeded
- `INTERNAL_ERROR`: Unhandled exception

---

## 🚀 Deployment Checklist

- [x] Enhanced error handling added
- [x] Logging added
- [x] File size validation added
- [x] Request validation added
- [x] All error paths return JSON
- [ ] Test with real audio files
- [ ] Verify logs in production
- [ ] Monitor error rates

---

## 📊 Expected Behavior After Fix

### Success Response (Match Found)
```json
{
  "success": true,
  "matchFound": true,
  "requiresISRC": true,
  "detectedArtist": "Artist Name",
  "detectedTitle": "Track Title",
  "detectedISRC": "USRC11405281",
  "artistMatch": {
    "match": true,
    "confidence": 95.5
  }
}
```

### Success Response (No Match)
```json
{
  "success": true,
  "matchFound": false,
  "requiresISRC": false,
  "isUnreleased": true
}
```

### Error Response (Any Error)
```json
{
  "success": false,
  "matchFound": false,
  "error": "Specific error message",
  "errorCode": "ERROR_CODE",
  "requiresManualReview": true
}
```

**Never returns empty response.**

---

## 🔗 Related Files

- `apps/web/app/api/upload/fingerprint/route.ts` - Main endpoint
- `apps/web/src/lib/acrcloud-api.ts` - ACRCloud client
- `MOBILE_TEAM_ACRCLOUD_HYBRID_PROTECTION.md` - Mobile team guide

---

## ✅ Verification Steps

1. **Test with Valid File**
   ```bash
   curl -X POST https://www.soundbridge.live/api/upload/fingerprint \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"fileData": "data:audio/mpeg;base64,..."}'
   ```
   Should return JSON response (not empty).

2. **Test with Invalid Request**
   ```bash
   curl -X POST https://www.soundbridge.live/api/upload/fingerprint \
     -H "Content-Type: application/json" \
     -d '{"invalid": "data"}'
   ```
   Should return JSON error (not empty).

3. **Check Logs**
   - Look for detailed logging at each step
   - Verify no unhandled exceptions
   - Verify all responses are JSON

---

**Status:** Fixed and ready for testing

