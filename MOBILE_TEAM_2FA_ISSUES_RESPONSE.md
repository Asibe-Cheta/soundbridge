# 🔐 2FA Login Issues - Response from Web Team

**Date:** November 23, 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Priority:** 🔴 **URGENT**  
**Status:** ✅ **SOLUTIONS PROVIDED**

---

## 📋 Summary

This document addresses both critical issues you're experiencing:

1. **Navigation/State Problem** - User briefly sees home screen before 2FA screen
2. **Verify Button Not Working** - Button click doesn't trigger API call

Both issues have clear solutions provided below.

---

## 🚨 Issue #1: Navigation/State Problem

### **Root Cause Analysis**

You're correct - the `onAuthStateChange` listener fires **immediately** when `signInWithPassword` succeeds, setting the user state **before** you can check 2FA. This causes `AppNavigator` to show `MainTabs` because `user !== null`.

### **Solution: Block Navigation with Flag**

You need to set a flag **BEFORE** calling `signInWithPassword` that prevents navigation, and only clear it after 2FA check completes.

#### **Step 1: Add Flag to AuthContext**

```typescript
// In AuthContext.tsx

const [user, setUser] = useState<User | null>(null);
const [session, setSession] = useState<Session | null>(null);
const [isChecking2FA, setIsChecking2FA] = useState(false); // ✅ ADD THIS

// In onAuthStateChange listener
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log('Auth state changed:', event, session?.user?.email);
    
    // ✅ CRITICAL: Don't set user state if we're checking 2FA
    if (isChecking2FA && event === 'SIGNED_IN') {
      console.log('⏸️ 2FA check in progress - blocking navigation');
      // Don't set user/session yet - wait for 2FA check to complete
      return;
    }
    
    // Handle sign out events
    if (event === 'SIGNED_OUT' || !session) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }
    
    // For SIGNED_IN events (when not checking 2FA), set state normally
    if (event === 'SIGNED_IN' && session) {
      setSession(session);
      setUser(session.user);
      setLoading(false);
      return;
    }
    
    // ... rest of handler
  }
);
```

#### **Step 2: Update Login Flow**

```typescript
// In twoFactorAuthService.ts or your login service

async function loginWithTwoFactorCheck(email: string, password: string) {
  try {
    // ✅ STEP 1: Set flag BEFORE login to block navigation
    setIsChecking2FA(true);
    console.log('🚩 2FA check flag set - navigation blocked');
    
    // ✅ STEP 2: Sign in with email/password
    console.log('🔐 Step 1: Attempting Supabase login...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setIsChecking2FA(false); // Clear flag on error
      throw error;
    }
    
    if (!data?.session || !data?.user) {
      setIsChecking2FA(false); // Clear flag on failure
      throw new Error('Login failed - no session');
    }
    
    console.log('✅ Step 1 complete: Supabase login successful');
    
    // ✅ STEP 3: Check 2FA requirement IMMEDIATELY
    console.log('🔍 Step 2: Checking if 2FA is required...');
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
      setIsChecking2FA(false); // Clear flag on error
      throw new Error('Failed to check 2FA status');
    }
    
    const check2FAData = await check2FAResponse.json();
    console.log('📊 2FA check response:', check2FAData);
    
    // ✅ STEP 4: Handle 2FA requirement
    if (check2FAData.success && check2FAData.data?.twoFactorRequired) {
      console.log('🔒 2FA IS REQUIRED - User must verify');
      
      // Sign out from Supabase to prevent unauthorized access
      await supabase.auth.signOut();
      console.log('🚪 Signed out from Supabase - awaiting 2FA verification');
      
      // ✅ Keep flag set - don't clear it yet
      // This prevents navigation even after signOut
      
      return {
        requires2FA: true,
        sessionToken: check2FAData.data.sessionToken,
        email: email, // Store email for later
      };
    }
    
    // ✅ STEP 5: No 2FA required - clear flag and proceed
    console.log('✅ No 2FA required - proceeding to app');
    setIsChecking2FA(false); // Clear flag - allow navigation
    return {
      requires2FA: false,
    };
    
  } catch (error) {
    setIsChecking2FA(false); // Always clear flag on error
    throw error;
  }
}
```

