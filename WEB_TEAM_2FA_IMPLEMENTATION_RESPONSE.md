# 🔐 Web Team Response: 2FA Implementation for SoundBridge

**Date**: November 17, 2025  
**From**: Web Development Team  
**To**: Mobile Development Team  
**Status**: ✅ **APPROVED - Implementation Planned**  
**Priority**: High (Security Enhancement)

---

## 📋 Executive Summary

Thank you for the comprehensive 2FA implementation specification! We've reviewed your requirements and are **excited to implement this security enhancement**. This document provides:

1. ✅ **Timeline & Phasing** - Realistic implementation schedule
2. ✅ **Technology Choices** - Selected stack and libraries
3. ✅ **Architecture Decisions** - How we'll build this
4. ✅ **API Specifications** - Refined endpoint details
5. ✅ **Security Implementation** - Encryption, rate limiting, storage
6. ✅ **Testing Strategy** - Comprehensive test plan
7. ✅ **Answers to Your Questions** - All 7 questions addressed

---

## 🎯 1. Implementation Approval & Timeline

### ✅ **APPROVED FOR IMPLEMENTATION**

We commit to delivering a production-ready 2FA system with the following timeline:

### 📅 **Implementation Schedule**

| Phase | Duration | Target Completion | Status |
|-------|----------|-------------------|--------|
| **Phase 1**: Database & Core Setup | Week 1-2 | Dec 1, 2025 | 🟢 Ready to Start |
| **Phase 2**: Authentication Flow | Week 3 | Dec 8, 2025 | 🟡 Pending Phase 1 |
| **Phase 3**: Management & Recovery | Week 4 | Dec 15, 2025 | 🟡 Pending Phase 2 |
| **Phase 4**: Testing & Documentation | Week 5 | Dec 22, 2025 | 🟡 Pending Phase 3 |
| **Phase 5**: Mobile Integration Testing | Week 6 | Dec 29, 2025 | 🟡 Pending Phase 4 |

**Target Production Launch**: January 5, 2026

---

## 🛠️ 2. Technology Stack Decisions

### 2.1 TOTP Library: `speakeasy` ✅

