import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge runtime compatible middleware for Next.js 15
export async function middleware(req: NextRequest) {
  // Early return for static assets and API routes
  const { pathname } = req.nextUrl;
  
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  try {
    const res = NextResponse.next();
    
    // Get environment variables with fallbacks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If environment variables are not available, use simplified auth check
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not available, using cookie-based auth check');
      return handleSimpleAuth(req);
    }

    // Create Supabase middleware client
    const supabase = createMiddlewareClient(
      { req, res },
      {
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      }
    );

    // Get session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Supabase session error:', error);
      return handleSimpleAuth(req);
    }

    // Define protected routes
    const protectedRoutes = [
      '/dashboard',
      '/upload', 
      '/analytics',
      '/creator',
      '/events/create',
      '/notifications'
    ];
    
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    );

    // Define auth routes
    const authRoutes = [
      '/login', 
      '/signup', 
      '/register',
      '/reset-password'
    ];
    
    const isAuthRoute = authRoutes.some(route => 
      pathname.startsWith(route)
    );

    // Handle protected routes
    if (isProtectedRoute && !session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Handle auth routes
    if (isAuthRoute && session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }

    // Handle root path
    if (pathname === '/' && session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Fallback to simple auth check
    return handleSimpleAuth(req);
  }
}

// Fallback function for simple cookie-based auth
function handleSimpleAuth(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Define protected routes
  const protectedRoutes = [
    '/dashboard',
    '/upload', 
    '/analytics',
    '/creator',
    '/events/create',
    '/notifications'
  ];
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Define auth routes
  const authRoutes = [
    '/login', 
    '/signup', 
    '/register',
    '/reset-password'
  ];
  
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check for auth tokens in cookies
  const accessToken = req.cookies.get('sb-access-token')?.value;
  const refreshToken = req.cookies.get('sb-refresh-token')?.value;
  const hasAuthTokens = accessToken || refreshToken;

  // Handle protected routes
  if (isProtectedRoute && !hasAuthTokens) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Handle auth routes
  if (isAuthRoute && hasAuthTokens) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  // Handle root path
  if (pathname === '/' && hasAuthTokens) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
}; 