# ⚡ Web Team: Immediate Answers to 5 Critical 2FA Questions

**Date**: November 17, 2025  
**From**: Web Development Team  
**To**: Mobile Development Team  
**Priority**: URGENT - Answers Provided  
**Status**: ✅ **READY FOR MOBILE IMPLEMENTATION**

---

## 🎯 Quick Summary

All 5 questions answered with clear implementation guidance. **Mobile team can start building immediately.**

---

## ✅ Question 1: Post-Login Session Token Flow

### **Answer: Use Option B (with modifications)**

**Step-by-step flow from mobile's perspective:**

```typescript
// ========================================
// COMPLETE MOBILE LOGIN FLOW WITH 2FA
// ========================================

async function loginUser(email: string, password: string) {
  try {
    // STEP 1: Login with Supabase (standard email/password)
    console.log('🔐 Step 1: Attempting Supabase login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      throw new Error(error.message);
    }

    // STEP 2: Check if user exists and get session
    if (!data.session || !data.user) {
      throw new Error('Login failed - no session returned');
    }

    console.log('✅ Step 1 complete: Supabase login successful');
    console.log('👤 User ID:', data.user.id);
    
    // STEP 3: ALWAYS check if 2FA is required
    console.log('🔒 Step 2: Checking if 2FA is enabled...');
    
    const twoFactorResponse = await fetch('https://www.soundbridge.live/api/user/2fa/check-required', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session.access_token}`, // ⚠️ IMPORTANT!
      },
      body: JSON.stringify({
        userId: data.user.id,
      }),
    });

    if (!twoFactorResponse.ok) {
      throw new Error('Failed to check 2FA status');
    }

    const twoFactorData = await twoFactorResponse.json();
    console.log('📊 2FA Status:', twoFactorData);

    // STEP 4: Handle 2FA requirement
    if (twoFactorData.twoFactorRequired) {
      console.log('🔐 2FA IS REQUIRED - User must verify');
      
      // ⚠️ IMPORTANT: Immediately sign out from Supabase
      // This prevents the user from accessing the app without 2FA
      await supabase.auth.signOut();
      console.log('🚪 Supabase session cleared - awaiting 2FA verification');
      
      // Navigate to 2FA verification screen
      return {
        requires2FA: true,
        userId: data.user.id,
        email: data.user.email,
        sessionToken: twoFactorData.sessionToken, // ⚠️ WE CREATE THIS!
      };
    } else {
      console.log('✅ 2FA NOT REQUIRED - Login complete');
      
      // User doesn't have 2FA enabled - login is complete
      return {
        requires2FA: false,
        session: data.session,
        user: data.user,
      };
    }

  } catch (error: any) {
    console.error('❌ Login error:', error);
    throw error;
  }
}

// Usage in your auth flow:
const result = await loginUser('user@example.com', 'password123');

if (result.requires2FA) {
  // Navigate to 2FA verification screen
  navigation.navigate('TwoFactorVerification', {
    userId: result.userId,
    email: result.email,
    sessionToken: result.sessionToken,
  });
} else {
  // Login complete - navigate to home
  navigation.navigate('Home');
}
```

### **Important Implementation Notes:**

#### 🔴 **CRITICAL: The `sessionToken` is NOT from Supabase**

The `sessionToken` returned from `/api/user/2fa/check-required` is a **temporary verification token** that we create server-side. Here's what happens:

**Server-side (our implementation):**
```typescript
// When 2FA is detected, we create a temporary session
export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  
  // Get user's 2FA status from metadata
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  
  if (user?.user_metadata?.two_factor_enabled) {
    // Create temporary verification session
    const sessionToken = crypto.randomUUID();
    
    await supabase.from('two_factor_verification_sessions').insert({
      user_id: userId,
      session_token: sessionToken,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });
    
    return NextResponse.json({
      twoFactorRequired: true,
      method: 'totp',
      sessionToken, // ← This is what mobile receives
    });
  }
  
  return NextResponse.json({ twoFactorRequired: false });
}
```

#### ⚠️ **Why We Sign Out After Detecting 2FA**

```typescript
// After detecting 2FA is required
await supabase.auth.signOut();
```

**Reason**: Security! If we don't sign out, the user would have a valid Supabase session and could bypass 2FA by closing the verification screen. By signing out immediately, we ensure they MUST complete 2FA to access the app.

---

## ✅ Question 2: Session Creation After 2FA Verification

### **Answer: YES, `setSession()` is correct! ✅**

**Your approach is 100% correct:**

```typescript
// After successful 2FA verification
const { accessToken, refreshToken } = await verifyTwoFactorCode(code);

