import { NextRequest, NextResponse } from 'next/server';
import {
  PARTNER_REFERRAL_COOKIE,
  PARTNER_REFERRAL_MAX_AGE_SECONDS,
  getPartnerCookieDomainForServer,
} from '@/src/lib/partner-referrals';

/**
 * Partner referral entry: /join?ref=jbenitez
 * Route Handler (not a Server Component) so we can set cookies before redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const referralCode = searchParams.get('ref')?.trim().toLowerCase() || null;
  const source = searchParams.get('source')?.trim().toLowerCase() || null;

  const signupParams = new URLSearchParams();
  if (referralCode) signupParams.set('ref', referralCode);
  if (source) signupParams.set('source', source);

  const query = signupParams.toString();
  const destination = new URL(query ? `/signup?${query}` : '/signup', request.url);
  const response = NextResponse.redirect(destination);

  if (referralCode) {
    const domain = getPartnerCookieDomainForServer();
    response.cookies.set(PARTNER_REFERRAL_COOKIE, referralCode, {
      maxAge: PARTNER_REFERRAL_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      ...(domain ? { domain } : {}),
    });
  }

  return response;
}