**Chosen Library**: [`speakeasy`](https://github.com/speakeasyjs/speakeasy) (Node.js)

**Rationale**:
- ✅ Battle-tested (1M+ downloads/week)
- ✅ RFC 6238 compliant (TOTP)
- ✅ RFC 4226 compliant (HOTP)
- ✅ Supports QR code generation
- ✅ TypeScript definitions available
- ✅ Active maintenance
- ✅ Used by GitHub, Cloudflare, Auth0

**Installation**:
```bash
npm install speakeasy qrcode @types/speakeasy @types/qrcode
```

**Example Usage**:
```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Generate secret
const secret = speakeasy.generateSecret({
  name: 'SoundBridge',
  issuer: 'SoundBridge',
  length: 32,
});

// Generate QR code
const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

// Verify token
const verified = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userProvidedToken,
  window: 2, // ±2 time steps (60 seconds tolerance)
});
```

### 2.2 Encryption: Application-Level with Environment Variables

**Chosen Approach**: AES-256-GCM encryption with environment-based keys

**Rationale**:
- ✅ No additional infrastructure cost (vs. AWS KMS)
- ✅ Fast (no external API calls)
- ✅ Suitable for our scale
- ✅ Easy to migrate to KMS later if needed

**Implementation**:
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptSecret(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Environment Variables Required**:
```bash
# Generate with: openssl rand -hex 32
TOTP_ENCRYPTION_KEY=your-64-character-hex-key
```

### 2.3 Rate Limiting: Upstash Redis + Vercel Edge Middleware

**Chosen Solution**: Upstash Redis (serverless, edge-optimized)

**Rationale**:
- ✅ Serverless (no infra management)
- ✅ Global edge network
- ✅ Pay-per-request pricing
- ✅ REST API (no connection pooling issues)
- ✅ Vercel-optimized

**Implementation**:
```typescript
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 2FA verification rate limit: 5 attempts per 15 minutes
const verificationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: '2fa_verify',
});

// 2FA setup rate limit: 3 attempts per hour
const setupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: '2fa_setup',
});
```

### 2.4 Backup Code Generation

**Implementation**:
```typescript
import crypto from 'crypto';

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const buffer = crypto.randomBytes(6);
    const code = buffer.toString('base64')
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .substring(0, 8);
    codes.push(code);
  }
  
  return codes;
}

export async function hashBackupCode(code: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(code, 12); // Strong hashing
}

export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(code, hash);
}
```

---

## 🗄️ 3. Database Schema (Refined)

### 3.1 We'll Use Supabase's `auth.users` Metadata

Instead of altering the `users` table, we'll store 2FA data in Supabase's built-in `user_metadata`:

```typescript
// Stored in auth.users.user_metadata
{
  two_factor_enabled: boolean;
  two_factor_method: 'totp';
  two_factor_configured_at: string; // ISO timestamp
  two_factor_last_used_at: string; // ISO timestamp
}
```

### 3.2 New Tables (Approved Schema)

#### **`two_factor_secrets`**
```sql
CREATE TABLE IF NOT EXISTS two_factor_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_secret TEXT NOT NULL, -- AES-256-GCM encrypted TOTP secret
    method VARCHAR(20) NOT NULL DEFAULT 'totp',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_2fa UNIQUE(user_id)
);

CREATE INDEX idx_2fa_secrets_user_id ON two_factor_secrets(user_id);

-- Enable RLS
ALTER TABLE two_factor_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own 2FA secrets"
  ON two_factor_secrets
  FOR ALL
  USING (auth.uid() = user_id);
```

#### **`two_factor_backup_codes`**
```sql
CREATE TABLE IF NOT EXISTS two_factor_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL, -- bcrypt hashed
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',
    
    CONSTRAINT unique_code_hash UNIQUE(code_hash)
);

CREATE INDEX idx_backup_codes_user_id ON two_factor_backup_codes(user_id);
CREATE INDEX idx_backup_codes_used ON two_factor_backup_codes(used, expires_at);

-- Enable RLS
ALTER TABLE two_factor_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own backup codes"
  ON two_factor_backup_codes
  FOR ALL
  USING (auth.uid() = user_id);
```

#### **`two_factor_verification_sessions`**
```sql
CREATE TABLE IF NOT EXISTS two_factor_verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    verified BOOLEAN DEFAULT FALSE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_2fa_sessions_token ON two_factor_verification_sessions(session_token);
CREATE INDEX idx_2fa_sessions_expires ON two_factor_verification_sessions(expires_at);

-- Enable RLS (service role only)
ALTER TABLE two_factor_verification_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON two_factor_verification_sessions
  FOR ALL
  USING (auth.role() = 'service_role');
```

#### **`two_factor_audit_log`**
```sql
CREATE TABLE IF NOT EXISTS two_factor_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'enabled', 'disabled', 'verified', 'failed', 'backup_used'
    method VARCHAR(20), -- 'totp', 'backup_code'
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_2fa_audit_user_id ON two_factor_audit_log(user_id);
CREATE INDEX idx_2fa_audit_created_at ON two_factor_audit_log(created_at DESC);
CREATE INDEX idx_2fa_audit_action ON two_factor_audit_log(action);

-- Enable RLS
ALTER TABLE two_factor_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit log"
  ON two_factor_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs"
  ON two_factor_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

---

## 🔌 4. API Endpoints (Implementation Details)

### 4.1 Setup Flow

#### **POST `/api/user/2fa/setup-totp`**

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { encryptSecret } from '@/src/lib/encryption';
import { generateBackupCodes, hashBackupCode } from '@/src/lib/backup-codes';
import { Redis } from '@upstash/redis';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Rate limiting (3 attempts per hour)
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    const { success, remaining } = await redis.ratelimit.slidingWindow(3, '1 h').limit(`2fa_setup:${user.id}`);
    if (!success) {
      return NextResponse.json({ 
        error: 'Too many setup attempts. Please try again in 1 hour.',
        attemptsRemaining: remaining 
      }, { status: 429 });
    }

    // 3. Check if 2FA already enabled
    const { data: existingSecret } = await supabase
      .from('two_factor_secrets')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (existingSecret) {
      return NextResponse.json({ 
        error: '2FA is already enabled. Disable it first to reconfigure.' 
      }, { status: 400 });
    }

    // 4. Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `SoundBridge (${user.email})`,
      issuer: 'SoundBridge',
      length: 32,
    });

    // 5. Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // 6. Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // 7. Create temporary session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await supabase
      .from('two_factor_verification_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        verified: false,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.ip,
        user_agent: request.headers.get('user-agent'),
      });

    // 8. Store encrypted secret and hashed backup codes temporarily in Redis
    // (will be moved to DB after verification)
    await redis.setex(
      `2fa_pending:${sessionToken}`,
      300, // 5 minutes
      JSON.stringify({
        secret: secret.base32,
        backupCodes,
        userId: user.id,
      })
    );

    // 9. Log setup attempt
    await supabase.from('two_factor_audit_log').insert({
      user_id: user.id,
      action: 'setup_initiated',
      method: 'totp',
      success: true,
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    // 10. Return setup data
    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCodeUrl: qrCodeDataUrl,
      otpauthUrl: secret.otpauth_url,
      backupCodes,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error: any) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to setup 2FA', 
      details: error.message 
    }, { status: 500 });
  }
}
```

#### **POST `/api/user/2fa/verify-setup`**

**Implementation**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { sessionToken, code } = await request.json();

    // 1. Validate session
    const { data: session } = await supabase
      .from('two_factor_verification_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('user_id', user.id)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'Invalid or expired session' 
      }, { status: 400 });
    }

    // 2. Check rate limiting (max 3 attempts)
    if (session.failed_attempts >= 3) {
      return NextResponse.json({ 
        error: 'Too many failed attempts. Please start setup again.' 
      }, { status: 429 });
    }

    // 3. Retrieve pending secret from Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const pendingData = await redis.get(`2fa_pending:${sessionToken}`);
    if (!pendingData) {
      return NextResponse.json({ 
        error: 'Setup session expired. Please start again.' 
      }, { status: 400 });
    }

    const { secret, backupCodes } = JSON.parse(pendingData as string);

    // 4. Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2, // ±2 time steps (60 seconds tolerance)
    });

    if (!verified) {
      // Increment failed attempts
      await supabase
        .from('two_factor_verification_sessions')
        .update({ failed_attempts: session.failed_attempts + 1 })
        .eq('id', session.id);

      await supabase.from('two_factor_audit_log').insert({
        user_id: user.id,
        action: 'setup_verification_failed',
        method: 'totp',
        success: false,
        ip_address: request.headers.get('x-forwarded-for') || request.ip,
        user_agent: request.headers.get('user-agent'),
      });

      return NextResponse.json({ 
        success: false,
        error: 'Invalid verification code',
        attemptsRemaining: 3 - (session.failed_attempts + 1)
      }, { status: 400 });
    }

    // 5. Encrypt and store secret
    const encryptedSecret = encryptSecret(secret);
    
    await supabase.from('two_factor_secrets').insert({
      user_id: user.id,
      encrypted_secret: encryptedSecret,
      method: 'totp',
    });

    // 6. Hash and store backup codes
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code: string) => ({
        user_id: user.id,
        code_hash: await hashBackupCode(code),
      }))
    );

    await supabase.from('two_factor_backup_codes').insert(hashedCodes);

    // 7. Update user metadata
    await supabase.auth.updateUser({
      data: {
        two_factor_enabled: true,
        two_factor_method: 'totp',
        two_factor_configured_at: new Date().toISOString(),
      }
    });

    // 8. Mark session as verified
    await supabase
      .from('two_factor_verification_sessions')
      .update({ verified: true })
      .eq('id', session.id);

    // 9. Clean up Redis
    await redis.del(`2fa_pending:${sessionToken}`);

    // 10. Log success
    await supabase.from('two_factor_audit_log').insert({
      user_id: user.id,
      action: 'enabled',
      method: 'totp',
      success: true,
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    // 11. Send notification email
    // TODO: Implement email notification

    return NextResponse.json({
      success: true,
      enabled: true,
      backupCodesStored: backupCodes.length,
      message: '2FA successfully enabled',
    });

  } catch (error: any) {
    console.error('2FA verify setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to verify setup', 
      details: error.message 
    }, { status: 500 });
  }
}
```

### 4.2 Authentication Flow

#### **POST `/api/user/2fa/check-required`**

**Implementation**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionToken } = await request.json();

    // Create service role client (no user auth required for this check)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get user's 2FA status from metadata
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    const twoFactorEnabled = user.user_metadata?.two_factor_enabled === true;
    const twoFactorMethod = user.user_metadata?.two_factor_method || 'totp';

    return NextResponse.json({
      twoFactorRequired: twoFactorEnabled,
      method: twoFactorMethod,
      sessionToken, // Pass through for next step
    });

  } catch (error: any) {
    console.error('2FA check required error:', error);
    return NextResponse.json({ 
      error: 'Failed to check 2FA status', 
      details: error.message 
    }, { status: 500 });
  }
}
```

