import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  PARTNER_REFERRAL_COOKIE,
  PARTNER_REFERRAL_MAX_AGE_SECONDS,
  getPartnerCookieDomainForServer,
} from '@/src/lib/partner-referrals';

/**
 * Partner referral entry: /join?ref=jbenitez
 * Capture `ref` in a durable cookie before redirecting to signup, so attribution
 * survives navigation and OAuth redirects.
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; source?: string }>;
}) {
  const params = await searchParams;
  const referralCode = params.ref?.trim().toLowerCase() || null;
  const source = params.source?.trim().toLowerCase() || null;

  if (referralCode) {
    const cookieStore = await cookies();
    const domain = getPartnerCookieDomainForServer();
    cookieStore.set(PARTNER_REFERRAL_COOKIE, referralCode, {
      maxAge: PARTNER_REFERRAL_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      ...(domain ? { domain } : {}),
    });
  }

  const signupParams = new URLSearchParams();
  if (referralCode) signupParams.set('ref', referralCode);
  if (source) signupParams.set('source', source);

  const query = signupParams.toString();
  redirect(query ? `/signup?${query}` : '/signup');
}
