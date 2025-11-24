/**
 * POST /api/auth/login-initiate
 * 
 * Validates credentials and checks 2FA requirement BEFORE creating a session
 * This prevents the brief app flash by checking 2FA status before authentication
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "userpassword"
 * }
 * 
 * Response (2FA Required):
 * {
 *   "success": true,
 *   "requires2FA": true,
 *   "data": {
 *     "userId": "uuid",
 *     "email": "user@example.com",
 *     "verificationSessionId": "uuid"
 *   }
 * }
 * 
 * Response (No 2FA):
 * {
 *   "success": true,
 *   "requires2FA": false,
 *   "data": {
 *     "accessToken": "jwt-token",
 *     "refreshToken": "refresh-token",
 *     "user": { ... }
 *   }
 * }
 * 
 * Response (Invalid Credentials):
 * {
 *   "success": false,
 *   "error": "Invalid email or password"
 * }
 * 
 * Authentication: Not required (this endpoint validates credentials)
 * Rate Limit: Should be implemented at API gateway level
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptSecret } from '@/src/lib/encryption';
import crypto from 'crypto';

// Create admin client for server-side operations
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

// Create regular client for token generation (uses anon key)
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

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login Initiate: Starting...');
    
    // ================================================
    // 1. Parse and validate request
    // ================================================
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email is required',
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      );
    }
    
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Password is required',
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      );
    }
    
    console.log('✅ Request validated for email:', email);
    
    // ================================================
    // 2. Validate credentials using Supabase Auth
    // ================================================
    // Sign in to validate credentials (this creates a session, but we'll sign out immediately)
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError || !signInData.user) {
      console.error('❌ Invalid credentials:', signInError?.message);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }
    
    console.log('✅ Credentials validated for user:', signInData.user.id);
    
    // ================================================
    // 3. Sign out immediately to prevent session creation
    // ================================================
    // We use admin client to sign out the user immediately
    // This prevents any session from being created
    await supabaseAdmin.auth.admin.signOut(signInData.user.id, 'global');
    
    console.log('✅ Signed out user to prevent session creation');
    
    const userId = signInData.user.id;
    
    // ================================================
    // 4. Check if 2FA is required
    // ================================================
    const { data: secret, error: secretError } = await supabaseAdmin
      .from('two_factor_secrets')
      .select('id, method')
      .eq('user_id', userId)
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
    // 5. If no 2FA required, authenticate and return tokens
    // ================================================
    if (!secret) {
      console.log('✅ No 2FA required - authenticating user');
      
      // Re-authenticate to get session tokens
      const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError || !authData.session) {
        console.error('❌ Failed to create session:', authError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to create session',
            code: 'SESSION_CREATION_FAILED'
          },
          { status: 500 }
        );
      }
      
      console.log('✅ Session created successfully');
      
      return NextResponse.json({
        success: true,
        requires2FA: false,
        data: {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          user: {
            id: authData.user.id,
            email: authData.user.email,
            ...authData.user,
          },
        },
      });
    }
    
    // ================================================
    // 6. 2FA is required - create verification session
    // ================================================
    console.log('🔒 2FA is required - creating verification session');
    
    // Generate unique session token (for backward compatibility with existing endpoints)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Encrypt password for secure storage (expires with session)
    const encryptedPassword = encryptSecret(password);
    
    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    
    // Create verification session (expires in 5 minutes)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('two_factor_verification_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        email: email,
        password_hash: encryptedPassword,
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
          code: 'SESSION_CREATION_FAILED',
          details: sessionError?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Verification session created:', session.id);
    
    // ================================================
    // 7. Log audit event
    // ================================================
    await supabaseAdmin
      .from('two_factor_audit_log')
      .insert({
        user_id: userId,
        action: 'verification_required',
        method: secret.method,
        success: true,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    
    // ================================================
    // 8. Return response with verificationSessionId
    // ================================================
    return NextResponse.json({
      success: true,
      requires2FA: true,
      data: {
        userId: userId,
        email: email,
        verificationSessionId: session.id, // UUID, not session_token
      },
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in login-initiate:', error);
    
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

