# Web Team Response: Login-Initiate Endpoint - COMPLETE

**Date:** November 23, 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Status:** ✅ **IMPLEMENTED & READY FOR TESTING**

---

## 📋 Summary

We've successfully implemented the `/api/auth/login-initiate` endpoint and updated the verification endpoints to support the new secure login flow. This prevents the brief app flash by checking 2FA requirement **before** creating a session.

---

## ✅ What Was Implemented

### **1. New Endpoint: POST /api/auth/login-initiate**

**Location:** `apps/web/app/api/auth/login-initiate/route.ts`

**Purpose:** Validates credentials and checks 2FA requirement **BEFORE** creating a session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response (2FA Required):**
```json
{
  "success": true,
  "requires2FA": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "verificationSessionId": "uuid"
  }
}
```

**Response (No 2FA):**
```json
{
  "success": true,
  "requires2FA": false,
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      ...
    }
  }
}
```

**Response (Invalid Credentials):**
```json
{
  "success": false,
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

### **2. Database Migration**

**File:** `database/add_email_password_to_2fa_sessions.sql`

Added columns to `two_factor_verification_sessions` table:
- `email` (TEXT) - User email for re-authentication
- `password_hash` (TEXT) - Encrypted password (AES-256-GCM) for re-authentication

**⚠️ IMPORTANT:** You need to run this migration in your Supabase database:
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE two_factor_verification_sessions
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE two_factor_verification_sessions
ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_2fa_sessions_email ON two_factor_verification_sessions(email);
```

### **3. Updated Verification Endpoints**

Both endpoints now accept **either** `sessionToken` (legacy) **or** `verificationSessionId` (new):

#### **POST /api/user/2fa/verify-code**

**Request (New):**
```json
{
  "verificationSessionId": "uuid",
  "code": "123456"
}
```

**Request (Legacy - still supported):**
```json
{
  "sessionToken": "hex-string",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "userId": "uuid",
    "email": "user@example.com",
    "message": "Verification successful"
  }
}
```

#### **POST /api/user/2fa/verify-backup-code**

**Request (New):**
```json
{
  "verificationSessionId": "uuid",
  "backupCode": "A3F2-K8L9M0"
}
```

**Request (Legacy - still supported):**
```json
{
  "sessionToken": "hex-string",
  "backupCode": "A3F2-K8L9M0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "userId": "uuid",
    "email": "user@example.com",
    "remainingCodes": 7,
    "message": "Verification successful"
  }
}
```

---

## 🔐 Security Implementation

### **Password Storage**

- Passwords are **encrypted** using AES-256-GCM (same encryption as TOTP secrets)
- Stored temporarily in `two_factor_verification_sessions` table
- **Automatically expires** with the session (5 minutes)
- **Never logged** or exposed in error messages

### **Authentication Flow**

1. **Credentials validated** using Supabase Auth
2. **User signed out immediately** to prevent session creation
3. **2FA status checked** from database
4. **If 2FA required:** Credentials encrypted and stored in verification session
5. **After 2FA verification:** Credentials decrypted and used to create session
6. **Session tokens returned** to mobile app

---

## 🔄 How It Works

### **Flow Diagram**

```
1. Mobile App → POST /api/auth/login-initiate
   ├─ Validates credentials (signs in)
   ├─ Signs out immediately (no session created)
   └─ Checks 2FA requirement
   
2a. If 2FA Required:
    ├─ Creates verification session (5 min expiry)
    ├─ Encrypts and stores password
    └─ Returns verificationSessionId
    
2b. If No 2FA:
    ├─ Re-authenticates user
    └─ Returns tokens directly
    
3. Mobile App → POST /api/user/2fa/verify-code
   ├─ Verifies TOTP code
   ├─ Decrypts stored password
   ├─ Authenticates user
   └─ Returns tokens
```

---

## 📝 Implementation Details

### **Backward Compatibility**

✅ **Fully backward compatible** - Existing web app flow continues to work:
- Web app uses `sessionToken` (legacy flow)
- Mobile app uses `verificationSessionId` (new flow)
- Both are supported simultaneously

### **Token Generation**

When using `verificationSessionId`:
- Uses stored encrypted credentials for direct authentication
- Faster and more secure than generateLink flow

When using `sessionToken` (legacy):
- Uses generateLink + verifyOtp pattern
- Maintains compatibility with existing web app

---

## 🧪 Testing Checklist

### **Before Testing:**

1. ✅ Run database migration (see above)
2. ✅ Deploy code to production
3. ✅ Verify environment variables are set:
   - `TOTP_ENCRYPTION_KEY` (for password encryption)

### **Test Cases:**

1. **Login with 2FA enabled:**
   - ✅ Should NOT show MainTabs flash
   - ✅ Should return `requires2FA: true` with `verificationSessionId`
   - ✅ After 2FA verification, should return tokens
   - ✅ Should navigate to MainTabs after verification

2. **Login without 2FA:**
   - ✅ Should return `requires2FA: false` with tokens
   - ✅ Should navigate directly to MainTabs

3. **Invalid credentials:**
   - ✅ Should return error: "Invalid email or password"

4. **Backup code verification:**
   - ✅ Should accept `verificationSessionId`
   - ✅ Should return tokens after verification

---

## 🚨 Important Notes

1. **Database Migration Required:** You **must** run the SQL migration before testing. The endpoint will fail if the columns don't exist.

2. **Password Encryption:** Uses the same `TOTP_ENCRYPTION_KEY` environment variable. Ensure it's set in your production environment.

3. **Session Expiry:** Verification sessions expire after 5 minutes. Users must complete 2FA within this time.

4. **Backward Compatibility:** The web app's existing flow (using `sessionToken`) continues to work. No changes needed to web app.

---

## 📞 Next Steps

1. **Run database migration** in Supabase SQL Editor
2. **Deploy code** to production (Vercel will auto-deploy on push)
3. **Test the flow** with mobile app
4. **Report any issues** if found

---

## 🔗 Related Files

- **Endpoint:** `apps/web/app/api/auth/login-initiate/route.ts`
- **Migration:** `database/add_email_password_to_2fa_sessions.sql`
- **Updated:** `apps/web/app/api/user/2fa/verify-code/route.ts`
- **Updated:** `apps/web/app/api/user/2fa/verify-backup-code/route.ts`

---

**Status:** ✅ Ready for testing  
**Deployment:** Will auto-deploy to https://soundbridge.live on push to main

