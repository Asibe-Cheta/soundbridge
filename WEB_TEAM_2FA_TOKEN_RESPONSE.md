# 🔐 2FA Verify-Code API Response - Token Issue Analysis

**Date:** November 23, 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Priority:** 🔴 **URGENT**  
**Status:** 📋 **ANALYSIS COMPLETE - AWAITING DECISION**

---

## 📋 Summary

Thank you for reporting the issue with tokens not being returned from `/api/user/2fa/verify-code`. We've analyzed the codebase and found a **discrepancy between the documentation and the actual implementation**.

**Good news:** We confirmed no code changes were made recently - the endpoint is in its original state.

**The issue:** The endpoint documentation says it should return `accessToken` and `refreshToken`, but the current implementation doesn't extract or return these tokens.

---

## 🔍 Current State Analysis

### **1. Endpoint Documentation (What It Should Do)**

The endpoint documentation at the top of `apps/web/app/api/user/2fa/verify-code/route.ts` states:

```typescript
/**
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "verified": true,
 *     "accessToken": "supabase-jwt-token",
 *     "refreshToken": "supabase-refresh-token"
 *   }
 * }
 */
```

**This confirms:** The endpoint **SHOULD** return tokens per our documentation.

### **2. Current Implementation (What It Actually Does)**

The current implementation:
1. ✅ Generates tokens using `supabaseAdmin.auth.admin.generateLink()` (line 330)
2. ✅ Validates the tokens were generated
3. ❌ **Does NOT extract tokens** from the response
4. ❌ **Returns only `verified: true`, `userId`, `email`, `message`** (line 400-410)

**Current response you're receiving:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "userId": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
    "email": "asibechetachukwu@gmail.com",
    "message": "Verification successful"
  }
}
```

### **3. Code Comments Indicate Intent**

Looking at the code (line 389-393), there's a comment that says:
```typescript
// Extract tokens from the properties if available
// Note: generateLink returns a link, but we need to extract tokens differently
// For now, we'll return success and let the client sign in again
```

**This suggests:** The tokens were meant to be extracted but the implementation was left incomplete.

### **4. Web App's Workaround**

Our web app doesn't use tokens from this endpoint. Instead, it:
1. Calls `/api/user/2fa/verify-code` to mark the session as verified
2. Signs in again with email/password
3. Checks 2FA status again (session is already verified, so login proceeds)

This workaround is why the web app works, but it's not ideal for mobile apps.

---

## 📊 Documentation Consistency Check

We checked all recent markdown files regarding 2FA:

### **✅ Consistent Documentation:**

1. **`MOBILE_TEAM_2FA_LOGIN_FLOW_IMPLEMENTATION.md`** (Nov 22) - States tokens should be returned
2. **`MOBILE_TEAM_2FA_ISSUES_RESPONSE.md`** (Nov 23) - States tokens should be returned
3. **`WEB_TEAM_2FA_ANSWERS_CRITICAL.md`** - Shows example of extracting tokens from `generateLink`
4. **Endpoint header comments** - State tokens should be returned

**All documentation is consistent:** Tokens **should** be returned.

---

## 🎯 The Issue

**Root Cause:** The endpoint implementation is incomplete - it generates tokens but doesn't extract them from the `generateLink()` response.

**According to our documentation** (`WEB_TEAM_2FA_ANSWERS_CRITICAL.md`), tokens should be extracted like this:

```typescript
const { data: authData } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: userData.user.email!,
});

// These are REAL Supabase tokens
const accessToken = authData.properties.access_token;
const refreshToken = authData.properties.refresh_token;
```

**But the current code** doesn't do this extraction - it just generates the tokens and moves on.

---

## 📱 Mobile Team's Expected Flow

According to your documentation, after 2FA verification, you expect:

```typescript
// Call verify-code endpoint
const verifyResponse = await fetch('/api/user/2fa/verify-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionToken, code }),
});

const verifyData = await verifyResponse.json();

if (verifyData.success) {
  // Extract tokens from response
  const accessToken = verifyData.data.accessToken;
  const refreshToken = verifyData.data.refreshToken;
  
  // Set Supabase session
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  
  // Navigate to app
  navigation.navigate('Home');
}
```

**This is exactly correct** per our documentation! The issue is that the endpoint isn't returning the tokens.

---

## ✅ What We Need to Do

To fix this properly, we need to:

1. **Extract tokens** from `generateLink()` response
2. **Return tokens** in the response as documented
3. **Remove redundant code** (there are two `generateLink()` calls)
4. **Test the fix** to ensure tokens are returned correctly

---

## ❓ Questions for You

Before we proceed with the fix, please confirm:

1. **Is this blocking your mobile app development?** 
   - If yes, we'll prioritize fixing it immediately.
   - If no, we can schedule it for the next update.

2. **Do you have a workaround in the meantime?**
   - You could temporarily do a second login after verification (like the web app does)
   - Or we can prioritize the fix ASAP

3. **Expected timeline?**
   - When do you need this fixed by?

---

## 🔧 Proposed Solution

We'll update the endpoint to:

1. Extract `accessToken` and `refreshToken` from `tokenData.properties`
2. Return them in the response as documented
3. Clean up the duplicate `generateLink()` call
4. Ensure the response format matches documentation exactly

**Expected fixed response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.abc123...",
    "userId": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
    "email": "asibechetachukwu@gmail.com",
    "message": "Verification successful"
  }
}
```

---

## 📝 Summary

- ✅ **No code changes made recently** - Endpoint is in original state
- ✅ **Documentation is consistent** - All docs say tokens should be returned
- ❌ **Implementation is incomplete** - Tokens generated but not extracted/returned
- ✅ **Your mobile implementation is correct** - You're doing exactly what the docs say
- 🔧 **Fix needed** - Extract and return tokens as documented

---

## 🚀 Next Steps

**Option 1: We fix it now (recommended)**
- We'll update the endpoint to return tokens
- Deploy the fix
- Test it with your mobile app

**Option 2: Temporary workaround**
- You can do a second login after verification (like web app)
- We'll fix it in the next update

**Option 3: Wait for confirmation**
- You let us know when you need it
- We'll schedule it accordingly

---

**Web App Team**  
November 23, 2025

**P.S.** Your mobile implementation is perfect - you're following our documentation exactly. The issue is on our end (incomplete implementation), not yours. We'll get this fixed! 🙏

