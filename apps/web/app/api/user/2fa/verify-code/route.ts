/**
 * POST /api/user/2fa/verify-code
 * 
 * Verify a TOTP code during login flow
 * Called after user enters their 2FA code from authenticator app
 * 
 * Request Body:
 * {
 *   "sessionToken": "temp-session-uuid", // Legacy: session_token (TEXT)
 *   "verificationSessionId": "uuid", // New: session id (UUID) from login-initiate
 *   "code": "123456" // 6-digit TOTP code
 * }
 * 
 * Note: Either sessionToken OR verificationSessionId must be provided
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
import { createServiceClient } from '@/src/lib/supabase';
import { decryptSecret, encryptSecret } from '@/src/lib/encryption';

function getSupabaseAdmin() {
  return createServiceClient();
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Verify Code: Starting...');
    
    // ================================================
    // 1. Parse and validate request
    // ================================================
    const body = await request.json();
    const { sessionToken, verificationSessionId, code } = body;
    
    // Either sessionToken (legacy) or verificationSessionId (new) must be provided
    if (!sessionToken && !verificationSessionId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Either sessionToken or verificationSessionId is required',
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
    let session;
    let sessionError;
    
    if (verificationSessionId) {
      // New flow: lookup by UUID id
      const result = await getSupabaseAdmin()
        .from('two_factor_verification_sessions')
        .select('*')
        .eq('id', verificationSessionId)
        .maybeSingle();
      session = result.data;
      sessionError = result.error;
    } else {
      // Legacy flow: lookup by session_token
      const result = await getSupabaseAdmin()
        .from('two_factor_verification_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .maybeSingle();
      session = result.data;
      sessionError = result.error;
    }
    
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
      
      // Create non-admin client for token generation
      const supabaseAnonForVerified = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      
      let sessionDataForVerified;
      let verifyErrorForVerified;
      let userEmail;
      
      // If we have email and password_hash (from login-initiate), use direct authentication
      if (session.email && session.password_hash) {
        console.log('✅ Using stored credentials for already verified session');
        
        try {
          // Decrypt password
          const decryptedPassword = decryptSecret(session.password_hash);
          
          // Authenticate directly with email and password
          const authResult = await supabaseAnonForVerified.auth.signInWithPassword({
            email: session.email,
            password: decryptedPassword,
          });
          
          sessionDataForVerified = authResult.data;
          verifyErrorForVerified = authResult.error;
          userEmail = session.email;
        } catch (decryptError: any) {
          console.error('❌ Failed to decrypt password:', decryptError);
          return NextResponse.json(
            { 
              success: false,
              error: 'Failed to authenticate',
              code: 'AUTHENTICATION_FAILED'
            },
            { status: 500 }
          );
        }
      } else {
        // Legacy flow: use generateLink + verifyOtp
        console.log('✅ Using legacy generateLink flow for already verified session');
        
        const { data: userDataForVerified, error: userErrorForVerified } = await getSupabaseAdmin().auth.admin.getUserById(
          session.user_id
        );
        
        if (userErrorForVerified || !userDataForVerified.user) {
          console.error('❌ Failed to get user:', userErrorForVerified);
          return NextResponse.json(
            { 
              success: false,
              error: 'Failed to retrieve user',
              code: 'USER_NOT_FOUND'
            },
            { status: 500 }
          );
        }
        
        userEmail = userDataForVerified.user.email!;
        
        // Generate magic link to get hashed token
        const { data: linkDataForVerified, error: linkErrorForVerified } = await getSupabaseAdmin().auth.admin.generateLink({
          type: 'magiclink',
          email: userEmail,
        });
        
        if (linkErrorForVerified || !linkDataForVerified?.properties?.hashed_token) {
          console.error('❌ Failed to generate link:', linkErrorForVerified);
          return NextResponse.json(
            { 
              success: false,
              error: 'Failed to create session',
              code: 'SESSION_CREATION_FAILED'
            },
            { status: 500 }
          );
        }
        
        // Verify OTP to create session and get tokens
        const verifyResult = await supabaseAnonForVerified.auth.verifyOtp({
          type: 'email',
          token_hash: linkDataForVerified.properties.hashed_token,
        });
        
        sessionDataForVerified = verifyResult.data;
        verifyErrorForVerified = verifyResult.error;
      }
      
      if (verifyErrorForVerified || !sessionDataForVerified?.session) {
        console.error('❌ Failed to create session for already verified:', verifyErrorForVerified);
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
          accessToken: sessionDataForVerified.session.access_token,
          refreshToken: sessionDataForVerified.session.refresh_token,
          userId: session.user_id,
          email: userEmail,
          message: 'Already verified',
        },
      });
    }
    
    // ================================================
    // 6. Retrieve user's encrypted TOTP secret
    // ================================================
    const { data: secretRecord, error: fetchError } = await getSupabaseAdmin()
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
      await getSupabaseAdmin()
        .from('two_factor_verification_sessions')
        .update({
          failed_attempts: failedAttempts,
          locked_until: shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
            : null,
        })
        .eq('id', session.id);
      
      // Log failed verification
      await getSupabaseAdmin()
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
    await getSupabaseAdmin()
      .from('two_factor_verification_sessions')
      .update({
        verified: true,
      })
      .eq('id', session.id);
    
    // ================================================
    // 11. Generate Supabase session tokens
    // ================================================
    // Create non-admin client for token generation
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    let sessionData;
    let verifyError;
    
    // If we have email and password_hash (from login-initiate), use direct authentication
    if (session.email && session.password_hash) {
      console.log('✅ Using stored credentials for authentication');
      
      try {
        // Decrypt password
        const decryptedPassword = decryptSecret(session.password_hash);
        
        // Authenticate directly with email and password
        const authResult = await supabaseAnon.auth.signInWithPassword({
          email: session.email,
          password: decryptedPassword,
        });
        
        sessionData = authResult.data;
        verifyError = authResult.error;
      } catch (decryptError: any) {
        console.error('❌ Failed to decrypt password:', decryptError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to authenticate',
            code: 'AUTHENTICATION_FAILED'
          },
          { status: 500 }
        );
      }
    } else {
      // Legacy flow: use generateLink + verifyOtp
      console.log('✅ Using legacy generateLink flow');
      
      const { data: userData, error: userError } = await getSupabaseAdmin().auth.admin.getUserById(
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
      
      // Generate magic link to get hashed token
      const { data: linkData, error: linkError } = await getSupabaseAdmin().auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email!,
      });
      
      if (linkError || !linkData?.properties?.hashed_token) {
        console.error('❌ Failed to generate link:', linkError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to create session',
            code: 'TOKEN_GENERATION_FAILED'
          },
          { status: 500 }
        );
      }
      
      // Verify OTP to create session and get tokens
      const verifyResult = await supabaseAnon.auth.verifyOtp({
        type: 'email',
        token_hash: linkData.properties.hashed_token,
      });
      
      sessionData = verifyResult.data;
      verifyError = verifyResult.error;
    }
    
    if (verifyError || !sessionData?.session) {
      console.error('❌ Failed to create session:', verifyError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create session',
          code: 'SESSION_CREATION_FAILED'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Session tokens generated successfully');
    
    // ================================================
    // 12. Log successful verification
    // ================================================
    await getSupabaseAdmin()
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
    // 13. Return response with session tokens
    // ================================================
    // Get email from session (if from login-initiate) or from sessionData (legacy flow)
    const userEmail = session.email || sessionData.user?.email || 'unknown';
    
    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        userId: session.user_id,
        email: userEmail,
        message: 'Verification successful',
        // Note: Web app can continue using re-sign-in flow if preferred
        // Mobile app should use these tokens to set Supabase session
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

