import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

/**
 * Diagnostic endpoint to check authentication and environment variables
 * Useful for debugging 401 errors
 */
export async function GET(request: NextRequest) {
  const checks: Record<string, { status: 'ok' | 'error' | 'missing'; message: string; value?: string }> = {};

  // Check environment variables
  checks.supabaseUrl = {
    status: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing',
    message: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Supabase URL is set' : 'NEXT_PUBLIC_SUPABASE_URL is missing',
    value: process.env.NEXT_PUBLIC_SUPABASE_URL ? '***set***' : undefined,
  };

  checks.supabaseAnonKey = {
    status: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ok' : 'missing',
    message: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Supabase Anon Key is set' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing',
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***set***' : undefined,
  };

  checks.supabaseServiceRoleKey = {
    status: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing',
    message: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key is set' : 'SUPABASE_SERVICE_ROLE_KEY is missing (optional for some operations)',
    value: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***set***' : undefined,
  };

  // Check authentication
  try {
    const { user, error, mode } = await getSupabaseRouteClient(request, false);
    
    checks.authentication = {
      status: user ? 'ok' : (error ? 'error' : 'missing'),
      message: user 
        ? `Authenticated as ${user.email} (mode: ${mode})`
        : error 
          ? `Authentication failed: ${error.message}`
          : 'No authentication provided',
    };

    if (user) {
      checks.userId = {
        status: 'ok',
        message: `User ID: ${user.id}`,
        value: user.id,
      };
    }
  } catch (err: any) {
    checks.authentication = {
      status: 'error',
      message: `Error checking authentication: ${err.message}`,
    };
  }

  // Check cookies
  const cookieHeader = request.headers.get('cookie');
  checks.cookies = {
    status: cookieHeader ? 'ok' : 'missing',
    message: cookieHeader ? 'Cookies are present in request' : 'No cookies in request',
    value: cookieHeader ? '***present***' : undefined,
  };

  const allOk = Object.values(checks).every(check => check.status === 'ok' || check.status === 'missing');
  const hasErrors = Object.values(checks).some(check => check.status === 'error');
  const hasMissing = Object.values(checks).some(check => check.status === 'missing');

  return NextResponse.json({
    status: hasErrors ? 'error' : hasMissing ? 'warning' : 'ok',
    checks,
    summary: {
      total: Object.keys(checks).length,
      ok: Object.values(checks).filter(c => c.status === 'ok').length,
      missing: Object.values(checks).filter(c => c.status === 'missing').length,
      errors: Object.values(checks).filter(c => c.status === 'error').length,
    },
    recommendations: [
      ...(checks.supabaseUrl.status === 'missing' ? ['Set NEXT_PUBLIC_SUPABASE_URL in your environment variables'] : []),
      ...(checks.supabaseAnonKey.status === 'missing' ? ['Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables'] : []),
      ...(checks.authentication.status === 'error' ? ['Check if your session has expired - try logging out and back in'] : []),
      ...(checks.cookies.status === 'missing' ? ['Ensure credentials: "include" is set in fetch requests'] : []),
    ],
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

