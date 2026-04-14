import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isEarlyAdopterPremiumGrant,
  resolveEffectiveTier,
  type EffectiveTier,
  type ProfileTierInput,
} from '@/src/lib/effective-subscription-tier';
import { createServiceClient } from '@/src/lib/supabase';

export const PREMIUM_UPLOADS_PER_MONTH = 7;
export const FREE_LIFETIME_UPLOADS = 3;

export type CheckUploadLimitRow = {
  can_upload: boolean;
  uploads_used: number;
  uploads_limit: number;
  limit_type: string;
  reset_date: string | null;
};

/** Supabase may return TABLE rows as an array or a single object depending on PostgREST version. */
export function parseCheckUploadLimitResult(data: unknown): CheckUploadLimitRow | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  if (typeof r.can_upload !== 'boolean') return null;
  return {
    can_upload: r.can_upload,
    uploads_used: Number(r.uploads_used ?? 0),
    uploads_limit: Number(r.uploads_limit ?? 0),
    limit_type: String(r.limit_type ?? ''),
    reset_date: (r.reset_date as string | null) ?? null,
  };
}

export async function fetchProfileAndActiveSubscriptionTier(
  _supabase: SupabaseClient,
  userId: string,
): Promise<{ profile: ProfileTierInput | null; subscriptionTier: string | null }> {
  const service = createServiceClient();
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    service
      .from('profiles')
      .select('early_adopter, subscription_tier, subscription_period_end')
      .eq('id', userId)
      .maybeSingle(),
    service
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    profile: profile as ProfileTierInput | null,
    subscriptionTier: (subscription?.tier as string | null | undefined) ?? null,
  };
}

async function countTracksThisUtcMonth(supabase: SupabaseClient, userId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('audio_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .is('deleted_at', null)
    .gte('created_at', monthStart.toISOString());

  if (error) {
    console.warn('[upload-entitlement] countTracksThisUtcMonth:', error.message);
    return PREMIUM_UPLOADS_PER_MONTH;
  }
  return count ?? 0;
}

async function countTracksLifetime(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('audio_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .is('deleted_at', null);

  if (error) {
    console.warn('[upload-entitlement] countTracksLifetime:', error.message);
    return FREE_LIFETIME_UPLOADS;
  }
  return count ?? 0;
}

/**
 * Single gate for “may this user upload?” that honours early-adopter / profile premium grants
 * even when legacy RPCs still read only user_subscriptions.
 */
export async function canUserUploadNow(supabase: SupabaseClient, userId: string): Promise<{
  allowed: boolean;
  effectiveTier: EffectiveTier;
  limitRow: CheckUploadLimitRow | null;
}> {
  const { profile, subscriptionTier } = await fetchProfileAndActiveSubscriptionTier(
    supabase,
    userId,
  );
  const effectiveTier = resolveEffectiveTier(profile, subscriptionTier || 'free');

  const { data: rpcData, error: rpcError } = await supabase.rpc('check_upload_limit', {
    p_user_id: userId,
  });
  const limitRow = rpcError ? null : parseCheckUploadLimitResult(rpcData);

  if (profile && isEarlyAdopterPremiumGrant(profile)) {
    return {
      allowed: true,
      effectiveTier,
      limitRow: {
        can_upload: true,
        uploads_used: limitRow?.uploads_used ?? 0,
        uploads_limit: -1,
        limit_type: effectiveTier === 'unlimited' ? 'unlimited' : 'early_adopter_grant',
        reset_date: limitRow?.reset_date ?? null,
      },
    };
  }

  if (effectiveTier === 'unlimited') {
    return {
      allowed: true,
      effectiveTier,
      limitRow:
        limitRow ??
        ({
          can_upload: true,
          uploads_used: 0,
          uploads_limit: -1,
          limit_type: 'unlimited',
          reset_date: null,
        } as CheckUploadLimitRow),
    };
  }

  if (effectiveTier === 'premium') {
    if (limitRow?.can_upload) {
      return { allowed: true, effectiveTier, limitRow };
    }
    const used = await countTracksThisUtcMonth(supabase, userId);
    const allowed = used < PREMIUM_UPLOADS_PER_MONTH;
    return {
      allowed,
      effectiveTier,
      limitRow: {
        can_upload: allowed,
        uploads_used: used,
        uploads_limit: PREMIUM_UPLOADS_PER_MONTH,
        limit_type: 'monthly',
        reset_date: limitRow?.reset_date ?? null,
      },
    };
  }

  if (limitRow?.can_upload) {
    return { allowed: true, effectiveTier, limitRow };
  }

  const usedLife = await countTracksLifetime(supabase, userId);
  const allowedFree = usedLife < FREE_LIFETIME_UPLOADS;
  return {
    allowed: allowedFree,
    effectiveTier,
    limitRow: {
      can_upload: allowedFree,
      uploads_used: usedLife,
      uploads_limit: FREE_LIFETIME_UPLOADS,
      limit_type: 'lifetime',
      reset_date: null,
    },
  };
}

/** Map to legacy upload-validation tier names still used in some validators. */
export function effectiveTierToValidationTier(tier: EffectiveTier): 'free' | 'pro' {
  return tier === 'free' ? 'free' : 'pro';
}
