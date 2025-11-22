# 🔐 2FA Current Structure - Complete Update for Mobile Team

**Date**: November 22, 2025  
**From**: Web Team  
**To**: Mobile Team  
**Status**: ✅ **CURRENT & ACCURATE**  
**Priority**: 📋 **REFERENCE DOCUMENT**

---

## 🎯 **PURPOSE**

This document provides the **current, accurate** structure of the 2FA system as of November 22, 2025, after all fixes and improvements. Use this as the **single source of truth** for 2FA integration.

**Previous documents may contain outdated information.** This document supersedes:
- `WEB_TEAM_2FA_FIX_RESPONSE.md` (Nov 21)
- `MOBILE_2FA_INTEGRATION_READY.md` (Nov 17)
- `WEB_APP_2FA_IMPLEMENTATION_COMPLETE.md` (Nov 22 - partial)

---

## 📍 **ENDPOINT STRUCTURE**

### **Primary Endpoints (Use These):**

All 2FA endpoints are under `/api/user/2fa/`:

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| **GET** | `/api/user/2fa/status` | Get 2FA status and backup codes | ✅ **ACTIVE** |
| **POST** | `/api/user/2fa/setup-totp` | Generate QR code and secret | ✅ **ACTIVE** |
| **POST** | `/api/user/2fa/verify-setup` | Verify code and enable 2FA | ✅ **ACTIVE** |
| **POST** | `/api/user/2fa/disable` | Disable 2FA (requires TOTP code) | ✅ **ACTIVE** |
| **POST** | `/api/user/2fa/regenerate-backup-codes` | Generate new backup codes | ✅ **ACTIVE** |
| **POST** | `/api/user/2fa/verify-code` | Verify TOTP code during login | ✅ **ACTIVE** |
| **POST** | `/api/user/2fa/verify-backup-code` | Verify backup code during login | ✅ **ACTIVE** |
| **GET** | `/api/user/2fa/check-required` | Check if 2FA is required after login | ✅ **ACTIVE** |

### **Legacy Endpoints (Deprecated - Do Not Use):**

| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| POST | `/api/auth/2fa/setup` | ⚠️ **DEPRECATED** | Use `/api/user/2fa/setup-totp` instead |
| POST | `/api/auth/2fa/verify` | ⚠️ **DEPRECATED** | Use `/api/user/2fa/verify-setup` instead |
| POST | `/api/auth/2fa/status` | ⚠️ **DEPRECATED** | Use `/api/user/2fa/status` instead |

**Why Deprecated:**
- Old endpoints use outdated authentication method
- New endpoints use `getSupabaseRouteClient()` for proper cookie + Bearer token support
- Response formats may differ

---

## 🔐 **AUTHENTICATION**

### **Supported Methods:**

All endpoints support **both** authentication methods:

1. **Bearer Token** (Mobile App):
   ```typescript
   headers: {
     'Authorization': `Bearer ${accessToken}`,
     'Content-Type': 'application/json'
   }
   ```

2. **Cookies** (Web App):
   ```typescript
   credentials: 'include' // Automatically sends cookies
   ```

### **Implementation:**

All endpoints use `getSupabaseRouteClient(request, true)` which:
- ✅ Reads Bearer tokens from `Authorization` header
- ✅ Reads cookies from request
- ✅ Supports both simultaneously
- ✅ Works for mobile and web

---

## 📋 **ENDPOINT DETAILS**

### **1. GET /api/user/2fa/status**

**Purpose:** Get current 2FA status, backup codes count, and recent activity

**Request:**
```typescript
GET /api/user/2fa/status
Headers: {
  'Authorization': `Bearer ${token}`
}
```

**Response (2FA Enabled):**
```json
{
  "success": true,
  "enabled": true,
  "method": "totp",
  "configuredAt": "2025-11-22T17:30:00Z",
  "enabledAt": "2025-11-22T17:30:00Z",
  "backupCodesRemaining": 8,
  "backupCodesTotal": 10,
  "needsRegenerateBackupCodes": false,
  "recentActivity": [
    {
      "action": "enabled",
      "method": "totp",
      "success": true,
      "created_at": "2025-11-22T17:30:00Z",
      "ip_address": "192.168.1.1"
    }
  ]
}
```

