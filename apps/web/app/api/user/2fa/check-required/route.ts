/**
 * POST /api/user/2fa/check-required
 * 
 * Check if 2FA is required for this user after successful login
 * Called immediately after email/password login succeeds
 * 
 * Request Body:
 * {
 *   "userId": "uuid" // Optional: can be derived from session
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "twoFactorRequired": true/false,
 *     "sessionToken": "temp-session-uuid" // If 2FA required
 *   }
 * }
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Check Required: Starting...');
    
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
    // 2. Check if user has 2FA enabled
    // ================================================
    const { data: secret, error: secretError } = await supabase
      .from('two_factor_secrets')
      .select('id, method')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (secretError) {
      console.error('❌ Error checking 2FA status:', secretError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check 2FA status',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    // ================================================
    // 3. If no 2FA enabled, allow login
    // ================================================
    if (!secret) {
      console.log('✅ User does not have 2FA enabled');
      
      return NextResponse.json({
        success: true,
        data: {
          twoFactorRequired: false,
          message: 'No 2FA required for this user',
        },
      });
    }
    
    // ================================================
    // 4. 2FA is enabled - create verification session
    // ================================================
    console.log('🔒 2FA is enabled, creating verification session...');
    
    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    
    // Create verification session (expires in 5 minutes)
    const { data: session, error: sessionError } = await supabase
      .from('two_factor_verification_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        verified: false,
        failed_attempts: 0,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();
    
    if (sessionError || !session) {
      console.error('❌ Failed to create verification session:', sessionError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create verification session',
          code: 'SESSION_CREATION_FAILED'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Verification session created:', session.id);
    
    // ================================================
    // 5. Log audit event
    // ================================================
    await supabase
      .from('two_factor_audit_log')
      .insert({
        user_id: user.id,
        action: 'verification_required',
        method: secret.method,
        success: true,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    
    // ================================================
    // 6. Return response
    // ================================================
    return NextResponse.json({
      success: true,
      data: {
        twoFactorRequired: true,
        sessionToken: sessionToken,
        expiresIn: 300, // 5 minutes in seconds
        message: 'Please verify your identity with a 2FA code',
      },
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in check-required:', error);
    
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

