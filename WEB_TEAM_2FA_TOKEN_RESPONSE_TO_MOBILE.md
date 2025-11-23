# Web Team Response: 2FA Token Issue - RESOLVED

**Date:** November 23, 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Status:** ✅ **FIXED**

---

## 📋 Summary

We've identified and **fixed the issue** where the `/api/user/2fa/verify-code` endpoint was not returning `accessToken` and `refreshToken`. The endpoint now **always returns these tokens** in the response.

---

## ✅ What We Fixed

### **Issue Identified**
The endpoint was calling `generateLink()` but not properly extracting and returning the session tokens. A code comment even indicated this was incomplete: *"generateLink returns a link, but we need to extract tokens differently"*.

### **Solution Implemented**
We've updated the endpoint to use the correct Supabase pattern:
1. **Generate magic link** using `auth.admin.generateLink()` (gets `hashed_token`)
2. **Verify OTP** using `auth.verifyOtp()` with the `hashed_token` (creates session)
3. **Extract tokens** from the session object (`access_token` and `refresh_token`)
4. **Return tokens** in the API response

This follows Supabase's recommended pattern for server-side token generation with PKCE flow.

---

## 📨 API Response Format

### **Endpoint**
```
POST /api/user/2fa/verify-code
```

### **Request Format** (unchanged)
```json
{
  "sessionToken": "temp-session-uuid",
  "code": "123456"
}
```

### **Success Response Format** (UPDATED)
```json
{
  "success": true,
  "data": {
    "verified": true,
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.abc123def456...",
    "userId": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
    "email": "user@example.com",
    "message": "Verification successful"
  }
}
```

### **Token Locations**
- ✅ `responseData.data.accessToken` - **Now present**
- ✅ `responseData.data.refreshToken` - **Now present**
- ✅ `responseData.data.verified` - Always `true` on success
- ✅ `responseData.data.userId` - User UUID
- ✅ `responseData.data.email` - User email address

---

## 🔧 How to Use the Tokens on Mobile

### **Step 1: Extract Tokens from Response**
```typescript
const response = await fetch('/api/user/2fa/verify-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: yourSessionToken,
    code: sixDigitCode,
  }),
});

const responseData = await response.json();

if (responseData.success && responseData.data.verified) {
  const { accessToken, refreshToken } = responseData.data;
  
  // Step 2: Set Supabase session with these tokens
  await setSupabaseSession(accessToken, refreshToken);
}
```

### **Step 2: Set Supabase Session**

**Option A: Using Supabase Client's `setSession()` method**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Set the session using the tokens
const { data, error } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
});

if (error) {
  console.error('Failed to set session:', error);
} else {
  console.log('✅ Session established successfully');
  // User is now authenticated!
}
```

**Option B: Using `signInWithPassword()` workaround (if Option A doesn't work)**
```typescript
// If setSession() doesn't work, you may need to store tokens
// and use them with subsequent API calls
// This depends on your Supabase React Native setup
```

### **Step 3: Verify Session**
```typescript
const { data: { session }, error } = await supabase.auth.getSession();

