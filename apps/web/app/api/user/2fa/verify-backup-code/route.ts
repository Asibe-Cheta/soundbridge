/**
 * POST /api/user/2fa/verify-backup-code
 * 
 * Verify a backup code during login flow (when user doesn't have access to authenticator)
 * Called when user uses a backup recovery code instead of TOTP
 * 
 * Request Body:
 * {
 *   "sessionToken": "temp-session-uuid",
 *   "backupCode": "A3F2-K8L9M0" // Backup code
 * }
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
import { verifyBackupCode, formatBackupCode, isValidBackupCodeFormat } from '@/src/lib/backup-codes';

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
    console.log('🔐 2FA Verify Backup Code: Starting...');
    
    // ================================================
    // 1. Parse and validate request
    // ================================================
    const body = await request.json();
    const { sessionToken, backupCode } = body;
    
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
    const { data: backupCodes, error: fetchError } = await supabaseAdmin
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
    const { error: updateError } = await supabaseAdmin
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
    await supabaseAdmin
      .from('two_factor_verification_sessions')
      .update({
        verified: true,
      })
      .eq('id', session.id);
    
    // ================================================
    // 11. Count remaining backup codes
    // ================================================
    const { count: remainingCount } = await supabaseAdmin
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
    await supabaseAdmin
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
    // 13. Return response
    // ================================================
    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        userId: session.user_id,
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

