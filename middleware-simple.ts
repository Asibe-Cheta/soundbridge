import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simplified middleware for Next.js 15 edge runtime
// This version focuses on route protection without complex Supabase integration

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
    pathname.startsWith(route)
  );

  // Define auth routes that should redirect authenticated users
  const authRoutes = [
    '/login', 
    '/signup', 
    '/register',
    '/reset-password'
  ];
  
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // For protected routes, redirect to login
  // Note: Session validation will be handled in the page components
  if (isProtectedRoute) {
    // Check for auth token in cookies
    const authToken = req.cookies.get('sb-access-token')?.value;
    
    if (!authToken) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // For auth routes, redirect to dashboard if token exists
  if (isAuthRoute) {
    const authToken = req.cookies.get('sb-access-token')?.value;
    
    if (authToken) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Handle root path - redirect to dashboard if authenticated
  if (pathname === '/') {
    const authToken = req.cookies.get('sb-access-token')?.value;
    
    if (authToken) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
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