if (session) {
  console.log('✅ User is authenticated');
  console.log('User ID:', session.user.id);
  // Navigate to dashboard
} else {
  console.error('❌ No session found');
}
```

---

## 🔍 Technical Details

### **Why We Need Both Tokens**

1. **`accessToken`** (JWT)
   - Short-lived token (typically 5 minutes to 1 hour)
   - Contains user claims and permissions
   - Used for authenticated API requests
   - Must be included in `Authorization: Bearer <token>` header

2. **`refreshToken`** (Unique string)
   - Long-lived token (doesn't expire but single-use)
   - Used to obtain new `accessToken` when it expires
   - Stored securely on client
   - **Never expose in URLs or logs**

### **Security Notes**

✅ **Server-side token generation** - Tokens are generated on the server using service role key  
✅ **HTTPS required** - All token transmission must be over HTTPS  
✅ **Secure storage** - Store `refreshToken` securely (e.g., Keychain on iOS, EncryptedSharedPreferences on Android)  
✅ **Token validation** - Tokens are validated by Supabase RLS policies  

---

## 🚀 Implementation Checklist for Mobile Team

- [ ] Update API response parsing to extract `accessToken` and `refreshToken`
- [ ] Implement `setSession()` call after successful 2FA verification
- [ ] Add error handling for token extraction failures
- [ ] Test session establishment after 2FA
- [ ] Verify user can access protected routes/resources
- [ ] Test token refresh flow (when `accessToken` expires)
- [ ] Ensure secure storage of `refreshToken`

---

## 🔄 "Already Verified" Response

If the session was already verified (e.g., user taps verify again), the endpoint now **also returns tokens**:

```json
{
  "success": true,
  "data": {
    "verified": true,
    "accessToken": "...",
    "refreshToken": "...",
    "userId": "...",
    "email": "...",
    "message": "Already verified"
  }
}
```

This ensures mobile apps can always establish a session even if verification was already completed.

---

## ❓ Common Questions

### **Q: Do we need to call a separate endpoint to get tokens?**
**A:** No. The tokens are now included in the `/api/user/2fa/verify-code` response.

### **Q: What if the verification fails?**
**A:** The response will have `success: false` and an `error` field. No tokens will be included.

### **Q: How long are the tokens valid?**
**A:** 
- `accessToken`: Short-lived (check your Supabase auth settings, typically 1 hour)
- `refreshToken`: Doesn't expire but can only be used once (10-second reuse window)

### **Q: What if tokens expire?**
**A:** Use the `refreshToken` to get a new `accessToken`:
```typescript
const { data, error } = await supabase.auth.refreshSession({
  refresh_token: refreshToken,
});
```

### **Q: How does the web app handle this?**
**A:** The web app has a re-sign-in flow that works with session storage. However, **tokens are now always returned** for mobile compatibility. The web app can continue using its existing flow if preferred.

---

## 🧪 Testing

### **Test Case 1: Successful Verification**
1. Submit valid 6-digit code
2. ✅ Verify response contains `accessToken` and `refreshToken`
3. ✅ Set Supabase session with tokens
4. ✅ Verify user can access protected resources

### **Test Case 2: Invalid Code**
1. Submit invalid 6-digit code
2. ✅ Verify response has `success: false`
3. ✅ Verify no tokens in response
4. ✅ Verify appropriate error message

### **Test Case 3: Already Verified**
1. Submit code after session is already verified
2. ✅ Verify response contains tokens
3. ✅ Verify session can be established

### **Test Case 4: Expired Session Token**
1. Submit code with expired `sessionToken`
2. ✅ Verify response has `success: false`
3. ✅ Verify error code is `INVALID_SESSION` or `SESSION_EXPIRED`

---

## 📝 Next Steps

1. **Test the endpoint** with your mobile app
2. **Update your code** to extract and use the tokens
3. **Set Supabase session** after successful verification
4. **Report any issues** if tokens are still missing or session establishment fails

---

## 🐛 If You Still Have Issues

If you encounter any problems:

1. **Check the response structure** - Log the full response to verify format
2. **Verify token format** - Ensure tokens are valid JWT strings
3. **Test session setting** - Confirm `setSession()` is called correctly
4. **Check Supabase client** - Ensure your Supabase client is properly initialized
5. **Review error messages** - Check both API errors and Supabase auth errors

---

## 📞 Contact

If you need further assistance or encounter any issues with the token implementation, please let us know with:
- Full API response (redact tokens in logs)
- Error messages (if any)
- Supabase client initialization code
- Session setting implementation

---

**Web App Team**  
November 23, 2025

---

## 📎 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Session Management](https://supabase.com/docs/reference/javascript/auth-setsession)
- [Supabase React Native Setup](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