**Response (2FA Disabled):**
```json
{
  "success": true,
  "enabled": false,
  "method": null,
  "configuredAt": null,
  "enabledAt": null,
  "backupCodesRemaining": 0,
  "backupCodesTotal": 0,
  "needsRegenerateBackupCodes": false,
  "recentActivity": []
}
```

**Key Fields:**
- `enabled`: **boolean** - Direct access (not nested!)
- `backupCodesRemaining`: **number** - Unused codes count
- `configuredAt`: **string|null** - ISO timestamp when enabled

---

### **2. POST /api/user/2fa/setup-totp**

**Purpose:** Generate a new TOTP secret and QR code for setup

**Request:**
```typescript
POST /api/user/2fa/setup-totp
Headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
Body: {} // Empty body
```

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "JBKD6VB6PEYS44SDME7T4NTGPVOWER2ROZJCYR2CFFLSQNRKO5KQ",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "otpauthUrl": "otpauth://totp/SoundBridge%20(user@example.com)?secret=JBKD6VB6PEYS44SDME7T4NTGPVOWER2ROZJCYR2CFFLSQNRKO5KQ&issuer=SoundBridge"
  }
}
```

**Important Notes:**
- ✅ **Automatically clears existing secret** if user had 2FA before
- ✅ **New secret generated each time** - user must scan new QR code
- ✅ Secret is **stored encrypted** in database immediately
- ✅ QR code contains the **exact secret** that's stored

**Mobile App Should:**
1. Display QR code image
2. Show manual entry code (`secret` field)
3. Allow user to scan or enter manually
4. Store `secret` temporarily for verification step

---

### **3. POST /api/user/2fa/verify-setup**

**Purpose:** Verify the TOTP code and complete 2FA setup (generates backup codes)

**Request:**
```typescript
POST /api/user/2fa/verify-setup
Headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
Body: {
  "code": "123456" // 6-digit code from authenticator app
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "ABC123-DEF456",
      "GHI789-JKL012",
      "MNO345-PQR678",
      // ... 10 codes total
    ]
  },
  "message": "2FA enabled successfully"
}
```

**Response (Invalid Code):**
```json
{
  "success": false,
  "error": "Invalid verification code. Please make sure you're using the current code from your authenticator app.",
  "code": "INVALID_CODE"
}
```

**Important Notes:**
- ✅ **Accepts secret from client** (for backward compatibility)
- ✅ **Prioritizes client-provided secret** over database secret
- ✅ **Updates database** with the secret used for verification
- ✅ **Generates 10 backup codes** after successful verification
- ✅ **Enables 2FA** only after successful verification

**Mobile App Should:**
1. Send the 6-digit code from authenticator app
2. Optionally send the `secret` from setup step (helps if database secret differs)
3. Display backup codes to user
4. Warn user to save codes securely
5. Update UI to show "2FA Enabled"

---

### **4. POST /api/user/2fa/disable**

**Purpose:** Disable 2FA for the user (requires TOTP code for security)

**Request:**
```typescript
POST /api/user/2fa/disable
Headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
Body: {
  "code": "123456" // 6-digit TOTP code (NOT password!)
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "2FA has been disabled for your account"
}
```

**Response (Invalid Code):**
```json
{
  "success": false,
  "error": "Invalid verification code",
  "code": "INVALID_CODE"
}
```

**Important Notes:**
- ✅ **Requires TOTP code** (not password!)
- ✅ **Deletes secret** from database
- ✅ **Deletes all backup codes**
- ✅ **Deletes verification sessions**
- ✅ **Logs audit event**

**Mobile App Should:**
1. Prompt user for 6-digit TOTP code
2. Send code to endpoint
3. Show success message
4. Update UI to show "2FA Disabled"
5. Show "Enable 2FA" button

---

### **5. POST /api/user/2fa/regenerate-backup-codes**

**Purpose:** Generate new backup codes (invalidates old ones)

**Request:**
```typescript
POST /api/user/2fa/regenerate-backup-codes
Headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
Body: {} // Empty body
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "NEW123-ABC456",
      "DEF789-GHI012",
      // ... 10 new codes
    ]
  }
}
```

**Important Notes:**
- ✅ **Invalidates all old backup codes**
- ✅ **Generates 10 new codes**
- ✅ **Requires 2FA to be enabled**

---

### **6. POST /api/user/2fa/verify-code**

**Purpose:** Verify TOTP code during login

**Request:**
```typescript
POST /api/user/2fa/verify-code
Headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
Body: {
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA verification successful"
}
```

---

### **7. POST /api/user/2fa/verify-backup-code**

**Purpose:** Verify backup code during login

**Request:**
```typescript
POST /api/user/2fa/verify-backup-code
Headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
Body: {
  "code": "ABC123-DEF456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backup code verified successfully",
  "data": {
    "backupCodesRemaining": 7
  }
}
```

---

### **8. GET /api/user/2fa/check-required**

**Purpose:** Check if user needs to complete 2FA after login

**Request:**
```typescript
GET /api/user/2fa/check-required
Headers: {
  'Authorization': `Bearer ${token}`
}
```

**Response:**
```json
{
  "required": true,
  "method": "totp"
}
```

---

## 🔄 **COMPLETE FLOW**

### **Enable 2FA Flow:**

```
1. User taps "Enable 2FA"
   ↓
