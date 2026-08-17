import type { SupabaseClient, User } from '@supabase/supabase-js';

export const SOUND_ACADEMY_SOURCE = 'sound_academy';
export const ABBEY_ROAD_INSTITUTE_SOURCE = 'abbey_road_institute';
export const LOGIC_CHURCH_SOURCE = 'logic_church';

const INSTITUTIONAL_SOURCES = new Set([SOUND_ACADEMY_SOURCE, ABBEY_ROAD_INSTITUTE_SOURCE, LOGIC_CHURCH_SOURCE]);

/**
 * Partners whose members get a personal 10% referral link in addition to the
 * standard 1yr institutional Premium grant (unlike Sound Academy / Abbey Road,
 * which only grant Premium). Drives both applyPendingPartnerRegistrations()
 * below and the welcome-email copy.
 */
const REFERRAL_LINK_PARTNER_IDS = new Set([LOGIC_CHURCH_SOURCE]);

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
  /**
   * Last-visited-fan-page signal (UNIFY_FAN_PAGE_AND_REF.MD) — the creator id from the
   * existing community-entry cookie (see src/lib/community-entry.ts), read at the same
   * signup chokepoints as `referralCode`. Only used when no explicit `referralCode` is
   * present; the RPC resolves whether that creator is a designated Partner and applies
   * the same commission-attribution logic as the ?ref= flow, or does nothing if not.
   */
  fanPageCreatorId?: string | null;
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
  referralLink?: string | null,
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
      : institution === LOGIC_CHURCH_SOURCE
        ? 'Logic Church'
        : 'Sound Academy';

  const referralParagraph = referralLink
    ? `<p>You also have your own personal referral link, earning you 10% commission on every subscriber who joins through it: <a href="${referralLink}">${referralLink}</a></p>
       <p>Your fan page link, found in Settings on your profile in the app, works exactly the same way for tracking referrals.</p>`
    : '';

  const html = `
    <p>Welcome to SoundBridge.</p>
    <p>Your one year Premium access has been activated as part of the ${partnerLabel} partnership with SoundBridge.</p>
    ${referralParagraph}
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

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
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
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(
        '[partner-referrals] institutional welcome email failed:',
        response.status,
        body.slice(0, 500),
      );
    }
  } catch (error) {
    console.error('[partner-referrals] institutional welcome email failed:', error);
  }
}

/**
 * Generates a unique partners.referral_code for a user from their username,
 * falling back to appending part of their user id if the plain username is
 * already taken (mirrors the manual per-user setup scripts under
 * scripts/partner-referral-setup-*.sql, which use lower(username) as-is).
 */
async function createPartnerReferralLink(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ referralCode: string; referralLink: string } | null> {
  const { data: existing } = await supabase
    .from('partners')
    .select('referral_code, referral_link')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.referral_code && existing?.referral_link) {
    return { referralCode: existing.referral_code, referralLink: existing.referral_link };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();
  const baseUsername = normalizeText(profile?.username);
  if (!baseUsername) return null;

  const candidates = [baseUsername, `${baseUsername}-${userId.slice(0, 6)}`];
  for (const code of candidates) {
    const referralLink = `https://soundbridge.live/join?ref=${code}`;
    const { error } = await supabase.from('partners').insert({
      user_id: userId,
      referral_code: code,
      referral_link: referralLink,
      commission_rate: 0.10,
    });
    if (!error) return { referralCode: code, referralLink };
    // 23505 = unique_violation on referral_code; try the next candidate.
    if ((error as { code?: string }).code !== '23505') {
      console.error('[partner-referrals] createPartnerReferralLink insert failed:', error.message);
      return null;
    }
  }
  return null;
}

/**
 * Matches the signed-up user's email against pending partner_registrations
 * rows (see supabase/migrations/20260816120000_logic_church_partner_registrations.sql)
 * and, for each match, applies institutional Premium (+ a referral link, for
 * partners in REFERRAL_LINK_PARTNER_IDS) exactly as if they'd signed up
 * through the ?source= flow — then marks the registration provisioned.
 * Safe to call on every signup/session-load; no-ops when there's no pending row.
 */
export async function applyPendingPartnerRegistrations(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
) {
  const normalizedEmail = normalizeText(email);
  if (!normalizedEmail) return;

  const { data: pending, error } = await supabase
    .from('partner_registrations')
    .select('id, partner_id')
    .ilike('email', normalizedEmail)
    .eq('status', 'pending');

  if (error) {
    console.error('[partner-referrals] applyPendingPartnerRegistrations lookup failed:', error.message);
    return;
  }
  if (!pending || pending.length === 0) return;

  for (const registration of pending) {
    const partnerId = String(registration.partner_id);

    const { error: grantError } = await supabase.rpc('grant_institutional_access', {
      p_user_id: userId,
      p_institution: partnerId,
      p_access_tier: 'premium',
    });
    if (grantError) {
      console.error('[partner-referrals] grant_institutional_access (registration) failed:', grantError.message);
      continue;
    }

    let referralLink: string | null = null;
    if (REFERRAL_LINK_PARTNER_IDS.has(partnerId)) {
      const referral = await createPartnerReferralLink(supabase, userId);
      referralLink = referral?.referralLink ?? null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_badge')
      .eq('id', userId)
      .maybeSingle();
    if (!profile?.institution_badge) {
      const { error: badgeError } = await supabase
        .from('profiles')
        .update({ institution_badge: partnerId, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (badgeError) {
        console.error('[partner-referrals] institution_badge update failed:', badgeError.message);
      }
    }

    await supabase
      .from('partner_registrations')
      .update({ status: 'provisioned', provisioned_user_id: userId, provisioned_at: new Date().toISOString() })
      .eq('id', registration.id);

    const { data: accessRow } = await supabase
      .from('institutional_access')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('institution', partnerId)
      .maybeSingle();

    await sendInstitutionalWelcomeEmail(partnerId, normalizedEmail, accessRow?.expires_at ?? null, referralLink);
  }
}

export async function processPartnerAttribution(
  supabase: SupabaseClient,
  input: PartnerAttributionInput,
) {
  const metadata = input.metadata ?? {};
  const referralCode = normalizeText(input.referralCode) || getReferralCodeFromMetadata(metadata);
  const source = normalizeText(input.source) || getSignupSourceFromMetadata(metadata);
  const fanPageCreatorId = input.fanPageCreatorId?.trim() || null;

  // Email-matched partner pre-registrations (e.g. Logic Church) — independent
  // of the ?source=/?ref= cookie flow used by Sound Academy / Abbey Road.
  await applyPendingPartnerRegistrations(supabase, input.userId, input.email);

  if (referralCode || fanPageCreatorId) {
    // Prefer RPC (stamps profiles.referred_by_code + referral_signups when partner exists).
    // Explicit referralCode always takes priority — the RPC only falls back to
    // fanPageCreatorId (and only credits it if that creator is a designated Partner)
    // when referralCode is absent, so a signup is never double-attributed.
    const { error } = await supabase.rpc('record_referral_signup', {
      p_referred_user_id: input.userId,
      p_referral_code: referralCode,
      p_fan_page_creator_id: fanPageCreatorId,
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
  fallback?: { referralCode?: string | null; source?: string | null; fanPageCreatorId?: string | null },
) {
  await processPartnerAttribution(supabase, {
    userId: user.id,
    email: user.email,
    metadata: user.user_metadata as Record<string, unknown>,
    referralCode: fallback?.referralCode,
    source: fallback?.source,
    fanPageCreatorId: fallback?.fanPageCreatorId,
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
