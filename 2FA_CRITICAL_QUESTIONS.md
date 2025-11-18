# 🔥 Mobile Team: 5 Critical Questions Before Implementation

**Date:** November 17, 2025  
**From:** Mobile Development Team  
**To:** Web Development Team  
**Priority:** URGENT - Blocking Mobile Implementation  
**Status:** Awaiting Response

---

## Context

We've reviewed your comprehensive 2FA implementation response. **All approvals granted:**
- ✅ Timeline approved (Nov 25 - Dec 29)
- ✅ Tech stack approved (speakeasy, AES-256-GCM, Upstash Redis)
- ✅ Database schema approved
- ✅ No meeting needed - let's work in parallel

**We need answers to 5 critical questions to start mobile implementation immediately.**

---

## ❓ Question 1: Post-Login Session Token Flow

**Context:** When a user with 2FA enabled logs in with email/password, how do we obtain the `sessionToken` for verification?

**Current Supabase Login:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({ 
  email, 
  password 
});

// What does 'data' contain if 2FA is enabled?
```

**Clarification Needed:**

**Option A:** Does Supabase return a partial/temporary session that we should detect?
```typescript
{
  session: null,  // or partial session?
  user: { id: "uuid", email: "user@example.com" },
  // Some indicator that 2FA is required?
}
```

**Option B:** Do we always call `/api/user/2fa/check-required` after ANY successful login?
```typescript
// Step 1: Login with Supabase
const { data } = await supabase.auth.signInWithPassword({ email, password });

// Step 2: Always check 2FA status
const response = await fetch('/api/user/2fa/check-required', {
  method: 'POST',
  body: JSON.stringify({ userId: data.user.id })
});
```

**Option C:** Different approach?

**What we need:** Clear step-by-step flow from mobile's perspective.

---

## ❓ Question 2: Session Creation After 2FA Verification

**Context:** Your code shows using `supabase.auth.admin.generateLink()` to create session after successful 2FA verification.

**From your code:**
```typescript
// In /api/user/2fa/verify-code endpoint
const { data: authData } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: user.email,
});

return {
  accessToken: authData.properties.access_token,
  refreshToken: authData.properties.refresh_token,
}
```

**Mobile Implementation:**
```typescript
// After successful 2FA verification, mobile receives:
const { accessToken, refreshToken } = await verifyTwoFactorCode(code);

// Then mobile does:
await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
});

// Is this correct? ✅ or ❌
```

**Clarification Needed:**
1. Is `supabase.auth.setSession()` the correct way for mobile to establish session?
2. Will these tokens work with all Supabase RLS policies?
3. Do we need any additional headers or configuration?

---

## ❓ Question 3: QR Code Response Format

**Context:** For `POST /api/user/2fa/setup-totp`, what format will the QR code be in?

**Your code shows:**
```typescript
const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);
```

**Clarification Needed:** Response will include:

**Option A:** Base64 data URL only
```json
{
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**Option B:** OTPAuth URL only (mobile generates QR)
```json
{
  "otpauthUrl": "otpauth://totp/SoundBridge:user@example.com?secret=..."
}
```

**Option C:** Both (preferred)
```json
{
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "otpauthUrl": "otpauth://totp/SoundBridge:user@example.com?secret=...",
  "secret": "BASE32ENCODEDSECRET"  // For manual entry
}
```

**Mobile preference:** Option C (most flexible)

**Please confirm final response structure for this endpoint.**

---

## ❓ Question 4: Backup Codes Format

**Context:** Simple but important - backup code format.

**Clarification Needed:**

**Option A:** Plain alphanumeric (mobile adds formatting)
```json
{
  "backupCodes": [
    "ABCD1234",
    "EFGH5678",
    "IJKL9012"
  ]
}
```

**Option B:** Pre-formatted with hyphens
```json
{
  "backupCodes": [
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012"
  ]
}
```

**Mobile preference:** Option A (we'll format in UI as needed)

**Please confirm.**

---

## ❓ Question 5: Standard Error Response Format

**Context:** Need consistent error handling across all 2FA endpoints.

**Proposed Standard Error Format:**
```typescript
{
  "success": false,
  "error": "Human-readable error message",
  "code"?: "ERROR_CODE",  // Optional error code
  "attemptsRemaining"?: number,  // Only for rate-limited endpoints
  "lockoutTime"?: string,  // ISO timestamp, only when locked
  "metadata"?: Record<string, any>  // Optional additional context
}
```

**Examples:**

**Invalid code:**
```json
{
  "success": false,
  "error": "Invalid verification code",
  "attemptsRemaining": 2
}
```

**Rate limited:**
```json
{
  "success": false,
  "error": "Too many verification attempts. Please try again in 15 minutes.",
  "attemptsRemaining": 0,
  "lockoutTime": "2025-11-17T12:00:00Z"
}
```

**Generic error:**
```json
{
  "success": false,
  "error": "Failed to setup 2FA",
  "code": "SETUP_FAILED"
}
```

**Clarification Needed:**
1. Confirm all 2FA endpoints use this format
2. Any additional error fields we should expect?
3. Will HTTP status codes be consistent? (400 for validation, 429 for rate limit, 500 for server error)

---

## 📋 Summary: What We Need

1. **Session Token Flow** - Exact steps after email/password login
2. **Session Creation** - Confirm `setSession()` approach works
3. **QR Code Format** - Base64, OTPAuth URL, or both?
4. **Backup Codes** - Plain or pre-formatted?
5. **Error Format** - Confirm standard error response structure

---

## ⏱️ Response Urgency

**Mobile team is ready to implement TODAY.**

Once we have these answers, we can:
- ✅ Create mock API service with correct data structures
- ✅ Build all 2FA screens with proper UI
- ✅ Implement authentication flow integration
- ✅ Be ready to integrate with real APIs the moment they're available

**Please provide answers at your earliest convenience. We're blocking on these 5 questions.**

---

## 📞 Response Format

Feel free to respond inline to each question, or create a separate response document. Whatever's fastest for you.

Example inline response:
```
Q1: Post-Login Session Token Flow
A: Use Option B - always call /api/user/2fa/check-required after login...

Q2: Session Creation
A: Yes, setSession() is correct. Additional notes: ...

etc.
```

---

**Thank you for the quick turnaround! Looking forward to building this together.** 🚀

---

**Mobile Team Contact:**
- GitHub: @mobile-team
- Slack: #mobile-web-2fa
- Email: mobile-dev@soundbridge.live