2. POST /api/user/2fa/setup-totp
   → Returns: { secret, qrCode, otpauthUrl }
   ↓
3. Display QR code + manual entry code
   ↓
4. User scans QR code with authenticator app
   ↓
5. User enters 6-digit code
   ↓
6. POST /api/user/2fa/verify-setup
   Body: { code: "123456", secret: "..." } // secret optional
   → Returns: { backupCodes: [...] }
   ↓
7. Display backup codes
   ↓
8. User saves codes
   ↓
9. GET /api/user/2fa/status
   → Returns: { enabled: true, ... }
   ↓
10. UI shows "2FA Enabled" ✅
```

### **Disable 2FA Flow:**

```
1. User taps "Disable 2FA"
   ↓
2. Prompt for 6-digit TOTP code
   ↓
3. POST /api/user/2fa/disable
   Body: { code: "123456" }
   → Returns: { success: true }
   ↓
4. GET /api/user/2fa/status
   → Returns: { enabled: false, ... }
   ↓
5. UI shows "2FA Disabled" ✅
```

### **Login with 2FA Flow:**

```
1. User logs in with email/password
   ↓
2. GET /api/user/2fa/check-required
   → Returns: { required: true }
   ↓
3. Show 2FA code input screen
   ↓
4. User enters 6-digit code
   ↓
5. POST /api/user/2fa/verify-code
   Body: { code: "123456" }
   → Returns: { success: true }
   ↓
