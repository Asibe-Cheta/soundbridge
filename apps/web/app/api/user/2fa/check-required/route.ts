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
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Create a service role client for operations that need to bypass RLS
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

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Check Required: Starting...');
    
    // ================================================
    // 1. Authenticate user
    // ================================================
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      console.error('❌ Auth error details:', {
        hasError: !!authError,
        errorMessage: authError?.message,
        hasUser: !!user,
        userId: user?.id,
      });
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
    // 3.5. Check if there's a verified session for this user (recent verification)
    // ================================================
    // If user just verified 2FA in the last 30 seconds, allow them to proceed
    // This handles the case where user verifies 2FA and then immediately signs in again
    // Use service role client to bypass RLS
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: verifiedSession } = await supabaseAdmin
      .from('two_factor_verification_sessions')
      .select('id, verified, expires_at, created_at')
      .eq('user_id', user.id)
      .eq('verified', true)
      .gt('expires_at', new Date().toISOString())
      .gt('created_at', thirtySecondsAgo) // Only if verified in last 30 seconds
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifiedSession) {
      console.log('✅ User has a recently verified 2FA session (within 30s) - allowing login');
      
      // Delete the verified session (one-time use) - use service role client
      await supabaseAdmin
        .from('two_factor_verification_sessions')
        .delete()
        .eq('id', verifiedSession.id);
      
      return NextResponse.json({
        success: true,
        data: {
          twoFactorRequired: false,
          message: '2FA already verified for this session',
        },
      });
    }
    
    console.log('🔒 2FA is enabled and no recent verification found - requiring 2FA');
    
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
    // Use service role client to bypass RLS (table only allows service_role)
    const { data: session, error: sessionError } = await supabaseAdmin
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
      console.error('❌ Session error details:', {
        hasError: !!sessionError,
        errorMessage: sessionError?.message,
        errorCode: sessionError?.code,
        errorDetails: sessionError?.details,
        errorHint: sessionError?.hint,
        hasSession: !!session,
        userId: user.id,
      });
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create verification session',
          code: 'SESSION_CREATION_FAILED',
          details: sessionError?.message || 'Unknown error'
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

