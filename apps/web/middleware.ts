import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSiteHostname, isSoundBridgeProductionHost } from '@/src/lib/site-url';

const AT_PROFILE = /^\/@([^/]+)\/?$/;
const MAX_COOKIE_CHUNKS = 6;

function getSupabaseProjectRef(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split('.')[0];
    return projectRef || null;
  } catch {
    return null;
  }
}

function buildLegacyAuthCookieNames(projectRef: string): string[] {
  const baseNames = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token-code-verifier`,
  ];

  for (let i = 0; i < MAX_COOKIE_CHUNKS; i += 1) {
    baseNames.push(`sb-${projectRef}-auth-token.${i}`);
  }

  return baseNames;
}

function clearLegacyAuthCookies(response: NextResponse) {
  const projectRef = getSupabaseProjectRef();
  if (!projectRef) return;

  const cookieNames = buildLegacyAuthCookieNames(projectRef);
  const domains = ['.soundbridge.live', 'soundbridge.live'];

  for (const name of cookieNames) {
    for (const domain of domains) {
      response.cookies.set({
        name,
        value: '',
        domain,
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: true,
      });
    }
  }
}

/**
 * Shared profile links from the mobile app use https://soundbridge.live/@username.
 * Next.js cannot use a literal `app/@/…` route (conflicts with parallel routes), so we rewrite here.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const hostNoPort = host?.split(':')[0]?.toLowerCase();
  const canonicalHost = getSiteHostname();
  const pathname = request.nextUrl.pathname;
  const isApiPath = pathname.startsWith('/api/');
  const shouldCleanupLegacyAuthCookies =
    !!hostNoPort && isSoundBridgeProductionHost(hostNoPort);

  if (
    hostNoPort &&
    isSoundBridgeProductionHost(hostNoPort) &&
    hostNoPort !== canonicalHost &&
    !isApiPath
  ) {
    const dest = new URL(request.url);
    dest.hostname = canonicalHost;
    dest.protocol = 'https:';
    dest.port = '';
    const redirectResponse = NextResponse.redirect(dest, 308);
    if (shouldCleanupLegacyAuthCookies) {
      clearLegacyAuthCookies(redirectResponse);
    }
    return redirectResponse;
  }

  const match = pathname.match(AT_PROFILE);
  if (!match?.[1]) {
    const nextResponse = NextResponse.next();
    if (shouldCleanupLegacyAuthCookies) {
      clearLegacyAuthCookies(nextResponse);
    }
    return nextResponse;
  }

  const raw = match[1];
  if (raw.includes('..') || raw.includes('\\')) {
    const nextResponse = NextResponse.next();
    if (shouldCleanupLegacyAuthCookies) {
      clearLegacyAuthCookies(nextResponse);
    }
    return nextResponse;
  }

  let username: string;
  try {
    username = decodeURIComponent(raw);
  } catch {
    username = raw;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/creator/${encodeURIComponent(username)}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-sb-open-app-banner', '1');

  const rewrittenResponse = NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
  if (shouldCleanupLegacyAuthCookies) {
    clearLegacyAuthCookies(rewrittenResponse);
  }
  return rewrittenResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
