import type { SupabaseClient, User } from '@supabase/supabase-js';

const SOUND_ACADEMY_SOURCE = 'sound_academy';

export const PARTNER_REFERRAL_COOKIE = 'soundbridge_referral_code';
export const PARTNER_SOURCE_COOKIE = 'soundbridge_signup_source';

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

async function sendSoundAcademyWelcomeEmail(email: string | null | undefined, expiresAt?: string | null) {
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

  const html = `
    <p>Welcome to SoundBridge.</p>
    <p>Your one year Premium access has been activated as part of the Sound Academy partnership with SoundBridge.</p>
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
    console.error('[partner-referrals] Sound Academy welcome email failed:', error);
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
    const { error } = await supabase.rpc('record_referral_signup', {
      p_referred_user_id: input.userId,
      p_referral_code: referralCode,
    });
    if (error) {
      console.error('[partner-referrals] record_referral_signup failed:', error.message);
    }
  }

  if (source === SOUND_ACADEMY_SOURCE) {
    const { error } = await supabase.rpc('grant_institutional_access', {
      p_user_id: input.userId,
      p_institution: SOUND_ACADEMY_SOURCE,
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
      .eq('institution', SOUND_ACADEMY_SOURCE)
      .maybeSingle();

    await sendSoundAcademyWelcomeEmail(input.email, data?.expires_at ?? null);
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
