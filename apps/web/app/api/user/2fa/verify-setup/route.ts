/**
 * POST /api/user/2fa/verify-setup
 * 
 * Verify TOTP setup by validating a code from the user's authenticator app
 * This completes the 2FA setup and generates backup codes
 * 
 * Request Body:
 * {
 *   "code": "123456" // 6-digit TOTP code
 * }
 * 
 * Authentication: Required (Bearer token)
 * Rate Limit: 10 requests per 15 minutes per user
 */

import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { getSupabaseRouteClient } from '@/apps/web/src/lib/api-auth';
import { decryptSecret } from '@/apps/web/src/lib/encryption';
import { generateBackupCodesWithHashes } from '@/apps/web/src/lib/backup-codes';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Verify Setup: Starting...');
    
    // ================================================
    // 1. Authenticate user
    // ================================================
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // ================================================
    // 2. Parse request body
    // ================================================
    const body = await request.json();
    const { code } = body;
    
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
    // 3. Retrieve user's encrypted TOTP secret
    // ================================================
    const { data: secretRecord, error: fetchError } = await supabase
      .from('two_factor_secrets')
      .select('encrypted_secret')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (fetchError || !secretRecord) {
      console.error('❌ Failed to retrieve 2FA secret:', fetchError);
      return NextResponse.json(
        { 
          success: false,
          error: 'No 2FA setup found. Please initiate setup first.',
          code: 'SETUP_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    console.log('✅ Retrieved encrypted secret');
    
    // ================================================
    // 4. Decrypt the TOTP secret
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
    // 5. Verify TOTP code
    // ================================================
    const isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time windows (±1 minute tolerance)
    });
    
    if (!isValid) {
      console.log('❌ Invalid TOTP code');
      
      // Log failed verification
      await supabase
        .from('two_factor_audit_log')
        .insert({
          user_id: user.id,
          action: 'setup_verification_failed',
          method: 'totp',
          success: false,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
        });
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid verification code. Please try again.',
          code: 'INVALID_CODE'
        },
        { status: 400 }
      );
    }
    
    console.log('✅ TOTP code verified successfully');
    
    // ================================================
    // 6. Generate backup codes
    // ================================================
    const { codes, hashes } = await generateBackupCodesWithHashes(8);
    console.log('✅ Generated 8 backup codes');
    
    // ================================================
    // 7. Store backup codes in database
    // ================================================
    const backupCodeRecords = hashes.map(hash => ({
      user_id: user.id,
      code_hash: hash,
      used: false,
    }));
    
    const { error: backupCodesError } = await supabase
      .from('two_factor_backup_codes')
      .insert(backupCodeRecords);
    
    if (backupCodesError) {
      console.error('❌ Failed to store backup codes:', backupCodesError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to store backup codes',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Backup codes stored');
    
    // ================================================
    // 8. Log successful verification
    // ================================================
    await supabase
      .from('two_factor_audit_log')
      .insert({
        user_id: user.id,
        action: 'enabled',
        method: 'totp',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        metadata: {
          backup_codes_generated: codes.length,
        },
      });
    
    console.log('✅ 2FA setup completed successfully');
    
    // ================================================
    // 9. Return response with backup codes
    // ================================================
    return NextResponse.json({
      success: true,
      data: {
        backupCodes: codes, // Plain text codes - user must save these!
        message: 'Store these backup codes in a safe place. You won\'t see them again.',
      },
      message: '2FA successfully enabled',
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in verify-setup:', error);
    
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

