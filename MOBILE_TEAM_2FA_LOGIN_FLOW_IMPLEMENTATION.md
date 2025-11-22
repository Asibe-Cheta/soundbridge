# 🔐 2FA Login Flow Implementation Guide for Mobile Team

**Date:** November 22, 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Priority:** 🔴 **HIGH** - Critical for Security

---

## 📋 Overview

This document explains how the 2FA login flow is correctly implemented on the web app and provides step-by-step instructions for implementing the same flow on the mobile app.

**Current Issue:** Users with 2FA enabled are being logged in directly without being prompted for the 2FA code.

**Solution:** Implement the same login flow as the web app, which checks for 2FA requirement **after** email/password authentication but **before** allowing access to the app.

---

## 🔄 Complete 2FA Login Flow

### **Step-by-Step Flow Diagram**

```
1. User enters email + password
   ↓
2. Call Supabase signIn(email, password)
   ↓
3. ✅ Login succeeds → Get session token
   ↓
4. 🔍 Call /api/user/2fa/check-required (with session token)
   ↓
5. Check response:
   ├─ twoFactorRequired: false → ✅ Proceed to app
   └─ twoFactorRequired: true → ⚠️ Show 2FA screen
       ↓
6. User enters 6-digit code
   ↓
7. Call /api/user/2fa/verify-code (with sessionToken + code)
   ↓
8. ✅ Verification succeeds → Get new session tokens
   ↓
9. ✅ User is logged in → Proceed to app
```

---

## 🔑 Key Implementation Details

### **1. After Email/Password Login Succeeds**

**❌ WRONG (Current Mobile Implementation):**
```typescript
// User logs in with email/password
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (data?.session) {
  // ❌ WRONG: Immediately navigate to app
  navigation.navigate('Home');
}
```

