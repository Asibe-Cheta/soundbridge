/**
 * POST /api/user/2fa/regenerate-backup-codes
 * 
 * Regenerate backup codes for the authenticated user
 * Deletes all old backup codes and generates 8 new ones
 * 
 * Request Body:
 * {
 *   "password": "user's password" // Required for security
 * }
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/apps/web/src/lib/api-auth';
import { generateBackupCodesWithHashes } from '@/apps/web/src/lib/backup-codes';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Regenerate Backup Codes: Starting...');
    
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
    // 2. Parse and validate request
    // ================================================
    const body = await request.json();
    const { password } = body;
    
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Password is required to regenerate backup codes',
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      );
    }
    
    // ================================================
    // 3. Verify password
    // ================================================
    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });
    
    if (passwordError) {
      console.log('❌ Invalid password');
      
      // Log failed attempt
      await supabase
        .from('two_factor_audit_log')
        .insert({
          user_id: user.id,
          action: 'regenerate_backup_codes_failed',
          method: 'backup_code',
          success: false,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          metadata: {
            reason: 'invalid_password',
          },
        });
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid password',
          code: 'INVALID_PASSWORD'
        },
        { status: 401 }
      );
    }
    
    console.log('✅ Password verified');
    
    // ================================================
    // 4. Check if 2FA is enabled
    // ================================================
    const { data: secret, error: checkError } = await supabase
      .from('two_factor_secrets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Error checking 2FA status:', checkError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check 2FA status',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    if (!secret) {
      console.log('⚠️ 2FA is not enabled');
      return NextResponse.json(
        { 
          success: false,
          error: '2FA is not enabled',
          code: 'NOT_ENABLED'
        },
        { status: 400 }
      );
    }
    
    // ================================================
    // 5. Delete all old backup codes
    // ================================================
    const { error: deleteError } = await supabase
      .from('two_factor_backup_codes')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('❌ Failed to delete old backup codes:', deleteError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to delete old backup codes',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Old backup codes deleted');
    
    // ================================================
    // 6. Generate new backup codes
    // ================================================
    const { codes, hashes } = await generateBackupCodesWithHashes(8);
    console.log('✅ Generated 8 new backup codes');
    
    // ================================================
    // 7. Store new backup codes
    // ================================================
    const backupCodeRecords = hashes.map(hash => ({
      user_id: user.id,
      code_hash: hash,
      used: false,
    }));
    
    const { error: insertError } = await supabase
      .from('two_factor_backup_codes')
      .insert(backupCodeRecords);
    
    if (insertError) {
      console.error('❌ Failed to store new backup codes:', insertError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to store new backup codes',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ New backup codes stored');
    
    // ================================================
    // 8. Log audit event
    // ================================================
    await supabase
      .from('two_factor_audit_log')
      .insert({
        user_id: user.id,
        action: 'backup_codes_regenerated',
        method: 'backup_code',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        metadata: {
          codes_generated: codes.length,
        },
      });
    
    console.log('✅ Backup codes regenerated successfully');
    
    // ================================================
    // 9. Return response with new backup codes
    // ================================================
    return NextResponse.json({
      success: true,
      data: {
        backupCodes: codes,
        message: 'Store these backup codes in a safe place. You won\'t see them again.',
      },
      message: 'Backup codes regenerated successfully',
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in regenerate-backup-codes:', error);
    
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

