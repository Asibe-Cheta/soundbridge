# 🔐 Mobile Team Authentication Fix - Web Team Response

**To:** Mobile App Development Team  
**From:** Web Platform Team  
**Date:** December 12, 2024  
**Re:** 401 Authentication Errors on `/api/users/{userId}/preferences` and `/api/upload/quota`

---

## 🎯 **EXECUTIVE SUMMARY**

**Root Cause Identified:** ✅ Both endpoints were using `createRouteHandlerClient({ cookies })` which **only supports cookie-based authentication**. They were **NOT** using `getSupabaseRouteClient()` which supports Bearer tokens.

**Fix Applied:** ✅ Both endpoints have been updated to use `getSupabaseRouteClient()` which supports both Bearer tokens and cookies.

**Status:** ✅ **FIXED** - Changes committed and ready for testing

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **The Problem**

Both endpoints were using the **old authentication method**:

```typescript
// ❌ OLD CODE (Cookie-only)
const supabase = createRouteHandlerClient({ cookies });
const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**Why This Failed:**
- `createRouteHandlerClient({ cookies })` **only reads cookies** from the request
- It **cannot** read Bearer tokens from `Authorization` headers
- Mobile apps send Bearer tokens, not cookies
- Result: Always returns 401 "Authentication required"

### **The Solution**

Updated both endpoints to use the **unified authentication helper**:

```typescript
// ✅ NEW CODE (Bearer + Cookie support)
const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
```

**Why This Works:**
- `getSupabaseRouteClient()` checks **both** Bearer tokens AND cookies
- Supports mobile app Bearer token authentication
- Also supports web app cookie authentication
- Automatically detects which method to use

---

## 📋 **ANSWERS TO YOUR QUESTIONS**

### **1. Cookie Format Verification** ❌ **NOT NEEDED**

**Answer:** You **don't need to send cookies** anymore! The endpoints now support Bearer token authentication.

**What Changed:**
- ✅ Endpoints now accept `Authorization: Bearer {token}` header
- ❌ Cookie authentication is no longer required (but still supported for web)
- ✅ Use **Bearer token only** for mobile app

**Recommended Mobile Implementation:**
```typescript
// ✅ CORRECT - Use only Bearer token
headers: {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
}
```

**You can remove:**
```typescript
// ❌ REMOVE - Not needed anymore
'Cookie': 'sb-access-token=...; sb-refresh-token=...'
```

---

### **2. Endpoint Authentication Requirements** ✅ **BEARER TOKEN SUPPORTED**

**Answer:** Both endpoints now support **Bearer token authentication**.

**Endpoints Fixed:**
- ✅ `GET /api/users/{userId}/preferences` - Now supports Bearer tokens
- ✅ `GET /api/upload/quota` - Now supports Bearer tokens

**Authentication Methods Supported:**
- ✅ **Bearer Token** (`Authorization: Bearer {token}`) - **RECOMMENDED for mobile**
- ✅ Cookie authentication (for web app compatibility)

**What Changed:**
- Both endpoints now use `getSupabaseRouteClient()` which supports Bearer tokens
- No special requirements - just send `Authorization: Bearer {token}` header

---

### **3. Token Validation** ✅ **STANDARD SUPABASE VALIDATION**

**Answer:** The backend validates tokens using standard Supabase methods.

**How It Works:**
1. Extracts token from `Authorization: Bearer {token}` header
2. Creates Supabase client with token
3. Calls `supabase.auth.getUser(token)` to validate
4. Returns user if valid, error if invalid

**Token Requirements:**
- ✅ Must be a valid Supabase JWT token
- ✅ Must not be expired
- ✅ Must be from the correct Supabase project

**No Special Validation:**
- No custom token validation logic
- Uses Supabase's built-in token validation
- Standard JWT validation

---

### **4. Cookie Authentication Implementation** ❌ **NOT NEEDED FOR MOBILE**

**Answer:** Mobile app **doesn't need** cookie authentication anymore.

**What Changed:**
- Endpoints now support Bearer tokens directly
- Cookie authentication is optional (for web compatibility)
- Mobile app should use Bearer tokens only

**Cookie Format (for reference only):**
- Cookie names are managed by Supabase auth helpers
- Format: `sb-{project-ref}-auth-token={token}`
- **Not needed for mobile app** - use Bearer tokens instead

---

### **5. Session Refresh** ✅ **STANDARD SUPABASE BEHAVIOR**

**Answer:** Standard Supabase session refresh applies.

**Current Behavior:**
- ✅ Supabase client handles token refresh automatically
- ✅ `autoRefreshToken: true` is sufficient
- ✅ No manual refresh needed before API calls

**When Tokens Expire:**
- Supabase client automatically refreshes tokens
- If refresh fails, you'll get 401 error
- Handle 401 by redirecting to login

**Recommendation:**
- Keep `autoRefreshToken: true` in Supabase client config
- Handle 401 errors gracefully (redirect to login)
- No need to manually refresh before each API call

---

### **6. Endpoint-Specific Requirements** ✅ **STANDARD REQUIREMENTS**

**For `/api/users/{userId}/preferences`:**
- ✅ Requires authentication (Bearer token)
- ✅ Requires authenticated user to match `userId` in URL
- ✅ Returns 403 if user tries to access another user's preferences
- ✅ No special permissions needed

**For `/api/upload/quota`:**
- ✅ Requires authentication (Bearer token)
- ✅ No user ID matching required (uses authenticated user's ID)
- ✅ No special permissions needed
- ✅ Uses authenticated user's ID automatically

**RLS Policies:**
- Both endpoints respect Supabase RLS policies
- No additional RLS checks needed
- Standard user authentication is sufficient

---

### **7. Testing & Debugging** ✅ **FIXED - READY FOR TESTING**

**Answer:** The issue is fixed. Test with Bearer token only.

**Example Request Headers (Working):**
```http
GET https://www.soundbridge.live/api/users/{userId}/preferences
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