6. User logged in ✅
```

---

## ⚠️ **IMPORTANT BEHAVIOR NOTES**

### **1. New Secret on Each Setup**

**Critical:** Each time user clicks "Set Up 2FA", a **new secret is generated**.

**Why:**
- Security best practice
- Prevents reuse of old secrets
- Ensures fresh setup

**Impact:**
- ✅ User **must remove old entry** from authenticator app
- ✅ User **must scan new QR code**
- ✅ Old codes **will not work**

**Mobile App Should:**
- Show warning: "If you previously had 2FA, remove the old SoundBridge entry from your authenticator app before scanning this new QR code."

### **2. Secret Storage**

**How it works:**
1. Setup endpoint generates secret
2. Secret is **encrypted** with AES-256-GCM
3. Encrypted secret stored in `two_factor_secrets` table
4. QR code contains the **exact same secret**

**Verification:**
- Verify endpoint can use:
  - Client-provided secret (from setup step) - **prioritized**
  - Database secret (if client secret not provided)
- This ensures compatibility even if secrets differ

### **3. Disable Requires TOTP Code**

**Not Password!** Disable endpoint requires:
- ✅ 6-digit TOTP code from authenticator app
- ❌ NOT user's password

**Why:**
- More secure (proves user has authenticator app)
- Consistent with industry standards
- Prevents password-only attacks

---

## 🐛 **FIXES APPLIED (Nov 21-22, 2025)**

### **Fix #1: TOTP_ENCRYPTION_KEY Missing** ✅
- **Issue:** Setup endpoint returned encryption error
- **Fix:** Added `TOTP_ENCRYPTION_KEY` to Vercel environment variables
- **Status:** ✅ Fixed Nov 21

### **Fix #2: Status API Response Format** ✅
- **Issue:** Status returned nested `{ data: { enabled: true } }` but mobile expected flat `{ enabled: true }`
- **Fix:** Flattened response format
- **Status:** ✅ Fixed Nov 22

### **Fix #3: Authentication Method** ✅
- **Issue:** Old endpoints (`/api/auth/2fa/*`) didn't support Bearer tokens
- **Fix:** All endpoints now use `getSupabaseRouteClient()` for cookie + Bearer support
- **Status:** ✅ Fixed Nov 22

### **Fix #4: Secret Mismatch in Verification** ✅
- **Issue:** QR code secret didn't match stored secret
- **Fix:** Verify endpoint now prioritizes client-provided secret and ensures consistency
- **Status:** ✅ Fixed Nov 22

### **Fix #5: Disable Endpoint** ✅
- **Issue:** Disable endpoint expected password instead of TOTP code
- **Fix:** Changed to require TOTP code
- **Status:** ✅ Fixed Nov 22

---

## 🧪 **TESTING CHECKLIST**

### **Test 1: Enable 2FA**
- [ ] Call `POST /api/user/2fa/setup-totp`
- [ ] Verify QR code is returned
- [ ] Scan QR code with authenticator app
- [ ] Call `POST /api/user/2fa/verify-setup` with code
- [ ] Verify backup codes are returned
- [ ] Call `GET /api/user/2fa/status`
- [ ] Verify `enabled: true`

### **Test 2: Disable 2FA**
- [ ] Call `POST /api/user/2fa/disable` with TOTP code
- [ ] Verify success response
- [ ] Call `GET /api/user/2fa/status`
- [ ] Verify `enabled: false`

### **Test 3: Re-enable 2FA**
- [ ] Call `POST /api/user/2fa/setup-totp` again
- [ ] Verify **new QR code** is returned
- [ ] Verify old codes from authenticator **do not work**
- [ ] Scan new QR code
- [ ] Verify with new code
- [ ] Verify 2FA enabled

### **Test 4: Login with 2FA**
- [ ] Login with email/password
- [ ] Call `GET /api/user/2fa/check-required`
- [ ] Verify `required: true`
- [ ] Call `POST /api/user/2fa/verify-code` with TOTP code
- [ ] Verify login successful

---

## 📊 **RESPONSE FORMAT STANDARDS**

### **Success Response:**
```json
{
  "success": true,
  "data": { /* optional, for complex data */ },
  "message": "Optional success message"
}
```

### **Error Response:**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE" // Optional, for programmatic handling
}
```

### **Status Response (Special Case):**
```json
{
  "success": true,
  "enabled": true, // Direct access, not nested!
  "method": "totp",
  // ... other fields at root level
}
```

---

## 🔒 **SECURITY FEATURES**

### **Encryption:**
- ✅ TOTP secrets encrypted with **AES-256-GCM**
- ✅ Backup codes hashed with **bcrypt**
- ✅ Encryption key: `TOTP_ENCRYPTION_KEY` (64-char hex)

### **Validation:**
- ✅ 6-digit code format validation
- ✅ Rate limiting (backend)
- ✅ Session management
- ✅ Audit logging

### **Audit Trail:**
- ✅ All actions logged in `two_factor_audit_log`
- ✅ Records IP addresses
- ✅ Timestamps for all events
- ✅ Success/failure tracking

---

## 📞 **SUPPORT & QUESTIONS**

### **If You Encounter Issues:**

1. **Check Response Format:**
   ```typescript
   console.log('Response:', JSON.stringify(response, null, 2));
   ```

2. **Verify Authentication:**
   ```typescript
   // Ensure Bearer token is included
   headers: {
     'Authorization': `Bearer ${accessToken}`
   }
   ```

3. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Project → Logs
   - Filter by endpoint name
   - Look for error messages

4. **Contact Web Team:**
   - Share exact error message
   - Share request/response (sanitized)
   - Share user ID (for logs)

---

## ✅ **SUMMARY**

**Current Status:**
- ✅ All endpoints working
- ✅ Authentication supports Bearer tokens
- ✅ Response formats standardized
- ✅ Security features implemented
- ✅ Web app fully functional

**For Mobile Team:**
- ✅ Use `/api/user/2fa/*` endpoints
- ✅ Include Bearer token in headers
- ✅ Parse flat response format
- ✅ Handle new secret on each setup
- ✅ Require TOTP code for disable

**Next Steps:**
1. Test all endpoints with mobile app
2. Verify response parsing
3. Test complete flows
4. Report any issues

---

**Document Version:** 2.0  
**Last Updated:** November 22, 2025  
**Status:** ✅ **CURRENT & ACCURATE**

---

**Web Team**  
November 22, 2025

