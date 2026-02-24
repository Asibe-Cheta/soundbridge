/**
 * POST /api/user/2fa/verify-backup-code
 * 
 * Verify a backup code during login flow (when user doesn't have access to authenticator)
 * Called when user uses a backup recovery code instead of TOTP
 * 
 * Request Body:
 * {
 *   "sessionToken": "temp-session-uuid", // Legacy: session_token (TEXT)
 *   "verificationSessionId": "uuid", // New: session id (UUID) from login-initiate
 *   "backupCode": "A3F2-K8L9M0" // Backup code
 * }
 * 
 * Note: Either sessionToken OR verificationSessionId must be provided
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "verified": true,
 *     "remainingCodes": 7 // Number of unused backup codes remaining
 *   }
 * }
 * 
 * Authentication: Not required (uses sessionToken instead)
 * Rate Limit: 5 attempts per session (with lockout on failure)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/src/lib/supabase';
import { verifyBackupCode, formatBackupCode, isValidBackupCodeFormat } from '@/src/lib/backup-codes';
import { decryptSecret } from '@/src/lib/encryption';

function getSupabaseAdmin() {
  return createServiceClient();
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Verify Backup Code: Starting...');
    
    // ================================================
    // 1. Parse and validate request
    // ================================================
    const body = await request.json();
    const { sessionToken, verificationSessionId, backupCode } = body;
    
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
    
    if (!backupCode || typeof backupCode !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Backup code is required',
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      );
    }
    
    // Format and validate backup code
    let formattedCode: string;
    try {
      formattedCode = formatBackupCode(backupCode);
      
      if (!isValidBackupCodeFormat(formattedCode)) {
        throw new Error('Invalid format');
      }
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid backup code format. Expected format: XXXX-XXXXXX',
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
    // 4. Check if session is locked
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
          retryAfter: lockoutRemaining * 60,
        },
        { status: 429 }
      );
    }
    
    // ================================================
    // 5. Check if already verified
    // ================================================
    if (session.verified) {
      console.log('✅ Session already verified');
      
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          message: 'Already verified',
        },
      });
    }
    
    // ================================================
    // 6. Retrieve user's backup codes (unused only)
    // ================================================
    const { data: backupCodes, error: fetchError } = await getSupabaseAdmin()
      .from('two_factor_backup_codes')
      .select('*')
      .eq('user_id', session.user_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString()); // Not expired
    
    if (fetchError) {
      console.error('❌ Failed to retrieve backup codes:', fetchError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to retrieve backup codes',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    if (!backupCodes || backupCodes.length === 0) {
      console.log('❌ No unused backup codes available');
      return NextResponse.json(
        { 
          success: false,
          error: 'No backup codes available. Please contact support.',
          code: 'NO_BACKUP_CODES'
        },
        { status: 400 }
      );
    }
    
    console.log('✅ Retrieved', backupCodes.length, 'backup codes');
    
    // ================================================
    // 7. Verify backup code against all hashes
    // ================================================
    let matchedCodeId: string | null = null;
    
    for (const backupCodeRecord of backupCodes) {
      const isValid = await verifyBackupCode(formattedCode, backupCodeRecord.code_hash);
      
      if (isValid) {
        matchedCodeId = backupCodeRecord.id;
        console.log('✅ Backup code matched:', matchedCodeId);
        break;
      }
    }
    
    // ================================================
    // 8. Handle verification result
    // ================================================
    if (!matchedCodeId) {
      console.log('❌ Invalid backup code');
      
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
          action: 'backup_code_failed',
          method: 'backup_code',
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
          error: 'Invalid backup code. Please try again.',
          code: 'INVALID_CODE',
          remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts,
        },
        { status: 400 }
      );
    }
    
    console.log('✅ Backup code verified successfully');
    
    // ================================================
    // 9. Mark backup code as used
    // ================================================
    const { error: updateError } = await getSupabaseAdmin()
      .from('two_factor_backup_codes')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', matchedCodeId);
    
    if (updateError) {
      console.error('❌ Failed to mark backup code as used:', updateError);
      // Continue anyway - don't fail the verification
    }
    
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
    // 11. Count remaining backup codes
    // ================================================
    const { count: remainingCount } = await getSupabaseAdmin()
      .from('two_factor_backup_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());
    
    const remainingCodes = remainingCount || 0;
    
    console.log('✅ Remaining backup codes:', remainingCodes);
    
    // ================================================
    // 12. Log successful verification
    // ================================================
    await getSupabaseAdmin()
      .from('two_factor_audit_log')
      .insert({
        user_id: session.user_id,
        action: 'backup_code_used',
        method: 'backup_code',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        metadata: {
          remaining_codes: remainingCodes,
        },
      });
    
    console.log('✅ Backup code verification completed successfully');
    
    // ================================================
    // 13. Generate Supabase session tokens
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
    // 14. Return response
    // ================================================
    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        userId: session.user_id,
        email: session.email || sessionData.user?.email,
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        remainingCodes: remainingCodes,
        warning: remainingCodes <= 2
          ? 'You have only ' + remainingCodes + ' backup code(s) remaining. Generate new ones soon.'
          : undefined,
        message: 'Verification successful',
      },
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in verify-backup-code:', error);
    
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