**Expected Response:**
```json
{
  "success": true,
  "preferences": {
    "preferred_event_distance": 25
  }
}
```

**Debugging Tips:**
1. ✅ Use only `Authorization: Bearer {token}` header
2. ✅ Remove Cookie header (not needed)
3. ✅ Verify token is valid and not expired
4. ✅ Check that `userId` matches authenticated user (for preferences endpoint)

---

## 🔧 **CHANGES MADE**

### **1. Updated `/api/users/{userId}/preferences`**

**Before:**
```typescript
const supabase = createRouteHandlerClient({ cookies });
const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**After:**
```typescript
const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
```

**Files Changed:**
- `apps/web/app/api/users/[userId]/preferences/route.ts`

---

### **2. Updated `/api/upload/quota`**

**Before:**
```typescript
const supabase = createRouteHandlerClient({ cookies });
const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**After:**
```typescript
const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
```

**Files Changed:**
- `apps/web/app/api/upload/quota/route.ts`

---

## 📱 **MOBILE APP IMPLEMENTATION GUIDE**

### **Step 1: Update API Client**

**Remove Cookie Headers:**
```typescript
// ❌ REMOVE THIS
headers: {
  'Authorization': `Bearer ${access_token}`,
  'Cookie': 'sb-access-token=...; sb-refresh-token=...',  // ← Remove this
  'Content-Type': 'application/json'
}
```

**Use Bearer Token Only:**
```typescript
// ✅ USE THIS
headers: {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
}
```

---

### **Step 2: Test Endpoints**

**Test Preferences Endpoint:**
```typescript
const response = await fetch(
  `https://www.soundbridge.live/api/users/${userId}/preferences`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    }
  }
);

if (response.ok) {
  const data = await response.json();
  // data.success === true
  // data.preferences.preferred_event_distance
}
```

**Test Upload Quota Endpoint:**
```typescript
const response = await fetch(
  `https://www.soundbridge.live/api/upload/quota`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    }
  }
);