**✅ CORRECT (Web App Implementation):**
```typescript
// User logs in with email/password
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (data?.session && data?.user) {
  // ✅ CORRECT: Check if 2FA is required BEFORE navigating
  const check2FAResponse = await fetch('/api/user/2fa/check-required', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.session.access_token}`, // Use the session token
    },
    body: JSON.stringify({
      userId: data.user.id,
    }),
  });

  const check2FAData = await check2FAResponse.json();

  if (check2FAData.success && check2FAData.data?.twoFactorRequired) {
    // 2FA is required - show 2FA screen
    // Store the sessionToken for verification
    setTwoFASessionToken(check2FAData.data.sessionToken);
    setRequires2FA(true);
    // DO NOT navigate to app yet
    return;
  }

  // No 2FA required - proceed to app
  navigation.navigate('Home');
}
```

---

### **2. API Endpoint: `/api/user/2fa/check-required`**

**Purpose:** Check if 2FA is required for a user after successful email/password login.

**Request:**
```http
POST /api/user/2fa/check-required
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "userId": "uuid" // Optional, can be derived from session
}
```

**Response (2FA Required):**
```json
{
  "success": true,
  "data": {
    "twoFactorRequired": true,
    "sessionToken": "hex-string-64-chars",
    "expiresIn": 300,
    "message": "Please verify your identity with a 2FA code"
  }
}
```

**Response (2FA Not Required):**
```json
{
  "success": true,
  "data": {
    "twoFactorRequired": false,
    "message": "No 2FA required for this user"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**Important Notes:**
- ✅ **MUST** be called **immediately after** email/password login succeeds
- ✅ **MUST** use the `access_token` from the login session
- ✅ If `twoFactorRequired: true`, you **MUST** show the 2FA screen
- ✅ Store the `sessionToken` - you'll need it for verification
- ⚠️ **DO NOT** navigate to the app if `twoFactorRequired: true`

---

### **3. Showing the 2FA Screen**

**When to Show:**
- When `check-required` returns `twoFactorRequired: true`
- User should see a screen asking for the 6-digit code from their authenticator app

**What to Store:**
- `sessionToken` from the `check-required` response
- User's email (for re-authentication after verification)

**What NOT to Do:**
- ❌ Do NOT navigate to the app
- ❌ Do NOT clear the session token
- ❌ Do NOT allow access to protected routes

---

### **4. API Endpoint: `/api/user/2fa/verify-code`**

**Purpose:** Verify the 6-digit TOTP code entered by the user.

**Request:**
```http
POST /api/user/2fa/verify-code
Content-Type: application/json

{
  "sessionToken": "hex-string-from-check-required",
  "code": "123456" // 6-digit code from authenticator app
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 3600,
    "message": "2FA verification successful"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Invalid verification code. Please try again.",
  "code": "INVALID_CODE"
}
```

**Important Notes:**
- ✅ Use the `sessionToken` from `check-required` response
- ✅ The `code` must be exactly 6 digits
- ✅ On success, you'll receive new `accessToken` and `refreshToken`
- ✅ You **MUST** update the Supabase session with these new tokens

---

### **5. After 2FA Verification Succeeds**

**✅ CORRECT Implementation:**
```typescript
// User enters 6-digit code
const verifyResponse = await fetch('/api/user/2fa/verify-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sessionToken: twoFASessionToken,
    code: twoFACode,
  }),
});

const verifyData = await verifyResponse.json();

if (verifyData.success) {
  // Update Supabase session with new tokens
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: verifyData.data.accessToken,
    refresh_token: verifyData.data.refreshToken,
  });

  if (sessionError) {
    // Handle error
    showError('Failed to establish session after 2FA verification');
    return;
  }

  // ✅ Now navigate to app
  navigation.navigate('Home');
} else {
  // Show error to user
  showError(verifyData.error || 'Invalid code');
}
```

---

## 📱 Mobile App Implementation Checklist

### **Step 1: Update Login Function**

- [ ] After `signInWithPassword` succeeds, call `/api/user/2fa/check-required`
- [ ] Use the `access_token` from the login session in the Authorization header
- [ ] Check if `twoFactorRequired: true`
- [ ] If true, show 2FA screen (do NOT navigate to app)
- [ ] If false, navigate to app

### **Step 2: Create 2FA Verification Screen**

- [ ] Create a new screen/component for 2FA code input
- [ ] Display instructions: "Enter the 6-digit code from your authenticator app"
- [ ] Input field for 6-digit code
- [ ] "Verify" button
- [ ] "Back to Login" button (optional)

### **Step 3: Implement 2FA Verification**

- [ ] Call `/api/user/2fa/verify-code` with `sessionToken` and `code`
- [ ] On success, update Supabase session with new tokens
- [ ] Navigate to app only after session is updated
- [ ] On failure, show error and allow retry

### **Step 4: Handle Edge Cases**

- [ ] Handle network errors gracefully
- [ ] Handle expired `sessionToken` (re-prompt for login)
- [ ] Handle invalid code (show error, allow retry)
- [ ] Handle rate limiting (show appropriate message)

---

## 🔍 Debugging Tips

### **Check if 2FA Check is Being Called**

Add logging:
```typescript
console.log('🔍 Checking 2FA requirement for user:', data.user.id);
console.log('📊 2FA check response:', check2FAData);
```

### **Verify Session Token is Being Sent**

Check the Authorization header:
```typescript
console.log('🔑 Using access token:', data.session.access_token.substring(0, 20) + '...');
```

### **Check API Response**

Log the full response:
```typescript
console.log('📊 2FA check response:', JSON.stringify(check2FAData, null, 2));
```

---

## 🚨 Common Mistakes to Avoid

### **❌ Mistake 1: Not Checking 2FA After Login**
```typescript
// ❌ WRONG
const { data } = await supabase.auth.signInWithPassword({ email, password });
if (data?.session) {
  navigation.navigate('Home'); // Bypasses 2FA!
}
```

### **❌ Mistake 2: Checking 2FA Before Login**
```typescript
// ❌ WRONG
const check2FA = await fetch('/api/user/2fa/check-required'); // No session yet!
const { data } = await supabase.auth.signInWithPassword({ email, password });
```

### **❌ Mistake 3: Not Using Session Token**
```typescript
// ❌ WRONG
const check2FA = await fetch('/api/user/2fa/check-required', {
  headers: {
    // Missing Authorization header!
  },
});
```

### **❌ Mistake 4: Navigating Before Verification**
```typescript
// ❌ WRONG
if (check2FAData.data?.twoFactorRequired) {
  setRequires2FA(true);
  navigation.navigate('Home'); // User bypassed 2FA!
}
```

---

## 📝 Complete Example Implementation

### **Login Screen (Pseudocode)**

```typescript
async function handleLogin(email: string, password: string) {
  try {
    // Step 1: Sign in with email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      return;
    }

    if (!data?.session || !data?.user) {
      showError('Login failed');
      return;
    }

    // Step 2: Check if 2FA is required
    const check2FAResponse = await fetch('https://www.soundbridge.live/api/user/2fa/check-required', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        userId: data.user.id,
      }),
    });

    if (!check2FAResponse.ok) {
      showError('Failed to check 2FA status');
      return;
    }

    const check2FAData = await check2FAResponse.json();

    // Step 3: Handle 2FA requirement
    if (check2FAData.success && check2FAData.data?.twoFactorRequired) {
      // Show 2FA screen
      setTwoFASessionToken(check2FAData.data.sessionToken);
      setRequires2FA(true);
      // DO NOT navigate - show 2FA screen instead
      return;
    }

    // Step 4: No 2FA required - proceed to app
    navigation.navigate('Home');
  } catch (error) {
    console.error('Login error:', error);
    showError('An unexpected error occurred');
  }
}
```

### **2FA Verification Screen (Pseudocode)**

```typescript
async function handle2FAVerification(code: string) {
  if (!code || code.length !== 6) {
    showError('Please enter a 6-digit code');
    return;
  }

  if (!twoFASessionToken) {
    showError('Session expired. Please log in again.');
    return;
  }

  try {
    setIsVerifying(true);

    // Step 1: Verify 2FA code
    const verifyResponse = await fetch('https://www.soundbridge.live/api/user/2fa/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionToken: twoFASessionToken,
        code: code,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      showError(verifyData.error || 'Invalid code');
      setIsVerifying(false);
      return;
    }

    // Step 2: Update Supabase session with new tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: verifyData.data.accessToken,
      refresh_token: verifyData.data.refreshToken,
    });

    if (sessionError || !sessionData?.session) {
      showError('Failed to establish session after verification');
      setIsVerifying(false);
      return;
    }

    // Step 3: Navigate to app
    navigation.navigate('Home');
  } catch (error) {
    console.error('2FA verification error:', error);
    showError('An unexpected error occurred');
    setIsVerifying(false);
  }
}
```

---

## 🔗 Related Documentation

- **2FA API Endpoints:** See `MOBILE_TEAM_2FA_CURRENT_STRUCTURE_UPDATE.md`
- **2FA Setup Flow:** See `MOBILE_TEAM_2FA_CURRENT_STRUCTURE_UPDATE.md` (Setup section)

---

## ❓ Questions?

If you have any questions or need clarification on any part of this implementation, please reach out to the web team.

**Key Takeaway:** The critical step is checking for 2FA requirement **immediately after** email/password login succeeds, but **before** allowing access to the app. This ensures users with 2FA enabled are always prompted for their code.

---

**Web App Team**  
November 22, 2025

