import type { EffectiveTier } from '@/src/lib/effective-subscription-tier';

export type AdviserTier = EffectiveTier;

export const ADVISER_LIMITS = {
  free: { analysesPerPeriod: 0, chatsPerPeriod: 0, lifetimeDemoAnalyses: 1 },
  premium: { analysesPerPeriod: 10, chatsPerPeriod: 5, lifetimeDemoAnalyses: 0 },
  unlimited: { analysesPerPeriod: 20, chatsPerPeriod: 15, lifetimeDemoAnalyses: 0 },
} as const;

export function getAdviserLimits(tier: AdviserTier) {
  return ADVISER_LIMITS[tier];
}

export function analysesLimitForTier(
  tier: AdviserTier,
  usage: { analyses_used: number; free_demo_used: boolean },
): number {
  if (tier === 'free') {
    return usage.free_demo_used ? 0 : ADVISER_LIMITS.free.lifetimeDemoAnalyses;
  }
  return getAdviserLimits(tier).analysesPerPeriod;
}

export function chatsLimitForTier(tier: AdviserTier): number {
  if (tier === 'free') return 0;
  return getAdviserLimits(tier).chatsPerPeriod;
}

export function canRunAnalysis(
  tier: AdviserTier,
  usage: { analyses_used: number; chats_used: number; free_demo_used: boolean },
): { allowed: boolean; reason?: string } {
  if (tier === 'free') {
    if (usage.free_demo_used) {
      return {
        allowed: false,
        reason:
          'You have used your free analysis. Upgrade to Premium or Unlimited for ongoing access.',
      };
    }
    return { allowed: true };
  }

  const limit = analysesLimitForTier(tier, usage);
  if (usage.analyses_used >= limit) {
    return {
      allowed: false,
      reason: 'You have used all analyses for this billing period. Buy 5 more for £1.99 or wait until next month.',
    };
  }
  return { allowed: true };
}

export function canRunChat(
  tier: AdviserTier,
  usage: { analyses_used: number; chats_used: number; free_demo_used: boolean },
): { allowed: boolean; reason?: string } {
  if (tier === 'free') {
    return { allowed: false, reason: 'Chat is available on Premium and Unlimited plans.' };
  }
  const limit = chatsLimitForTier(tier);
  if (usage.chats_used >= limit) {
    return {
      allowed: false,
      reason: 'You have used all chats for this billing period.',
    };
  }
  return { allowed: true };
}