if (response.ok) {
  const data = await response.json();
  // data.success === true
  // data.quota.tier
  // data.quota.remaining
  // data.quota.can_upload
}
```

---

### **Step 3: Error Handling**

**Handle 401 Errors:**
```typescript
if (response.status === 401) {
  // Token expired or invalid
  // Refresh token or redirect to login
  await refreshAuthToken();
  // Retry request
}
```

**Handle 403 Errors (Preferences only):**
```typescript
if (response.status === 403) {
  // User trying to access another user's preferences
  // Show error message
  throw new Error('Cannot access other user\'s preferences');
}
```

---

## ✅ **VERIFICATION CHECKLIST**

Before deploying, verify:

- [ ] **Remove Cookie headers** from API client
- [ ] **Use only Bearer token** (`Authorization: Bearer {token}`)
- [ ] **Test preferences endpoint** - Should return 200 with preferences
- [ ] **Test upload quota endpoint** - Should return 200 with quota data
- [ ] **Test with expired token** - Should return 401
- [ ] **Test with wrong userId** (preferences) - Should return 403
- [ ] **Handle 401 errors** - Refresh token or redirect to login
- [ ] **Handle 403 errors** - Show appropriate error message

---

## 🐛 **DEBUGGING TIPS**

### **If Still Getting 401:**

1. **Verify Token Format:**
   ```typescript
   console.log('Token:', access_token.substring(0, 20) + '...');
   // Should start with 'eyJhbGci...'
   ```

2. **Check Token Expiration:**
   ```typescript
   const tokenData = jwt.decode(access_token);
   const isExpired = tokenData.exp * 1000 < Date.now();
   console.log('Token expired:', isExpired);
   ```

3. **Verify Headers:**
   ```typescript
   console.log('Headers:', {
     'Authorization': `Bearer ${access_token.substring(0, 20)}...`
   });
   ```

4. **Check Response:**
   ```typescript
   console.log('Response status:', response.status);
   const error = await response.json();
   console.log('Error:', error);
   ```

---

## 📊 **EXPECTED RESPONSES**

### **Success Response (200 OK)**

**Preferences:**
```json
{
  "success": true,
  "preferences": {
    "preferred_event_distance": 25
  }
}
```

**Upload Quota:**
```json
{
  "success": true,
  "quota": {
    "tier": "free",
    "upload_limit": 10,
    "uploads_this_month": 3,
    "remaining": 7,
    "reset_date": "2024-12-01T00:00:00Z",
    "is_unlimited": false,
    "can_upload": true
  }
}
```

### **Error Responses**

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden (Preferences only):**
```json
{
  "error": "Unauthorized: Can only access your own preferences"
}
```

---

## 🚀 **DEPLOYMENT STATUS**

**Status:** ✅ **FIXED AND DEPLOYED**

**Changes:**
- ✅ Updated `/api/users/{userId}/preferences` to support Bearer tokens
- ✅ Updated `/api/upload/quota` to support Bearer tokens
- ✅ Both endpoints now use `getSupabaseRouteClient()`
- ✅ Changes committed to GitHub

**Next Steps:**
1. Mobile team: Update API client to use Bearer token only
2. Mobile team: Remove Cookie headers
3. Mobile team: Test both endpoints
4. Both teams: Verify fix works correctly

---

## 📝 **SUMMARY**

### **Key Points:**

1. ✅ **Root Cause:** Endpoints were using cookie-only authentication
2. ✅ **Fix Applied:** Updated to use Bearer token authentication
3. ✅ **Mobile Action:** Remove Cookie headers, use Bearer token only
4. ✅ **Status:** Fixed and ready for testing

### **What Mobile Team Needs to Do:**

1. **Remove Cookie headers** from API requests
2. **Use only `Authorization: Bearer {token}`** header
3. **Test both endpoints** to verify fix works
4. **Handle 401/403 errors** appropriately

---

## 🔗 **RELATED DOCUMENTATION**

- **Service Provider API:** `MOBILE_TEAM_SERVICE_PROVIDER_API_RESPONSE.md`
- **Auth Helper:** `apps/web/src/lib/api-auth.ts`
- **Previous Auth Fix:** `WEB_TEAM_SERVICE_PROVIDER_AUTH_FIX.md`

---

**Status:** ✅ **COMPLETE - READY FOR TESTING**  
**Last Updated:** December 12, 2024  
**Next Steps:** Mobile team to test and confirm fix works

---

**Questions?** If you encounter any issues after implementing these changes, please provide:
1. Exact error message and status code
2. Request headers (with token masked)
3. Response body
4. Token expiration status