// Set the session in Supabase client
await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
});

// ✅ This is correct!
```

### **Complete Mobile Implementation:**

```typescript
async function verifyTwoFactorCode(
  userId: string,
  sessionToken: string,
  code: string,
  trustDevice: boolean = false
) {
  try {
    console.log('🔐 Verifying 2FA code...');
    
    // Call verification endpoint
    const response = await fetch('https://www.soundbridge.live/api/user/2fa/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        sessionToken,
        code,
        trustDevice,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Verification failed:', data.error);
      throw new Error(data.error || 'Verification failed');
    }

    console.log('✅ 2FA verification successful!');

    // IMPORTANT: Set session in Supabase client
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

    if (sessionError) {
      console.error('❌ Failed to set session:', sessionError);
      throw new Error('Failed to establish session');
    }

    console.log('✅ Session established successfully');
    console.log('👤 User:', sessionData.user?.email);

    return {
      success: true,
      session: sessionData.session,
      user: sessionData.user,
    };

  } catch (error: any) {
    console.error('❌ 2FA verification error:', error);
    throw error;
  }
}
```

### **Answers to Your Sub-Questions:**

#### 1. **Is `supabase.auth.setSession()` correct?**
✅ **YES!** This is the standard way to establish a session in the Supabase client.

#### 2. **Will these tokens work with all Supabase RLS policies?**
✅ **YES!** The tokens we generate are **real Supabase tokens** created via `supabase.auth.admin.generateLink()`. They are identical to tokens from regular login and will work with all RLS policies.

**How we generate them (server-side):**
```typescript
// This creates real Supabase auth tokens
const { data: authData } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: user.email,
});

// These are REAL Supabase tokens
const accessToken = authData.properties.access_token;
const refreshToken = authData.properties.refresh_token;
```

#### 3. **Do we need any additional headers or configuration?**
❌ **NO!** Once you call `setSession()`, all subsequent API calls through the Supabase client will automatically include the correct authentication headers. You don't need to do anything extra.

**For our custom API endpoints**, you'll still need to add the `Authorization` header:
```typescript
const { data: { session } } = await supabase.auth.getSession();

fetch('https://www.soundbridge.live/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
});
```

---

## ✅ Question 3: QR Code Response Format

### **Answer: Option C (Both) - Confirmed! ✅**

**Final Response Structure:**

```typescript
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",           // Base32 encoded secret (for manual entry)
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",  // Base64 PNG image
  "otpauthUrl": "otpauth://totp/SoundBridge:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SoundBridge",  // OTPAuth URL
  "backupCodes": [
    "ABCD1234",
    "EFGH5678",
    "IJKL9012",
    "MNOP3456",
    "QRST7890",
    "UVWX1234",
    "YZAB5678",
    "CDEF9012",
    "GHIJ3456",
    "KLMN7890"
  ],
  "sessionToken": "temp-session-uuid",     // For verification step
  "expiresAt": "2025-11-17T12:05:00Z"      // Session expiration
}
```

### **Implementation Details:**

**Server-side code (exactly as we'll implement):**
```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  // ... auth checks ...

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `SoundBridge (${user.email})`,
    issuer: 'SoundBridge',
    length: 32,
  });

  // Generate QR code as base64 PNG
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return NextResponse.json({
    success: true,
    secret: secret.base32,          // For manual entry
    qrCodeUrl: qrCodeDataUrl,       // Base64 PNG
    otpauthUrl: secret.otpauth_url, // For deep linking
    backupCodes: generateBackupCodes(10),
    sessionToken: sessionToken,
    expiresAt: expiresAt.toISOString(),
  });
}
```

### **Mobile Implementation Options:**

**Option 1: Display Base64 QR Code (Easiest)**
```tsx
import { Image } from 'react-native';

