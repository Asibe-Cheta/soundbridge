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

// Service-role client: use ONLY for auth.admin.* and PostgREST (.from).
// Never call signInWithPassword on this client — Supabase attaches the user's JWT
// to the same instance, and subsequent .from() calls run as that user, so RLS blocks
// inserts into two_factor_verification_sessions.
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function get2FAStatusForUser(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<{ enabled: true; method: string } | { enabled: false }> {
  const { data: secret, error } = await supabaseAdmin
    .from('two_factor_secrets')
    .select('id, method, encrypted_secret')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return Promise.reject(error);
  }

  if (!secret?.id || !secret.encrypted_secret) {
    return { enabled: false };
  }

  return { enabled: true, method: secret.method };
}

export async function POST(request: NextRequest) {
  try {
    console.log('Login Initiate: Starting...');

    const body = await request.json();
    const { email, password } = body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Password is required',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    console.log('Request validated for email:', normalizedEmail);

    // 2. Validate credentials with anon client only (never signIn on service-role client)
    const supabaseAnon = getSupabaseAnon();

    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError || !signInData.user) {
      console.error('Invalid credentials:', signInError?.message);

      let authUser;
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          filter: `email.eq.${normalizedEmail}`,
        });
        if (listError) {
          console.error('Error listing auth users:', listError);
        } else {
          const users = listData?.users || [];
          authUser = users[0];
        }
      } catch (lookupError) {
        console.error('Error during auth user lookup:', lookupError);
      }

      if (authUser) {
        const providers = Array.isArray(authUser.app_metadata?.providers)
          ? authUser.app_metadata.providers
          : [];

        if (!authUser.email_confirmed_at) {
          console.warn('Email not confirmed for user:', authUser.id);
          return NextResponse.json(
            {
              success: false,
              error: 'Email not confirmed',
              code: 'EMAIL_UNCONFIRMED',
            },
            { status: 401 }
          );
        }

        if (!authUser.encrypted_password) {
          const hasOAuthProvider = providers.some((provider: string) => provider !== 'email');
          console.warn('Password not set for user:', authUser.id, 'providers:', providers);
          return NextResponse.json(
            {
              success: false,
              error: hasOAuthProvider ? 'OAuth-only account' : 'Password not set for this account',
              code: hasOAuthProvider ? 'OAUTH_ONLY' : 'PASSWORD_NOT_SET',
            },
            { status: 401 }
          );
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    console.log('Credentials validated for user:', signInData.user.id);

    const userId = signInData.user.id;

    // 3. Revoke credential-check session
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.auth.admin.signOut(userId, 'global');
    await supabaseAnon.auth.signOut();

    console.log('Signed out after credential validation');

    // 4. 2FA only when a complete secret row exists — never insert verification_sessions otherwise
    let twoFA: Awaited<ReturnType<typeof get2FAStatusForUser>>;
    try {
      twoFA = await get2FAStatusForUser(supabaseAdmin, userId);
    } catch (secretError: unknown) {
      console.error('Error checking 2FA status:', secretError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to check 2FA status',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    // 5. No 2FA: issue session tokens
    if (!twoFA.enabled) {
      console.log('No 2FA required — issuing session');

      const supabaseAnonSession = getSupabaseAnon();

      const { data: authData, error: authError } = await supabaseAnonSession.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError || !authData.session) {
        console.error('Failed to create session:', authError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create session',
            code: 'SESSION_CREATION_FAILED',
          },
          { status: 500 }
        );
      }

      console.log('Session created successfully');

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

    // 6. 2FA required — create verification session (service-role DB client never had user signIn)
    console.log('2FA required — creating verification session');

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const encryptedPassword = encryptSecret(password);

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('two_factor_verification_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        email: normalizedEmail,
        password_hash: encryptedPassword,
        verified: false,
        failed_attempts: 0,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Failed to create verification session:', sessionError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create verification session',
          code: 'SESSION_CREATION_FAILED',
          details: sessionError?.message || 'Unknown error',
        },
        { status: 500 }
      );
    }

    console.log('Verification session created:', session.id);

    await supabaseAdmin.from('two_factor_audit_log').insert({
      user_id: userId,
      action: 'verification_required',
      method: twoFA.method,
      success: true,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      requires2FA: true,
      data: {
        userId: userId,
        email: normalizedEmail,
        verificationSessionId: session.id,
      },
    });
  } catch (error: unknown) {
    console.error('Unexpected error in login-initiate:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
