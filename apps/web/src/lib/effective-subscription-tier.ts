export type EffectiveTier = 'free' | 'premium' | 'unlimited';

type TierInput = string | null | undefined;

export interface ProfileTierInput {
  early_adopter?: boolean | null | string | number;
  subscription_tier?: string | null;
  subscription_period_end?: string | null;
}

/** Max published albums per tier (-1 = unlimited). Early adopters use resolveAlbumTierForLimits. */
export const ALBUM_PUBLISHED_COUNT_LIMITS: Record<EffectiveTier, number> = {
  free: 0,
  premium: 10,
  unlimited: -1,
};

function isEarlyAdopterFlag(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function normalizeTier(input: TierInput): EffectiveTier {
  const tier = String(input || 'free').toLowerCase();
  if (tier === 'unlimited' || tier === 'enterprise') return 'unlimited';
  if (tier === 'premium' || tier === 'pro') return 'premium';
  return 'free';
}

/**
 * Grant is active if there is no end date, or the end is strictly in the future (matches mobile).
 */
export function isSubscriptionGrantPeriodActive(subscription_period_end?: string | null): boolean {
  if (subscription_period_end == null || subscription_period_end === '') return true;
  const end = new Date(subscription_period_end as string);
  return Number.isFinite(end.getTime()) && end > new Date();
}

/**
 * Manual DB grant for early adopters (not necessarily reflected in RevenueCat).
 * Premium or unlimited tier + active period + early_adopter flag.
 */
export function isEarlyAdopterPremiumGrant(profile: ProfileTierInput | null | undefined): boolean {
  if (!profile) return false;
  if (!isEarlyAdopterFlag(profile.early_adopter)) return false;
  const profileTier = normalizeTier(profile.subscription_tier);
  if (profileTier !== 'premium' && profileTier !== 'unlimited') return false;
  return isSubscriptionGrantPeriodActive(profile.subscription_period_end);
}

/**
 * Album limits: any early adopter with an active grant period is treated as unlimited (per product spec).
 */
export function resolveAlbumTierForLimits(profile: ProfileTierInput | null | undefined): EffectiveTier {
  const tier = normalizeTier(profile?.subscription_tier);
  if (!profile) return tier;
  if (isEarlyAdopterFlag(profile.early_adopter) && isSubscriptionGrantPeriodActive(profile.subscription_period_end)) {
    return 'unlimited';
  }
  return tier;
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
    isSubscriptionGrantPeriodActive(profile.subscription_period_end);

  if (hasActiveEarlyAdopterGrant) {
    return profileTier;
  }

  if (profileTier !== 'free') {
    return profileTier;
  }

  return normalizedFallback;
}