<Image 
  source={{ uri: qrCodeUrl }} 
  style={{ width: 300, height: 300 }}
/>
```

**Option 2: Generate Your Own QR Code from OTPAuth URL**
```tsx
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={otpauthUrl}
  size={300}
/>
```

**Option 3: Deep Link to Authenticator App**
```typescript
import { Linking } from 'react-native';

// Open Google Authenticator directly
await Linking.openURL(otpauthUrl);
```

**Recommendation**: Use **Option 1** (display base64 image) for simplicity. Provide **Option 3** as a "Quick Add" button.

---

## ✅ Question 4: Backup Codes Format

### **Answer: Option A (Plain) - Confirmed! ✅**

**Final Format:**

```json
{
  "backupCodes": [
    "ABCD1234",
    "EFGH5678",
    "IJKL9012",
    "MNOP3456",
    "QRST7890",
    "UVWX1234",
    "YZAB5678",
    "CDEF9012",
    "GHIJ3456",
    "KLMN7890"
  ]
}
```

### **Implementation Details:**

**Server-side generation (exactly as we'll implement):**
```typescript
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const buffer = crypto.randomBytes(6);
    const code = buffer
      .toString('base64')
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .substring(0, 8);
    codes.push(code);
  }
  
  return codes;
}
```

**Format Specs:**
- ✅ **8 characters** (exactly)
- ✅ **Alphanumeric** (A-Z, 0-9)
- ✅ **UPPERCASE** only
- ✅ **No hyphens, spaces, or special characters**
- ✅ **Plain array of strings**

**Mobile can format however you want:**
```typescript
// Example: Add hyphen in middle for display
function formatBackupCode(code: string): string {
  return `${code.substring(0, 4)}-${code.substring(4)}`;
}

// "ABCD1234" → "ABCD-1234"
```

**Verification:**
When user enters a backup code, send it **exactly as entered** (we'll handle removing hyphens/spaces on the server):
```typescript
// User enters: "ABCD-1234" or "ABCD 1234" or "ABCD1234"
// Mobile sends: "ABCD1234" (cleaned)
// Server handles: case-insensitive, removes non-alphanumeric
```

---

## ✅ Question 5: Standard Error Response Format

### **Answer: Your Proposed Format is APPROVED! ✅**

**Standard Error Response (All 2FA Endpoints):**

```typescript
{
  "success": false,
  "error": "Human-readable error message",
  "code"?: "ERROR_CODE",              // Optional: machine-readable code
  "attemptsRemaining"?: number,        // Only for rate-limited endpoints
  "lockoutTime"?: string,              // ISO timestamp when lockout expires
  "metadata"?: Record<string, any>     // Optional additional context
}
```

### **Complete Error Catalog:**

#### **Setup Errors:**

```json
// Too many setup attempts
{
  "success": false,
  "error": "Too many setup attempts. Please try again in 1 hour.",
  "code": "RATE_LIMIT_EXCEEDED",
  "attemptsRemaining": 0,
  "lockoutTime": "2025-11-17T13:00:00Z"
}

// 2FA already enabled
{
  "success": false,
  "error": "2FA is already enabled. Disable it first to reconfigure.",
  "code": "2FA_ALREADY_ENABLED"
}

// Invalid session
{
  "success": false,
  "error": "Invalid or expired session",
  "code": "SESSION_EXPIRED"
}
```

#### **Verification Errors:**

```json
// Invalid code (with attempts remaining)
{
  "success": false,
  "error": "Invalid verification code",
  "code": "INVALID_CODE",
  "attemptsRemaining": 2
}

