/**
 * POST /api/user/2fa/disable
 * 
 * Disable 2FA for the authenticated user
 * Removes TOTP secret and all backup codes
 * 
 * Request Body:
 * {
 *   "password": "user's password" // Required for security
 * }
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Disable: Starting...');
    
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
          error: 'Password is required to disable 2FA',
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
          action: 'disable_failed',
          method: 'totp',
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
    // 5. Delete TOTP secret
    // ================================================
    const { error: deleteSecretError } = await supabase
      .from('two_factor_secrets')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteSecretError) {
      console.error('❌ Failed to delete 2FA secret:', deleteSecretError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to disable 2FA',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ TOTP secret deleted');
    
    // ================================================
    // 6. Delete all backup codes
    // ================================================
    const { error: deleteCodesError } = await supabase
      .from('two_factor_backup_codes')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteCodesError) {
      console.error('⚠️ Failed to delete backup codes:', deleteCodesError);
      // Continue anyway - secret is already deleted
    } else {
      console.log('✅ Backup codes deleted');
    }
    
    // ================================================
    // 7. Delete all verification sessions
    // ================================================
    const { error: deleteSessionsError } = await supabase
      .from('two_factor_verification_sessions')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteSessionsError) {
      console.error('⚠️ Failed to delete verification sessions:', deleteSessionsError);
      // Continue anyway
    } else {
      console.log('✅ Verification sessions deleted');
    }
    
    // ================================================
    // 8. Log audit event
    // ================================================
    await supabase
      .from('two_factor_audit_log')
      .insert({
        user_id: user.id,
        action: 'disabled',
        method: 'totp',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });
    
    console.log('✅ 2FA disabled successfully');
    
    // ================================================
    // 9. Return response
    // ================================================
    return NextResponse.json({
      success: true,
      message: '2FA has been disabled for your account',
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in disable:', error);
    
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

