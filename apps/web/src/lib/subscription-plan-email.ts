/**
 * Plan names, prices, and features for subscription upgrade emails (mobile/RevenueCat).
 * @see WEB_TEAM_SUBSCRIPTION_UPGRADE_EMAIL.md
 */

export type SubscriptionTier = 'free' | 'premium' | 'unlimited';

export const SUBSCRIPTION_PLAN_EMAIL = {
  premium: {
    plan_name: 'Premium',
    plan_price_monthly: '£6.99/month',
    plan_price_yearly: '£69.99/year',
    features: [
      '2GB storage (~250 tracks)',
      'Sell downloads & tips — same 85% creator share as Free',
      'Sell audio downloads',
      'Pro badge on profile',
      'Featured on Discover 1×/month',
      'Advanced analytics',
      'Priority in feed',
    ],
  },
  unlimited: {
    plan_name: 'Unlimited',
    plan_price_monthly: '£12.99/month',
    plan_price_yearly: '£129.99/year',
    features: [
      '10GB storage (~1,000+ tracks)',
      'Unlimited badge on profile',
      'Featured on Discover 2×/month',
      'Fan subscriptions (earn monthly)',
      'Social media post generator',
      'Custom promo codes',
      'Email list export',
    ],
  },
} as const;

export function getPlanPriceLabel(tier: 'premium' | 'unlimited', activeSubscriptions?: string[]): string {
  const isAnnual = Array.isArray(activeSubscriptions) && activeSubscriptions.includes('annual');
  return isAnnual
    ? SUBSCRIPTION_PLAN_EMAIL[tier].plan_price_yearly
    : SUBSCRIPTION_PLAN_EMAIL[tier].plan_price_monthly;
}

export function getPlanFeatures(tier: 'premium' | 'unlimited'): string[] {
  return [...SUBSCRIPTION_PLAN_EMAIL[tier].features];
}

/** Tier order for upgrade detection: free < premium < unlimited */
export const TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  premium: 1,
  unlimited: 2,
};

export function isUpgrade(previousTier: SubscriptionTier, newTier: SubscriptionTier): boolean {
  return TIER_ORDER[newTier] > TIER_ORDER[previousTier];
}