#### **POST `/api/user/2fa/verify-code`**

**Implementation**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionToken, code, trustDevice } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Rate limiting (5 attempts per 15 minutes)
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const { success: rateLimitPass, remaining } = await redis.ratelimit
      .slidingWindow(5, '15 m')
      .limit(`2fa_verify:${userId}`);

    if (!rateLimitPass) {
      return NextResponse.json({ 
        error: 'Too many verification attempts. Please try again in 15 minutes.',
        attemptsRemaining: 0,
        lockoutTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }, { status: 429 });
    }

    // 2. Validate session
    const { data: session } = await supabase
      .from('two_factor_verification_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('user_id', userId)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'Invalid or expired session' 
      }, { status: 400 });
    }

    // 3. Check if locked out
    if (session.locked_until && new Date(session.locked_until) > new Date()) {
      return NextResponse.json({ 
        error: 'Account temporarily locked due to too many failed attempts',
        lockoutTime: session.locked_until,
      }, { status: 429 });
    }

    // 4. Get encrypted secret
    const { data: secretData } = await supabase
      .from('two_factor_secrets')
      .select('encrypted_secret')
      .eq('user_id', userId)
      .single();

    if (!secretData) {
      return NextResponse.json({ 
        error: '2FA not configured for this user' 
      }, { status: 400 });
    }

    // 5. Decrypt secret
    const secret = decryptSecret(secretData.encrypted_secret);

    // 6. Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      // Increment failed attempts
      const newFailedAttempts = session.failed_attempts + 1;
      const updateData: any = { failed_attempts: newFailedAttempts };

      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      await supabase
        .from('two_factor_verification_sessions')
        .update(updateData)
        .eq('id', session.id);

      await supabase.from('two_factor_audit_log').insert({
        user_id: userId,
        action: 'verification_failed',
        method: 'totp',
        success: false,
        ip_address: request.headers.get('x-forwarded-for') || request.ip,
        user_agent: request.headers.get('user-agent'),
      });

      return NextResponse.json({ 
        success: false,
        error: 'Invalid verification code',
        attemptsRemaining: Math.max(0, 5 - newFailedAttempts),
        lockoutTime: updateData.locked_until || null,
      }, { status: 400 });
    }

    // 7. Verification successful - create session
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: (await supabase.auth.admin.getUserById(userId)).data.user?.email!,
    });

    if (authError) {
      throw new Error('Failed to generate session');
    }

    // 8. Update user metadata (last used timestamp)
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        two_factor_last_used_at: new Date().toISOString(),
      }
    });

    // 9. Mark session as verified
    await supabase
      .from('two_factor_verification_sessions')
      .update({ verified: true })
      .eq('id', session.id);

    // 10. Log success
    await supabase.from('two_factor_audit_log').insert({
      user_id: userId,
      action: 'verified',
      method: 'totp',
      success: true,
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
      metadata: { trust_device: trustDevice },
    });

    // 11. Handle trusted device (TODO: implement device tokens)
    // if (trustDevice) { ... }

    return NextResponse.json({
      success: true,
      accessToken: authData.properties.access_token,
      refreshToken: authData.properties.refresh_token,
      user: {
        id: userId,
        email: authData.properties.email,
      }
    });

  } catch (error: any) {
    console.error('2FA verify code error:', error);
    return NextResponse.json({ 
      error: 'Failed to verify code', 
      details: error.message 
    }, { status: 500 });
  }
}
```

**Note**: The remaining endpoints follow similar patterns. Full implementations will be provided in Phase 2-3.

---

## 🔒 5. Security Implementation

### 5.1 Secret Encryption

**Key Generation**:
```bash
# Generate encryption key (run once, store in .env)
openssl rand -hex 32
```

**.env.local**:
```bash
TOTP_ENCRYPTION_KEY=your-64-character-hex-key-here
```

### 5.2 Rate Limiting Configuration

```typescript
// Rate limit configurations
export const RATE_LIMITS = {
  '2fa_setup': {
    maxAttempts: 3,
    window: '1 h',
    lockoutDuration: '1 h',
  },
  '2fa_verify': {
    maxAttempts: 5,
    window: '15 m',
    lockoutDuration: '15 m',
  },
  '2fa_disable': {
    maxAttempts: 3,
    window: '1 h',
    lockoutDuration: '1 h',
  },
  'backup_code_regenerate': {
    maxAttempts: 5,
    window: '24 h',
    lockoutDuration: '24 h',
  },
};
```

### 5.3 Backup Code Security

- ✅ **Hashing**: bcrypt with cost factor 12
- ✅ **Length**: 8 characters (alphanumeric uppercase)
- ✅ **Quantity**: 10 codes per user
- ✅ **Expiration**: 90 days
- ✅ **Single-use**: Marked as used after first use
- ✅ **Warning**: Alert user when <3 codes remain

---

## 🧪 6. Testing Strategy

### 6.1 Unit Tests

```typescript
describe('2FA Setup', () => {
  it('should generate valid TOTP secret', async () => {
    const secret = speakeasy.generateSecret({ length: 32 });
    expect(secret.base32).toHaveLength(52); // Base32 encoded
  });

  it('should generate 10 unique backup codes', () => {
    const codes = generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10); // All unique
  });

  it('should encrypt and decrypt secret correctly', () => {
    const plaintext = 'MY_SECRET_KEY';
    const encrypted = encryptSecret(plaintext);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

describe('2FA Verification', () => {
  it('should verify valid TOTP code', () => {
    const secret = speakeasy.generateSecret({ length: 32 });
    const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    
    const verified = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token,
      window: 2,
    });
    
    expect(verified).toBe(true);
  });

  it('should reject invalid TOTP code', () => {
    const secret = speakeasy.generateSecret({ length: 32 });
    
    const verified = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token: '000000', // Invalid
      window: 2,
    });
    
    expect(verified).toBe(false);
  });
});
```

### 6.2 Integration Tests

We'll provide a comprehensive Postman collection with:
- ✅ Setup flow (happy path)
- ✅ Setup flow (invalid code)
- ✅ Verification flow (happy path)
- ✅ Verification flow (rate limiting)
- ✅ Backup code usage
- ✅ Disable 2FA
- ✅ Regenerate backup codes

### 6.3 End-to-End Tests

Using Playwright:
```typescript
test('User can enable 2FA and verify', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // 2. Navigate to 2FA settings
  await page.goto('/settings/security');
  await page.click('text=Enable Two-Factor Authentication');

  // 3. Setup 2FA
  const qrCode = await page.locator('canvas').getAttribute('data-url');
  expect(qrCode).toContain('otpauth://totp/SoundBridge');

  // 4. Verify with TOTP code
  // (This would require programmatically generating a TOTP code)
  
  // 5. Confirm 2FA enabled
  await expect(page.locator('text=2FA Enabled')).toBeVisible();
});
```

---

## 📧 7. Answers to Your Questions

### Q1: Timeline
**A**: **Start Date**: November 25, 2025 (next Monday)  
**Completion Date**: December 22, 2025  
**Production Launch**: January 5, 2026

### Q2: Technology Stack
**A**: **TOTP Library**: `speakeasy` (Node.js)  
**Rationale**: Battle-tested, RFC-compliant, TypeScript support, 1M+ weekly downloads

### Q3: Storage & Encryption
**A**: **Application-level AES-256-GCM encryption**  
**Key Storage**: Environment variables (`.env.local`)  
**Future**: Can migrate to AWS KMS if needed

### Q4: Rate Limiting
**A**: **Upstash Redis** (serverless, edge-optimized)  
**Rationale**: No infrastructure management, global edge network, Vercel-optimized

### Q5: Notifications
**A**: **Yes**, we'll send email notifications for:
- ✅ 2FA enabled
- ✅ 2FA disabled
- ✅ Login from new device (with 2FA)
- ✅ Recovery requested
- ✅ Backup codes low (<3 remaining)

### Q6: Recovery Process
**A**: **Email link + Password verification**  
**Process**:
1. User requests recovery via email
2. Email sent with secure link (1-hour expiration)
3. User clicks link → prompted for password
4. After password verification → 2FA disabled
5. User can re-enable 2FA

**Future Enhancement**: Add security questions as additional verification layer

### Q7: SMS Provider
**A**: **Not implementing SMS 2FA in Phase 1**  
**Rationale**:
- SMS is less secure than TOTP (SIM swapping attacks)
- Additional cost per SMS
- Complexity (phone number validation, international numbers)
- TOTP is industry standard (GitHub, Google, AWS)

**Future**: If SMS 2FA is requested, we'll use **Twilio** (most reliable, good docs)

---

## 📅 8. Detailed Implementation Plan

### **Phase 1: Database & Core Endpoints (Nov 25 - Dec 1)**

**Week 1:**
- ✅ Create database tables
- ✅ Setup encryption utilities
- ✅ Setup rate limiting (Upstash Redis)
- ✅ Implement `POST /api/user/2fa/setup-totp`
- ✅ Implement `POST /api/user/2fa/verify-setup`
- ✅ Implement `GET /api/user/2fa/status`
- ✅ Unit tests for core functions

**Deliverables:**
- Database schema deployed
- Core setup endpoints working
- Unit tests passing
- Postman collection for Phase 1

### **Phase 2: Authentication Flow (Dec 2 - Dec 8)**

**Week 2:**
- ✅ Implement `POST /api/user/2fa/check-required`
- ✅ Implement `POST /api/user/2fa/verify-code`
- ✅ Implement `POST /api/user/2fa/verify-backup-code`
- ✅ Integration with existing auth flow
- ✅ Rate limiting for verification
- ✅ Integration tests

**Deliverables:**
- Authentication endpoints working
- Integration tests passing
- Updated Postman collection

### **Phase 3: Management & Recovery (Dec 9 - Dec 15)**

**Week 3:**
- ✅ Implement `POST /api/user/2fa/disable`
- ✅ Implement `POST /api/user/2fa/regenerate-backup-codes`
- ✅ Implement `POST /api/user/2fa/recovery-request`
- ✅ Email notifications
- ✅ Audit logging
- ✅ End-to-end tests

**Deliverables:**
- All management endpoints working
- Email notifications configured
- Audit logging operational
- Complete Postman collection

### **Phase 4: Testing & Documentation (Dec 16 - Dec 22)**

**Week 4:**
- ✅ Comprehensive testing (all scenarios)
- ✅ API documentation (OpenAPI/Swagger)
- ✅ Mobile integration guide
- ✅ Security review
- ✅ Performance testing

**Deliverables:**
- Complete test suite
- API documentation
- Mobile integration guide
- Security audit report

### **Phase 5: Mobile Integration Support (Dec 23 - Dec 29)**

**Week 5:**
- ✅ Support mobile team integration
- ✅ Fix any discovered issues
- ✅ Performance optimization
- ✅ Final testing

**Deliverables:**
- Mobile team successfully integrated
- All issues resolved
- Production-ready system

---

## 📚 9. Deliverables Summary

### What We'll Provide

1. **Database Schema Scripts**
   - ✅ Migration files
   - ✅ Rollback scripts
   - ✅ Seed data for testing

2. **API Endpoints**
   - ✅ All 10+ endpoints implemented
   - ✅ Fully documented
   - ✅ Rate limited
   - ✅ Error handling

3. **Postman Collection**
   - ✅ All endpoints with example requests
   - ✅ Environment variables
   - ✅ Test scripts
   - ✅ Pre-request scripts

4. **Documentation**
   - ✅ API reference (OpenAPI/Swagger)
   - ✅ Integration guide for mobile
   - ✅ Security best practices
   - ✅ Troubleshooting guide

5. **Testing**
   - ✅ Unit tests (95%+ coverage)
   - ✅ Integration tests
   - ✅ End-to-end tests
   - ✅ Security audit

6. **Monitoring**
   - ✅ Audit logs queryable
   - ✅ Rate limit metrics
   - ✅ Error tracking (Sentry)
   - ✅ Performance monitoring

---

## 🤝 10. Collaboration Plan

### Communication

- **Primary Channel**: GitHub Issues (label: `2fa-implementation`)
- **Weekly Sync**: Every Wednesday 2 PM (30 minutes)
- **Slack**: `#mobile-web-2fa` (for quick questions)
- **Email**: web-dev@soundbridge.live

