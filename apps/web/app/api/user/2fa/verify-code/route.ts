/**
 * POST /api/user/2fa/verify-code
 * 
 * Verify a TOTP code during login flow
 * Called after user enters their 2FA code from authenticator app
 * 
 * Request Body:
 * {
 *   "sessionToken": "temp-session-uuid",
 *   "code": "123456" // 6-digit TOTP code
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "verified": true,
 *     "accessToken": "supabase-jwt-token",
 *     "refreshToken": "supabase-refresh-token"
 *   }
 * }
 * 
 * Authentication: Not required (uses sessionToken instead)
 * Rate Limit: 5 attempts per session (with lockout on failure)
 */

import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/src/lib/encryption';

// Create a service role client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Verify Code: Starting...');
    
    // ================================================
    // 1. Parse and validate request
    // ================================================
    const body = await request.json();
    const { sessionToken, code } = body;
    
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Session token is required',
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      );
    }
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Verification code is required',
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      );
    }
    
    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid code format. Must be 6 digits.',
          code: 'INVALID_CODE_FORMAT'
        },
        { status: 400 }
      );
    }
    
    console.log('✅ Request validated');
    
    // ================================================
    // 2. Retrieve verification session
    // ================================================
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('two_factor_verification_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .maybeSingle();
    
    if (sessionError || !session) {
      console.error('❌ Session not found:', sessionError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired session',
          code: 'INVALID_SESSION'
        },
        { status: 401 }
      );
    }
    
    console.log('✅ Session found:', session.id);
    
    // ================================================
    // 3. Check if session is expired
    // ================================================
    if (new Date(session.expires_at) < new Date()) {
      console.log('❌ Session expired');
      return NextResponse.json(
        { 
          success: false,
          error: 'Session expired. Please log in again.',
          code: 'SESSION_EXPIRED'
        },
        { status: 401 }
      );
    }
    
    // ================================================
    // 4. Check if session is locked (too many failed attempts)
    // ================================================
    if (session.locked_until && new Date(session.locked_until) > new Date()) {
      const lockoutRemaining = Math.ceil(
        (new Date(session.locked_until).getTime() - Date.now()) / 1000 / 60
      );
      
      console.log('❌ Session locked for', lockoutRemaining, 'minutes');
      
      return NextResponse.json(
        { 
          success: false,
          error: `Too many failed attempts. Try again in ${lockoutRemaining} minutes.`,
          code: 'ACCOUNT_LOCKED',
          retryAfter: lockoutRemaining * 60, // seconds
        },
        { status: 429 }
      );
    }
    
    // ================================================
    // 5. Check if already verified
    // ================================================
    if (session.verified) {
      console.log('✅ Session already verified');
      
      // Generate new Supabase session
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: (await supabaseAdmin.auth.admin.getUserById(session.user_id)).data.user?.email || '',
      });
      
      if (authError || !authData) {
        console.error('❌ Failed to generate session:', authError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to create session',
            code: 'SESSION_CREATION_FAILED'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          message: 'Already verified',
        },
      });
    }
    
    // ================================================
    // 6. Retrieve user's encrypted TOTP secret
    // ================================================
    const { data: secretRecord, error: fetchError } = await supabaseAdmin
      .from('two_factor_secrets')
      .select('encrypted_secret')
      .eq('user_id', session.user_id)
      .maybeSingle();
    
    if (fetchError || !secretRecord) {
      console.error('❌ Failed to retrieve 2FA secret:', fetchError);
      return NextResponse.json(
        { 
          success: false,
          error: '2FA configuration error',
          code: 'CONFIG_ERROR'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Retrieved encrypted secret');
    
    // ================================================
    // 7. Decrypt the TOTP secret
    // ================================================
    let decryptedSecret: string;
    
    try {
      decryptedSecret = decryptSecret(secretRecord.encrypted_secret);
      console.log('✅ Secret decrypted');
    } catch (decryptError: any) {
      console.error('❌ Failed to decrypt secret:', decryptError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to decrypt 2FA secret',
          code: 'DECRYPTION_FAILED'
        },
        { status: 500 }
      );
    }
    
    // ================================================
    // 8. Verify TOTP code
    // ================================================
    const isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time windows (±1 minute tolerance)
    });
    
    // ================================================
    // 9. Handle verification result
    // ================================================
    if (!isValid) {
      console.log('❌ Invalid TOTP code');
      
      // Increment failed attempts
      const failedAttempts = session.failed_attempts + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
      
      // Update session with failed attempt
      await supabaseAdmin
        .from('two_factor_verification_sessions')
        .update({
          failed_attempts: failedAttempts,
          locked_until: shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
            : null,
        })
        .eq('id', session.id);
      
      // Log failed verification
      await supabaseAdmin
        .from('two_factor_audit_log')
        .insert({
          user_id: session.user_id,
          action: 'verification_failed',
          method: 'totp',
          success: false,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          metadata: {
            failed_attempts: failedAttempts,
            locked: shouldLock,
          },
        });
      
      if (shouldLock) {
        return NextResponse.json(
          { 
            success: false,
            error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
            code: 'ACCOUNT_LOCKED',
            remainingAttempts: 0,
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid verification code. Please try again.',
          code: 'INVALID_CODE',
          remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts,
        },
        { status: 400 }
      );
    }
    
    console.log('✅ TOTP code verified successfully');
    
    // ================================================
    // 10. Mark session as verified
    // ================================================
    await supabaseAdmin
      .from('two_factor_verification_sessions')
      .update({
        verified: true,
      })
      .eq('id', session.id);
    
    // ================================================
    // 11. Generate Supabase session tokens using admin API
    // ================================================
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      session.user_id
    );
    
    if (userError || !userData.user) {
      console.error('❌ Failed to get user:', userError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to retrieve user',
          code: 'USER_NOT_FOUND'
        },
        { status: 500 }
      );
    }
    
    // Generate new access token for the user
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    });
    
    if (tokenError || !tokenData) {
      console.error('❌ Failed to generate tokens:', tokenError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create session',
          code: 'TOKEN_GENERATION_FAILED'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Session tokens generated');
    
    // ================================================
    // 12. Log successful verification
    // ================================================
    await supabaseAdmin
      .from('two_factor_audit_log')
      .insert({
        user_id: session.user_id,
        action: 'verified',
        method: 'totp',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });
    
    console.log('✅ 2FA verification completed successfully');
    
    // ================================================
    // 13. Return response with session info
    // ================================================
    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        userId: session.user_id,
        // Note: The mobile team will call supabase.auth.setSession() with these
        // But for web, we might handle session creation server-side
        message: 'Verification successful',
      },
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in verify-code:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// Method not allowed for other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}

