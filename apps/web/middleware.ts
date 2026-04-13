import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSiteHostname, isSoundBridgeProductionHost } from '@/src/lib/site-url';

const AT_PROFILE = /^\/@([^/]+)\/?$/;

/**
 * Shared profile links from the mobile app use https://soundbridge.live/@username.
 * Next.js cannot use a literal `app/@/…` route (conflicts with parallel routes), so we rewrite here.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const hostNoPort = host?.split(':')[0]?.toLowerCase();
  const canonicalHost = getSiteHostname();

  if (hostNoPort && isSoundBridgeProductionHost(hostNoPort) && hostNoPort !== canonicalHost) {
    const dest = new URL(request.url);
    dest.hostname = canonicalHost;
    dest.protocol = 'https:';
    dest.port = '';
    return NextResponse.redirect(dest, 308);
  }

  const pathname = request.nextUrl.pathname;
  const match = pathname.match(AT_PROFILE);
  if (!match?.[1]) {
    return NextResponse.next();
  }

  const raw = match[1];
  if (raw.includes('..') || raw.includes('\\')) {
    return NextResponse.next();
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

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
