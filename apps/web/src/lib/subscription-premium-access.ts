import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Premium / Unlimited access for product gating (Persona, Verified Professional banner, etc.).
 * Aligns with /api/subscription/status: profiles row first (promotional / manual grants), then user_subscriptions.
 */

function tierGrantsPremiumAccess(tier: string | null | undefined): boolean {
  if (!tier) return false;
  const t = String(tier).toLowerCase();
  return t === 'premium' || t === 'unlimited' || t === 'pro' || t === 'enterprise';
}

function profileSubscriptionLooksActive(status: string | null | undefined): boolean {
  if (status == null || status === '') return true;
  const s = String(status).toLowerCase();
  return s === 'active' || s === 'trialing';
}

function isPastSubscriptionEnd(profile: {
  subscription_period_end?: string | null;
  subscription_renewal_date?: string | null;
}): boolean {
  const end = profile.subscription_period_end || profile.subscription_renewal_date;
  if (!end || typeof end !== 'string') return false;
  const ms = Date.parse(end);
  return !Number.isNaN(ms) && ms < Date.now();
}

type ProfileSubRow = {
  subscription_tier?: string | null;
  subscription_status?: string | null;
  subscription_period_end?: string | null;
  subscription_renewal_date?: string | null;
};

/**
 * Returns true if the user should be treated as having Premium or Unlimited (including legacy pro/enterprise on user_subscriptions).
 */
export async function userHasActivePremiumAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, subscription_period_end, subscription_renewal_date')
    .eq('id', userId)
    .maybeSingle();

  const profile = profileData as ProfileSubRow | null;

  if (profile && typeof profile.subscription_tier === 'string' && profile.subscription_tier.length > 0) {
    if (
      tierGrantsPremiumAccess(profile.subscription_tier) &&
      profileSubscriptionLooksActive(profile.subscription_status) &&
      !isPastSubscriptionEnd(profile)
    ) {
      return true;
    }
  }

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = sub as { tier?: string | null } | null;
  if (row?.tier && tierGrantsPremiumAccess(row.tier)) {
    return true;
  }

  return false;
}
