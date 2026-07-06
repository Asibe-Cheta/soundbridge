import type { SupabaseClient, User } from '@supabase/supabase-js';

export const SOUND_ACADEMY_SOURCE = 'sound_academy';
export const ABBEY_ROAD_INSTITUTE_SOURCE = 'abbey_road_institute';

const INSTITUTIONAL_SOURCES = new Set([SOUND_ACADEMY_SOURCE, ABBEY_ROAD_INSTITUTE_SOURCE]);

function isInstitutionalSource(source: string | null | undefined): source is string {
  return !!source && INSTITUTIONAL_SOURCES.has(source);
}

export const PARTNER_REFERRAL_COOKIE = 'soundbridge_referral_code';
export const PARTNER_SOURCE_COOKIE = 'soundbridge_signup_source';
export const PARTNER_REFERRAL_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Share cookies across soundbridge.live and www.soundbridge.live in production. */
function getPartnerCookieDomainAttribute(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname.toLowerCase();
  if (host === 'soundbridge.live' || host.endsWith('.soundbridge.live')) {
    return '; domain=.soundbridge.live';
  }
  return '';
}

export function getPartnerCookieDomainForServer(): string | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (siteUrl.includes('soundbridge.live')) return '.soundbridge.live';
  return undefined;
}

/** Persist partner `ref` (and optional source) for the full signup flow. */
export function persistPartnerReferralClient(
  referralCode: string | null | undefined,
  source?: string | null,
) {
  if (typeof window === 'undefined') return;

  const domain = getPartnerCookieDomainAttribute();
  const code = typeof referralCode === 'string' ? referralCode.trim().toLowerCase() : '';
  if (code) {
    localStorage.setItem(PARTNER_REFERRAL_COOKIE, code);
    document.cookie = `${PARTNER_REFERRAL_COOKIE}=${encodeURIComponent(code)}; max-age=${PARTNER_REFERRAL_MAX_AGE_SECONDS}; path=/; samesite=lax${domain}`;
  }

  const normalizedSource = typeof source === 'string' ? source.trim().toLowerCase() : '';
  if (normalizedSource) {
    localStorage.setItem(PARTNER_SOURCE_COOKIE, normalizedSource);
    document.cookie = `${PARTNER_SOURCE_COOKIE}=${encodeURIComponent(normalizedSource)}; max-age=${PARTNER_REFERRAL_MAX_AGE_SECONDS}; path=/; samesite=lax${domain}`;
  }
}

export function readPartnerReferralFromClient(): {
  referralCode: string | null;
  source: string | null;
} {
  if (typeof window === 'undefined') {
    return { referralCode: null, source: null };
  }

  const cookieValue = (name: string) =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1];

  const storedRef = localStorage.getItem(PARTNER_REFERRAL_COOKIE)?.trim().toLowerCase() || null;
  const storedSource = localStorage.getItem(PARTNER_SOURCE_COOKIE)?.trim().toLowerCase() || null;
  const cookieRef = cookieValue(PARTNER_REFERRAL_COOKIE);
  const cookieSource = cookieValue(PARTNER_SOURCE_COOKIE);

  return {
    referralCode: storedRef || (cookieRef ? decodeURIComponent(cookieRef).trim().toLowerCase() : null),
    source: storedSource || (cookieSource ? decodeURIComponent(cookieSource).trim().toLowerCase() : null),
  };
}

type PartnerAttributionInput = {
  userId: string;
  email?: string | null;
  metadata?: Record<string, unknown> | null;
  referralCode?: string | null;
  source?: string | null;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

export function getReferralCodeFromMetadata(metadata?: Record<string, unknown> | null): string | null {
  return (
    normalizeText(metadata?.referred_by_code) ||
    normalizeText(metadata?.referral_code) ||
    normalizeText(metadata?.ref)
  );
}

export function getSignupSourceFromMetadata(metadata?: Record<string, unknown> | null): string | null {
  return normalizeText(metadata?.source);
}

export function monthlyValueForSubscriptionTier(tier?: string | null): number {
  switch (normalizeText(tier)) {
    case 'premium':
      return 6.99;
    case 'unlimited':
      return 12.99;
    case 'pro':
      return 9.99;
    default:
      return 0;
  }
}

async function sendInstitutionalWelcomeEmail(
  institution: string,
  email: string | null | undefined,
  expiresAt?: string | null,
) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey || !email) return;

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live';
  const fromName = process.env.SENDGRID_FROM_NAME || 'SoundBridge Team';
  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'one year from signup';

  const partnerLabel =
    institution === ABBEY_ROAD_INSTITUTE_SOURCE
      ? 'Abbey Road Institute'
      : 'Sound Academy';

  const html = `
    <p>Welcome to SoundBridge.</p>
    <p>Your one year Premium access has been activated as part of the ${partnerLabel} partnership with SoundBridge.</p>
    <p>Here is what to do next:</p>
    <ul>
      <li>Complete your profile with your bio, photo and genre</li>
      <li>List your audio engineering services so clients can find and book you</li>
      <li>Upload a sample of your work</li>
    </ul>
    <p>Your Premium access is active until <strong>${expiryText}</strong>.</p>
    <p>Any questions, reach out anytime.</p>
    <p>Justice | SoundBridge</p>
  `;

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      personalizations: [{ to: [{ email }] }],
      subject: 'Your SoundBridge Premium Access is Active',
      content: [{ type: 'text/html', value: html }],
    }),
  }).catch((error) => {
    console.error('[partner-referrals] institutional welcome email failed:', error);
  });
}