#### **Step 3: Update AppNavigator**

```typescript
// In AppNavigator.tsx or your navigation component

const { user, isChecking2FA } = useAuth();

// ✅ CRITICAL: Don't navigate if 2FA check is in progress
if (isChecking2FA) {
  return <LoadingScreen />; // Or stay on current screen
}

// Normal navigation logic
if (user) {
  return <MainTabs />;
} else {
  return <AuthStack />;
}
```

### **Alternative Solution: Check 2FA Before Setting User State**

If you can't modify the `onAuthStateChange` handler easily, you can prevent the state update by checking 2FA **synchronously** before the event fires:

```typescript
// In your login function
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (data?.session) {
  // ✅ Check 2FA BEFORE onAuthStateChange fires
  // Do this synchronously if possible, or set a flag immediately
  const check2FA = await check2FARequired(data.session.access_token, data.user.id);
  
  if (check2FA.required) {
    // Sign out immediately - this will trigger SIGNED_OUT event
    await supabase.auth.signOut();
    // Navigate to 2FA screen
    return;
  }
  
  // Only proceed if 2FA not required
}
```

**Note:** This approach is trickier because `onAuthStateChange` might fire before your check completes. The flag-based approach is more reliable.

---

## 🚨 Issue #2: Verify Button Not Working

### **Root Cause Analysis**

Looking at your request format, I found **critical issues**:

1. ❌ **WRONG:** You're sending `sessionToken` as `Authorization: Bearer <sessionToken>`
2. ❌ **WRONG:** You're sending `userId` in the body (not needed)
3. ❌ **WRONG:** You're sending `trustDevice` in the body (not supported)
4. ✅ **CORRECT:** You're sending `code` in the body

### **Correct API Request Format**

The `/api/user/2fa/verify-code` endpoint expects:

**Request:**
```http
POST /api/user/2fa/verify-code
Content-Type: application/json

{
  "sessionToken": "hex-string-from-check-required",
  "code": "123456"  // 6-digit string, no spaces, no leading zeros needed
}
```

**❌ WRONG (What you're doing):**
```typescript
fetch('/api/user/2fa/verify-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`, // ❌ WRONG - sessionToken is NOT a Bearer token
  },
  body: JSON.stringify({
    userId: userId,           // ❌ NOT NEEDED
    sessionToken: sessionToken, // ✅ CORRECT (but also in header - wrong)
    code: code,               // ✅ CORRECT
    trustDevice: false,       // ❌ NOT SUPPORTED
  }),
});
```

**✅ CORRECT (What you should do):**
```typescript
fetch('https://www.soundbridge.live/api/user/2fa/verify-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // ✅ NO Authorization header needed
  },
  body: JSON.stringify({
    sessionToken: sessionToken, // ✅ In body only
    code: code,                  // ✅ 6-digit string
  }),
});
```

### **Complete Correct Implementation**

```typescript
const handleVerify = async () => {
  // Validation
  if (isLoading || lockoutTime) {
    console.log('⚠️ Verify blocked: isLoading=', isLoading, 'lockoutTime=', lockoutTime);
    return;
  }

  if (!twoFACode || twoFACode.length !== 6) {
    setError('Please enter a 6-digit code');
    return;
  }

  if (!sessionToken) {
    setError('Session expired. Please log in again.');
    return;
  }

  // Validate code format (6 digits only)
  if (!/^\d{6}$/.test(twoFACode)) {
    setError('Code must be exactly 6 digits');
    return;
  }

  try {
    setIsLoading(true);
    setError(null);
    
    console.log('🔐 Calling verify-code API...');
    console.log('📝 Session token:', sessionToken.substring(0, 20) + '...');
    console.log('📝 Code:', twoFACode);
    
    // ✅ CORRECT REQUEST FORMAT
    const response = await fetch('https://www.soundbridge.live/api/user/2fa/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ NO Authorization header
      },
      body: JSON.stringify({
        sessionToken: sessionToken, // ✅ In body
        code: twoFACode,            // ✅ 6-digit string
      }),
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Verification failed:', errorData);
      setError(errorData.error || 'Verification failed');
      setIsLoading(false);
      return;
    }

    const verifyData = await response.json();
    console.log('📊 Verification response:', verifyData);

    if (verifyData.success) {
      // ✅ Update Supabase session with new tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: verifyData.data.accessToken,
        refresh_token: verifyData.data.refreshToken,
      });

      if (sessionError || !sessionData?.session) {
        console.error('❌ Failed to set session:', sessionError);
        setError('Failed to establish session after verification');
        setIsLoading(false);
        return;
      }

      console.log('✅ 2FA verification successful - navigating to app');
      
      // ✅ Clear 2FA check flag
      setIsChecking2FA(false);
      
      // ✅ Navigate to app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } else {
      setError(verifyData.error || 'Invalid code');
      setIsLoading(false);
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
    setError('An unexpected error occurred');
    setIsLoading(false);
  }
};
```

### **Expected Response Format**

**Success Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.abc123...",
    "expiresIn": 3600,
    "message": "2FA verification successful"
  }
}
```

