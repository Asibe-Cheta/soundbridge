# 🚨 CRITICAL: Vercel 413 Payload Limit - Infrastructure Issue

**Date:** January 5, 2026  
**Issue:** Vercel rejects requests > 10MB BEFORE reaching our code  
**Status:** ⚠️ **Infrastructure limitation - needs configuration**

---

## 🐛 Problem

The 413 error `FUNCTION_PAYLOAD_TOO_LARGE` is happening at **Vercel's infrastructure level**, not in our application code.

**This means:**
- ❌ Request is rejected by Vercel **BEFORE** it reaches our Next.js route handler
- ❌ Our audio sampling code **never runs** because the request never arrives
- ❌ This is a **Vercel function payload limit**, not an application issue

---

## 📊 Root Cause

**Vercel Function Payload Limits:**
- **Hobby/Pro Plan:** 4.5 MB maximum
- **Enterprise Plan:** Can be increased (contact support)
- **Edge Functions:** 1 MB maximum

**The request is rejected at the Vercel gateway level, before our code executes.**

---

## ✅ Solution Options

### Option 1: Configure Vercel Function Limits (Recommended)

Add configuration to `vercel.json` to increase payload limit:

```json
{
  "functions": {
    "apps/web/app/api/upload/fingerprint/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

**However:** This may not increase the payload limit - Vercel has hard limits.

---

### Option 2: Two-Step Upload Process (Best Solution)

**Architecture Change:**

1. **Step 1:** Mobile uploads file to Supabase Storage (bypasses Vercel limits)
2. **Step 2:** Mobile sends file URL to `/api/upload/fingerprint`
3. **Step 3:** Backend downloads from Supabase, samples, and fingerprints

**Benefits:**
- ✅ No Vercel payload limits
- ✅ Works for files of any size
- ✅ More scalable
- ✅ Better error handling

**Implementation:**

```typescript
// Mobile app
const uploadToStorage = async (file: File) => {
  // Upload to Supabase Storage first
  const { data, error } = await supabase.storage
    .from('temp-audio')
    .upload(`fingerprint-${Date.now()}.mp3`, file);
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('temp-audio')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
};

// Then call fingerprint API with URL
const response = await fetch('/api/upload/fingerprint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audioFileUrl: publicUrl, // URL instead of file
    artistName: artistName
  })
});
```

**Backend already supports this!** (See line 297-321 in route.ts)

---

### Option 3: Increase Vercel Plan

**Contact Vercel Support:**
- Upgrade to Enterprise plan
- Request payload limit increase to 20+ MB
- May have additional costs

---

## 🔧 Immediate Fix: Use Two-Step Upload

The backend **already supports** `audioFileUrl` parameter! We just need to update the mobile app to upload to storage first.

### Backend Support (Already Implemented)

```typescript
// apps/web/app/api/upload/fingerprint/route.ts:297-321
else if (audioFileUrl) {
  // Fetch from URL
  const response = await fetch(audioFileUrl);
  const arrayBuffer = await response.arrayBuffer();
  audioBuffer = Buffer.from(arrayBuffer);
  // ... then samples if > 10MB
}
```

**The backend is ready!** We just need to update the mobile app.

---

## 📱 Mobile App Changes Required

**Current (Broken):**
```typescript
// Sends file directly - hits Vercel 10MB limit
const formData = new FormData();
formData.append('audioFile', file);
fetch('/api/upload/fingerprint', { body: formData });
```

**New (Works):**
```typescript
// Step 1: Upload to Supabase Storage
const { data: uploadData } = await supabase.storage
  .from('temp-audio')
  .upload(`fingerprint-${Date.now()}.mp3`, file);

const { data: urlData } = supabase.storage
  .from('temp-audio')
  .getPublicUrl(uploadData.path);

// Step 2: Send URL to fingerprint API
const response = await fetch('/api/upload/fingerprint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audioFileUrl: urlData.publicUrl,
    artistName: artistName
  })
});
```

---

## 🎯 Recommended Action Plan

### Phase 1: Immediate (Today)
1. ✅ Update mobile app to use two-step upload
2. ✅ Upload file to Supabase Storage first
3. ✅ Send URL to fingerprint API
4. ✅ Backend already supports this!

### Phase 2: Configuration (Optional)
1. Add `vercel.json` function config (may not help)
2. Contact Vercel support about payload limits
3. Consider Enterprise plan if needed

---

## 📝 Vercel Configuration

Add to `vercel.json`:

```json
{
  "functions": {
    "apps/web/app/api/upload/fingerprint/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

**Note:** This may not increase payload limit, but it's worth trying.

---

## ✅ Verification

**After implementing two-step upload:**

1. **Mobile uploads file to Supabase Storage** ✅
2. **Mobile sends URL to fingerprint API** ✅
3. **Backend downloads from URL** ✅
4. **Backend samples if > 10MB** ✅
5. **Backend sends to ACRCloud** ✅
6. **No 413 errors** ✅

---

## 🔍 Why This Happens

**Vercel Request Flow:**
```
Mobile App
  ↓
Vercel Edge/Function Gateway ← 413 ERROR HERE (before our code)
  ↓
Next.js Route Handler (never reached)
  ↓
Our Audio Sampling Code (never runs)
```

**The request is rejected at the gateway level, so our code never executes.**

---

## 📞 Next Steps

1. **Update mobile app** to use two-step upload (Supabase Storage → URL)
2. **Test with 13.3 MB file** - should work now
3. **Monitor backend logs** for sampling messages
4. **Optional:** Configure Vercel function limits

---

**Status:** ⚠️ **Infrastructure limitation - mobile app needs update to use two-step upload**