export async function processPartnerAttribution(
  supabase: SupabaseClient,
  input: PartnerAttributionInput,
) {
  const metadata = input.metadata ?? {};
  const referralCode = normalizeText(input.referralCode) || getReferralCodeFromMetadata(metadata);
  const source = normalizeText(input.source) || getSignupSourceFromMetadata(metadata);

  if (referralCode) {
    // Prefer RPC (stamps profiles.referred_by_code + referral_signups when partner exists).
    const { error } = await supabase.rpc('record_referral_signup', {
      p_referred_user_id: input.userId,
      p_referral_code: referralCode,
    });
    if (error) {
      console.error('[partner-referrals] record_referral_signup failed:', error.message);
      // Fallback: still stamp the profile so attribution is not lost if RPC is outdated.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          referred_by_code: referralCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.userId)
        .is('referred_by_code', null);
      if (profileError) {
        console.error('[partner-referrals] profiles.referred_by_code fallback failed:', profileError.message);
      }
    }
  }

  if (isInstitutionalSource(source)) {
    const { error } = await supabase.rpc('grant_institutional_access', {
      p_user_id: input.userId,
      p_institution: source,
      p_access_tier: 'premium',
    });
    if (error) {
      console.error('[partner-referrals] grant_institutional_access failed:', error.message);
      return;
    }

    const { data } = await supabase
      .from('institutional_access')
      .select('expires_at')
      .eq('user_id', input.userId)
      .eq('institution', source)
      .maybeSingle();

    await sendInstitutionalWelcomeEmail(source, input.email, data?.expires_at ?? null);
  }
}

export async function processPartnerAttributionForAuthUser(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  fallback?: { referralCode?: string | null; source?: string | null },
) {
  await processPartnerAttribution(supabase, {
    userId: user.id,
    email: user.email,
    metadata: user.user_metadata as Record<string, unknown>,
    referralCode: fallback?.referralCode,
    source: fallback?.source,
  });
}

/**
 * On sign-in / session load: grant institutional Premium if metadata matches
 * and profile is still free. Idempotent RPC; does not re-send welcome email.
 */
export async function ensureInstitutionalPremiumAccess(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'user_metadata'>,
): Promise<boolean> {
  const source = getSignupSourceFromMetadata(user.user_metadata as Record<string, unknown>);
  if (!isInstitutionalSource(source)) return false;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[partner-referrals] profile tier lookup failed:', profileError.message);
    return false;
  }

  const tier = normalizeText(profile?.subscription_tier);
  if (tier && tier !== 'free') return false;

  const { error } = await supabase.rpc('grant_institutional_access', {
    p_user_id: user.id,
    p_institution: source,
    p_access_tier: 'premium',
  });

  if (error) {
    console.error('[partner-referrals] ensureInstitutionalPremiumAccess failed:', error.message);
    return false;
  }

  return true;
}

/** @deprecated Use ensureInstitutionalPremiumAccess */
export async function ensureSoundAcademyPremiumAccess(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'user_metadata'>,
): Promise<boolean> {
  return ensureInstitutionalPremiumAccess(supabase, user);
}

export async function recordReferralConversion(
  supabase: SupabaseClient,
  userId: string,
  subscriptionTier: string,
  monthlyValue = monthlyValueForSubscriptionTier(subscriptionTier),
) {
  if (!userId || !monthlyValue) return;

  const { error } = await supabase.rpc('record_referral_conversion', {
    p_referred_user_id: userId,
    p_subscription_tier: subscriptionTier,
    p_monthly_value: monthlyValue,
  });

  if (error) {
    console.error('[partner-referrals] record_referral_conversion failed:', error.message);
  }
}