**Error Responses:**

1. **Invalid Code Format:**
```json
{
  "success": false,
  "error": "Invalid code format. Must be 6 digits.",
  "code": "INVALID_CODE_FORMAT"
}
```

2. **Invalid Code:**
```json
{
  "success": false,
  "error": "Invalid verification code. Please try again.",
  "code": "INVALID_CODE"
}
```

3. **Expired Session:**
```json
{
  "success": false,
  "error": "Session expired. Please log in again.",
  "code": "SESSION_EXPIRED"
}
```

4. **Account Locked:**
```json
{
  "success": false,
  "error": "Too many failed attempts. Try again in 15 minutes.",
  "code": "ACCOUNT_LOCKED",
  "retryAfter": 900
}
```

### **Code Format Requirements**

- ✅ **Format:** Exactly 6 digits (string)
- ✅ **Examples:** `"123456"`, `"000000"`, `"012345"`
- ❌ **Invalid:** `"12345"` (5 digits), `"1234567"` (7 digits), `"12 34 56"` (spaces), `123456` (number)

### **Why Your Button Might Not Be Working**

If the button still doesn't work after fixing the API call, check:

1. **Button is not disabled:**
```typescript
<TouchableOpacity
  onPress={handleVerify}
  disabled={isLoading || lockoutTime || !twoFACode || twoFACode.length !== 6}
  style={[
    styles.verifyButton,
    (isLoading || lockoutTime || !twoFACode || twoFACode.length !== 6) && styles.verifyButtonDisabled
  ]}
>
  <Text>Verify</Text>
</TouchableOpacity>
```

2. **Handler is properly bound:**
```typescript
// ✅ CORRECT
onPress={handleVerify}

// ❌ WRONG
onPress={handleVerify()} // This calls it immediately
```

3. **No overlapping views blocking touch:**
Check for absolute positioned views or overlays that might be blocking the button.

4. **React Native event handling:**
Try using `TouchableWithoutFeedback` or `Pressable` instead of `TouchableOpacity`.

---

## 🧪 Testing with Your User

**User ID:** `bd8a455d-a54d-45c5-968d-e4cf5e8d928e`  
**Email:** `asibechetachukwu@gmail.com`  
**2FA Status:** Enabled (TOTP)

**Session Token (from your logs):**
```
04d2e35e37e73d8b8b40cec3eba0ec1aeaa121c39da2b931c01fb7ae8286e1d6
```

### **Test Request (cURL)**

```bash
curl -X POST https://www.soundbridge.live/api/user/2fa/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "04d2e35e37e73d8b8b40cec3eba0ec1aeaa121c39da2b931c01fb7ae8286e1d6",
    "code": "123456"
  }'
```

**Note:** Replace `"123456"` with the actual current code from your authenticator app.

