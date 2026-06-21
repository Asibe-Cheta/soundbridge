import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveEffectiveTier, type EffectiveTier } from '@/src/lib/effective-subscription-tier';
import {
  analysesLimitForTier,
  canRunAnalysis,
  canRunChat,
  chatsLimitForTier,
} from '@/src/lib/ai-adviser-limits';
import { ensureCurrentUsageRow, getCurrentBillingPeriod } from '@/src/lib/ai-adviser-credits';

export type AdviserUsageRow = {
  id: string;
  analyses_used: number;
  chats_used: number;
  free_demo_used: boolean;
  billing_period_start: string;
  billing_period_end: string;
};

export async function resolveAdviserTier(
  service: SupabaseClient,
  userId: string,
): Promise<EffectiveTier> {
  const { data: profile } = await service
    .from('profiles')
    .select('subscription_tier, early_adopter, subscription_period_end')
    .eq('id', userId)
    .maybeSingle();

  const { data: sub } = await service
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return resolveEffectiveTier(profile, sub?.tier ?? 'free');
}

export async function getAdviserUsageState(
  service: SupabaseClient,
  creatorId: string,
): Promise<{ tier: EffectiveTier; usage: AdviserUsageRow }> {
  const tier = await resolveAdviserTier(service, creatorId);
  const base = await ensureCurrentUsageRow(service, creatorId);
  const { start, end } = getCurrentBillingPeriod();

  const { data: full } = await service
    .from('ai_adviser_usage')
    .select('id, analyses_used, chats_used, free_demo_used, billing_period_start, billing_period_end')
    .eq('creator_id', creatorId)
    .eq('billing_period_start', start)
    .single();

  const usage: AdviserUsageRow = {
    id: full?.id ?? base.id,
    analyses_used: Number(full?.analyses_used ?? base.analyses_used) || 0,
    chats_used: Number(full?.chats_used) || 0,
    free_demo_used: Boolean(full?.free_demo_used),
    billing_period_start: full?.billing_period_start ?? start,
    billing_period_end: full?.billing_period_end ?? end,
  };

  return { tier, usage };
}

export function buildUsageSummary(tier: EffectiveTier, usage: AdviserUsageRow) {
  const analysesLimit = analysesLimitForTier(tier, usage);
  const chatsLimit = chatsLimitForTier(tier);
  const analysesRemaining = Math.max(0, analysesLimit - usage.analyses_used);
  const chatsRemaining = Math.max(0, chatsLimit - usage.chats_used);

  return {
    tier,
    analysesUsed: usage.analyses_used,
    analysesLimit,
    analysesRemaining,
    chatsUsed: usage.chats_used,
    chatsLimit,
    chatsRemaining,
    freeDemoUsed: usage.free_demo_used,
    billingPeriodStart: usage.billing_period_start,
    billingPeriodEnd: usage.billing_period_end,
    canAnalyse: canRunAnalysis(tier, usage).allowed,
    canChat: canRunChat(tier, usage).allowed,
  };
}

export async function incrementAnalysisUsage(
  service: SupabaseClient,
  creatorId: string,
  tier: EffectiveTier,
): Promise<void> {
  const { usage } = await getAdviserUsageState(service, creatorId);
  const { start } = getCurrentBillingPeriod();

  const patch: Record<string, unknown> = {
    analyses_used: usage.analyses_used + 1,
    updated_at: new Date().toISOString(),
  };
  if (tier === 'free' && !usage.free_demo_used) {
    patch.free_demo_used = true;
  }

  await service
    .from('ai_adviser_usage')
    .update(patch)
    .eq('creator_id', creatorId)
    .eq('billing_period_start', start);
}

export async function incrementChatUsage(
  service: SupabaseClient,
  creatorId: string,
): Promise<void> {
  const { usage } = await getAdviserUsageState(service, creatorId);
  const { start } = getCurrentBillingPeriod();

  await service
    .from('ai_adviser_usage')
    .update({
      chats_used: usage.chats_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('creator_id', creatorId)
    .eq('billing_period_start', start);
}