### Points of Contact

- **Web Team Lead**: [Your Name]
- **Backend Engineer**: [Engineer Name]
- **Mobile Team Lead**: [Mobile Lead Name]

### Technical Discussion Meeting

**Proposed Date**: November 20, 2025 (Wednesday)  
**Time**: 2:00 PM - 3:00 PM  
**Agenda**:
1. Review this response document (15 min)
2. Discuss any concerns/questions (15 min)
3. Finalize implementation details (15 min)
4. Assign responsibilities (10 min)
5. Next steps (5 min)

**Meeting Link**: [Zoom/Meet Link]

---

## ✅ 11. Success Criteria (Confirmed)

Implementation will be considered successful when:

1. ✅ All 4 database tables created with RLS policies
2. ✅ All 10+ API endpoints functional and tested
3. ✅ Postman collection with 30+ test cases provided
4. ✅ Rate limiting operational (Redis-based)
5. ✅ Encryption working (AES-256-GCM)
6. ✅ Audit logging capturing all actions
7. ✅ Email notifications configured
8. ✅ Mobile team can successfully:
   - Enable 2FA
   - Verify with Google Authenticator
   - Login with 2FA code
   - Use backup code
   - Regenerate backup codes
   - Disable 2FA
   - View audit log
9. ✅ Security audit passed
10. ✅ Performance benchmarks met (<200ms p95 for verification)

