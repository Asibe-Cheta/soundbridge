export type EffectiveTier = 'free' | 'premium' | 'unlimited';

type TierInput = string | null | undefined;

export interface ProfileTierInput {
  early_adopter?: boolean | null | string | number;
  subscription_tier?: string | null;
  subscription_period_end?: string | null;
}

function isEarlyAdopterFlag(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function normalizeTier(input: TierInput): EffectiveTier {
  const tier = String(input || 'free').toLowerCase();
  if (tier === 'unlimited' || tier === 'enterprise') return 'unlimited';
  if (tier === 'premium' || tier === 'pro') return 'premium';
  return 'free';
}

function isFutureDate(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms > Date.now();
}

/**
 * Use profile as source of truth for manual early-adopter grants when RC/fallback says free.
 */
export function resolveEffectiveTier(
  profile: ProfileTierInput | null | undefined,
  fallbackTier?: TierInput,
): EffectiveTier {
  const normalizedFallback = normalizeTier(fallbackTier);
  if (!profile) return normalizedFallback;

  const profileTier = normalizeTier(profile.subscription_tier);
  const hasActiveEarlyAdopterGrant =
    isEarlyAdopterFlag(profile.early_adopter) &&
    (profileTier === 'premium' || profileTier === 'unlimited') &&
    (!profile.subscription_period_end || isFutureDate(String(profile.subscription_period_end)));

  if (hasActiveEarlyAdopterGrant) {
    return profileTier;
  }

  if (profileTier !== 'free') {
    return profileTier;
  }

  return normalizedFallback;
}