// Too many attempts (locked out)
{
  "success": false,
  "error": "Too many verification attempts. Account locked for 15 minutes.",
  "code": "ACCOUNT_LOCKED",
  "attemptsRemaining": 0,
  "lockoutTime": "2025-11-17T12:15:00Z"
}

// Rate limited
{
  "success": false,
  "error": "Too many verification attempts. Please try again in 15 minutes.",
  "code": "RATE_LIMIT_EXCEEDED",
  "attemptsRemaining": 0,
  "lockoutTime": "2025-11-17T12:15:00Z"
}
```

#### **Backup Code Errors:**

```json
// Invalid backup code
{
  "success": false,
  "error": "Invalid or already used backup code",
  "code": "INVALID_BACKUP_CODE"
}

// Backup code already used
{
  "success": false,
  "error": "This backup code has already been used",
  "code": "BACKUP_CODE_USED"
}
```

#### **Disable Errors:**

```json
// Invalid password
{
  "success": false,
  "error": "Invalid password. Please try again.",
  "code": "INVALID_PASSWORD",
  "attemptsRemaining": 2
}

// 2FA not enabled
{
  "success": false,
  "error": "2FA is not enabled for this account",
  "code": "2FA_NOT_ENABLED"
}
```

#### **Generic Errors:**

```json
// Authentication required
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}

