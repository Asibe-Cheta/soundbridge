import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isEarlyAdopterPremiumGrant,
  resolveEffectiveTier,
  type EffectiveTier,
  type ProfileTierInput,
} from '@/src/lib/effective-subscription-tier';
import { createServiceClient } from '@/src/lib/supabase';

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

  // No tier has a hard upload-count cap — storage (250MB Free / 2GB Premium /
  // 10GB Unlimited) is the only real limit, enforced separately via the
  // check_storage_limit RPC in the upload route itself. A prior version of
  // this gate hard-capped Free at 3 lifetime uploads and Premium at 7/month;
  // both were leftover from an older count-based system (confirmed via the
  // mobile team's git-blame on their equivalent bug: Premium's old cap had
  // an explicit removal marker when the system went storage-only, Free's
  // did not — nothing indicated it was meant to survive that migration) and
  // contradicted the "storage is the only limit" tier copy shown everywhere.
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

/** Map to legacy upload-validation tier names still used in some validators. */
export function effectiveTierToValidationTier(tier: EffectiveTier): 'free' | 'pro' {
  return tier === 'free' ? 'free' : 'pro';
}