### **Expected Behavior**

1. If code is correct → Returns `success: true` with `accessToken` and `refreshToken`
2. If code is incorrect → Returns `success: false` with error message
3. If session expired → Returns `SESSION_EXPIRED` error
4. If too many attempts → Returns `ACCOUNT_LOCKED` error

---

## 📝 Complete Fixed Implementation

### **1. AuthContext.tsx Updates**

```typescript
// Add to state
const [isChecking2FA, setIsChecking2FA] = useState(false);

// Export in context value
const value = {
  user,
  session,
  loading,
  error,
  isChecking2FA,  // ✅ ADD THIS
  setIsChecking2FA, // ✅ ADD THIS
  signIn,
  signUp,
  signOut,
  signInWithProvider,
};

// Update onAuthStateChange
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    // ✅ Block navigation during 2FA check
    if (isChecking2FA && event === 'SIGNED_IN') {
      console.log('⏸️ 2FA check in progress - blocking navigation');
      return;
    }
    
    // ... rest of handler
  }
);
```

### **2. Login Service Updates**

```typescript
async function loginWithTwoFactorCheck(email: string, password: string) {
  setIsChecking2FA(true); // ✅ Set flag BEFORE login
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error || !data?.session) {
      setIsChecking2FA(false);
      throw error || new Error('Login failed');
    }
    
    // Check 2FA immediately
    const check2FA = await fetch('https://www.soundbridge.live/api/user/2fa/check-required', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ userId: data.user.id }),
    });
    
    const check2FAData = await check2FA.json();
    
    if (check2FAData.success && check2FAData.data?.twoFactorRequired) {
      await supabase.auth.signOut();
      // Keep flag set - don't clear it
      return {
        requires2FA: true,
        sessionToken: check2FAData.data.sessionToken,
        email: email,
      };
    }
    
    setIsChecking2FA(false); // Clear flag if no 2FA
    return { requires2FA: false };
    
  } catch (error) {
    setIsChecking2FA(false);
    throw error;
  }
}
```

### **3. Verify Code Implementation**

```typescript
const handleVerify = async () => {
  if (isLoading || !twoFACode || twoFACode.length !== 6 || !sessionToken) {
    return;
  }

  try {
    setIsLoading(true);
    
    const response = await fetch('https://www.soundbridge.live/api/user/2fa/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ NO Authorization header
      },
      body: JSON.stringify({
        sessionToken: sessionToken, // ✅ In body only
        code: twoFACode,            // ✅ 6-digit string
      }),
    });

    const verifyData = await response.json();

    if (verifyData.success) {
      await supabase.auth.setSession({
        access_token: verifyData.data.accessToken,
        refresh_token: verifyData.data.refreshToken,
      });
      
      setIsChecking2FA(false); // ✅ Clear flag
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } else {
      setError(verifyData.error || 'Invalid code');
    }
  } catch (error) {
    setError('An unexpected error occurred');
  } finally {
    setIsLoading(false);
  }
};
```

---

## ✅ Summary of Fixes

### **Issue #1: Navigation Problem**
- ✅ Add `isChecking2FA` flag to AuthContext
- ✅ Set flag BEFORE login
- ✅ Block navigation in `onAuthStateChange` when flag is set
- ✅ Clear flag only after 2FA check completes or verification succeeds

### **Issue #2: Verify Button**
- ✅ Remove `Authorization` header from verify-code request
- ✅ Remove `userId` and `trustDevice` from request body
- ✅ Send only `sessionToken` and `code` in body
- ✅ Ensure code is exactly 6 digits (string format)

---

## 🚀 Next Steps

1. **Implement the flag-based navigation blocking** (Issue #1)
2. **Fix the verify-code API request format** (Issue #2)
3. **Test with your test user** using the correct format
4. **Monitor logs** to ensure requests are being sent correctly

---

## ❓ Questions?

If you need clarification on any part of this implementation, please reach out. We can also schedule a debugging session if needed.

**Web App Team**  
November 23, 2025

