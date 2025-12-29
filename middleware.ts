import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Environment variables for edge runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(req: NextRequest) {
  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not available in middleware');
    return NextResponse.next();
  }

  try {
    const res = NextResponse.next();
    
    // Create Supabase middleware client
    const supabase = createMiddlewareClient(
      { req, res },
      {
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      }
    );

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Define protected routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/upload', 
      '/analytics',
      '/creator',
      '/events/create',
      '/notifications'
    ];
    
    const isProtectedRoute = protectedRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    );

    // Define auth routes that should redirect authenticated users
    const authRoutes = [
      '/login', 
      '/signup', 
      '/register',
      '/reset-password'
    ];
    
    const isAuthRoute = authRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    );

    // Handle protected routes - redirect to login if no session
    if (isProtectedRoute && !session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Handle auth routes - redirect to dashboard if already authenticated
    if (isAuthRoute && session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }

    // Handle root path - redirect authenticated users to dashboard
    // Commented out to allow authenticated users to access homepage
    // if (req.nextUrl.pathname === '/' && session) {
    //   const redirectUrl = req.nextUrl.clone();
    //   redirectUrl.pathname = '/dashboard';
    //   return NextResponse.redirect(redirectUrl);
    // }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Fallback response if middleware fails
    return NextResponse.next();
  }
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
     * - wise-webhook (Wise webhook endpoint - no auth needed)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/|wise-webhook).*)',
  ],
}; 