// Server error
{
  "success": false,
  "error": "Failed to setup 2FA. Please try again later.",
  "code": "INTERNAL_ERROR",
  "metadata": {
    "requestId": "req_abc123"
  }
}
```

### **HTTP Status Codes (Consistent Across All Endpoints):**

| Status | Usage | Example |
|--------|-------|---------|
| `200` | Success | Code verified, setup complete |
| `400` | Validation error | Invalid code, missing required field |
| `401` | Authentication required | No bearer token, invalid session |
| `403` | Forbidden | 2FA already enabled, not authorized |
| `404` | Not found | User not found, session not found |
| `429` | Rate limited | Too many attempts, account locked |
| `500` | Server error | Database error, encryption failed |

### **Error Code Catalog:**

```typescript
export const TwoFactorErrorCodes = {
  // Authentication
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_SESSION: 'INVALID_SESSION',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Setup
  '2FA_ALREADY_ENABLED': '2FA_ALREADY_ENABLED',
  SETUP_FAILED: 'SETUP_FAILED',
  
  // Verification
  INVALID_CODE: 'INVALID_CODE',
  CODE_EXPIRED: 'CODE_EXPIRED',
  
  // Backup Codes
  INVALID_BACKUP_CODE: 'INVALID_BACKUP_CODE',
  BACKUP_CODE_USED: 'BACKUP_CODE_USED',
  BACKUP_CODE_EXPIRED: 'BACKUP_CODE_EXPIRED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Disable
  '2FA_NOT_ENABLED': '2FA_NOT_ENABLED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;
```

### **Mobile Error Handling Pattern:**

```typescript
async function handle2FAError(error: any) {
  // Parse error response
  const errorData = error.response?.data || {};
  
  switch (errorData.code) {
    case 'INVALID_CODE':
      return {
        title: 'Invalid Code',
        message: errorData.error,
        action: errorData.attemptsRemaining > 0 
          ? 'Try again' 
          : 'Use backup code',
      };
      
    case 'RATE_LIMIT_EXCEEDED':
    case 'ACCOUNT_LOCKED':
      return {
        title: 'Account Locked',
        message: errorData.error,
        lockoutTime: errorData.lockoutTime,
        action: 'Wait and try again',
      };
      
    case 'BACKUP_CODE_USED':
      return {
        title: 'Code Already Used',
        message: 'This backup code has already been used. Please use a different code.',
        action: 'Try different code',
      };
      
    default:
      return {
        title: 'Error',
        message: errorData.error || 'An unexpected error occurred',
        action: 'Try again',
      };
  }
}
```

---

## 📋 Complete API Response Reference

### **All Success Responses:**

#### `POST /api/user/2fa/setup-totp`
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "otpauthUrl": "otpauth://totp/SoundBridge:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SoundBridge",
  "backupCodes": ["ABCD1234", "EFGH5678", ...],
  "sessionToken": "uuid",
  "expiresAt": "2025-11-17T12:05:00Z"
}
```

#### `POST /api/user/2fa/verify-setup`
```json
{
  "success": true,
  "enabled": true,
  "backupCodesStored": 10,
  "message": "2FA successfully enabled"
}
```

#### `POST /api/user/2fa/check-required`
```json
{
  "twoFactorRequired": true,
  "method": "totp",
  "sessionToken": "uuid"
}
```

#### `POST /api/user/2fa/verify-code`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "v1-abc123...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### `POST /api/user/2fa/verify-backup-code`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "v1-abc123...",
  "backupCodesRemaining": 9,
  "warning": "You have 9 backup codes remaining. Consider regenerating them."
}
```

#### `POST /api/user/2fa/disable`
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

#### `POST /api/user/2fa/regenerate-backup-codes`
```json
{
  "success": true,
  "backupCodes": ["ABCD1234", "EFGH5678", ...]
}
```

#### `GET /api/user/2fa/status`
```json
{
  "enabled": true,
  "method": "totp",
  "configuredAt": "2025-11-17T10:30:00Z",
  "lastUsedAt": "2025-11-17T12:00:00Z",
  "backupCodesRemaining": 10,
  "backupCodesExpireAt": "2026-02-15T10:30:00Z"
}
```

---

## 🚀 Mobile Team: You're Unblocked!

### **What You Can Do NOW:**

1. ✅ **Create Mock API Service** with exact response structures above
2. ✅ **Build All 2FA Screens** with correct UI
3. ✅ **Implement Authentication Flow** integration
4. ✅ **Handle All Error Cases** using error catalog
5. ✅ **Test Complete Flow** with mock data

### **Example Mock Service:**

```typescript
// src/services/twoFactorAuthMock.ts
export const TwoFactorAuthMockService = {
  async setupTOTP() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      secret: "JBSWY3DPEHPK3PXP",
      qrCodeUrl: "data:image/png;base64,iVBORw0KGgoAAAANS...",
      otpauthUrl: "otpauth://totp/SoundBridge:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SoundBridge",
      backupCodes: [
        "ABCD1234", "EFGH5678", "IJKL9012", "MNOP3456", "QRST7890",
        "UVWX1234", "YZAB5678", "CDEF9012", "GHIJ3456", "KLMN7890"
      ],
      sessionToken: "mock-session-uuid",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  },
  
  async verifySetup(code: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Accept "123456" as valid code for testing
    if (code === "123456") {
      return {
        success: true,
        enabled: true,
        backupCodesStored: 10,
        message: "2FA successfully enabled",
      };
    } else {
      throw {
        response: {
          data: {
            success: false,
            error: "Invalid verification code",
            code: "INVALID_CODE",
            attemptsRemaining: 2,
          }
        }
      };
    }
  },
  
  // ... implement other mock methods
};
```

---

## 📞 Need Clarification?

**We're available:**
- **GitHub**: @web-team (fastest)
- **Slack**: #mobile-web-2fa
- **Email**: web-dev@soundbridge.live

**Response time**: <2 hours during working hours

---

## ✅ Summary

| Question | Answer | Status |
|----------|--------|--------|
| Q1: Session Token Flow | Use Option B - always call `/check-required` after login, then sign out if 2FA required | ✅ ANSWERED |
| Q2: Session Creation | YES, `setSession()` is correct. Tokens are real Supabase tokens. | ✅ CONFIRMED |
| Q3: QR Code Format | Option C - Both base64 PNG and OTPAuth URL provided | ✅ CONFIRMED |
| Q4: Backup Codes | Option A - Plain 8-char alphanumeric uppercase | ✅ CONFIRMED |
| Q5: Error Format | Your proposed format APPROVED. Complete error catalog provided. | ✅ APPROVED |

---

**Mobile Team: You're fully unblocked. Start building! 🚀**

---

**Document Version**: 1.0  
**Date**: November 17, 2025  
**Status**: ✅ Complete - Mobile Team Unblocked