---

## 🎉 12. Conclusion

Thank you for the comprehensive specification! We're excited to implement this critical security feature. Here's what we commit to:

### ✅ **Our Commitments**

1. **Timeline**: 5-week implementation (Nov 25 - Dec 29)
2. **Quality**: Production-ready, secure, tested code
3. **Support**: Dedicated support during mobile integration
4. **Documentation**: Comprehensive API docs and integration guides
5. **Communication**: Weekly updates and responsive to questions

### 📞 **Next Steps**

1. **You**: Review this response and provide feedback by Nov 20
2. **Us**: Schedule technical discussion meeting (proposed Nov 20)
3. **Both**: Finalize requirements and timeline
4. **Us**: Begin Phase 1 implementation (Nov 25)

### 🚀 **Let's Build This Together!**

We're confident this implementation will provide SoundBridge users with robust, secure two-factor authentication. Looking forward to collaborating with the mobile team!

**Please confirm:**
- ✅ Timeline acceptable
- ✅ Technology choices approved
- ✅ Meeting availability (Nov 20, 2 PM)
- ✅ Any additional questions/concerns

---

**Document Version**: 1.0  
**Date**: November 17, 2025  
**Status**: Awaiting Mobile Team Approval  
**Next Review**: After Technical Discussion Meeting

---

**Questions? Contact us:**
- **GitHub**: @web-team
- **Slack**: #mobile-web-2fa
- **Email**: web-dev@soundbridge.live

