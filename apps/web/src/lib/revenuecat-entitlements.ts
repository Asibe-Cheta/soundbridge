/**
 * RevenueCat REST API v2 — active paid entitlements (new secret keys are incompatible with v1).
 * Used by webhooks to avoid forcing profiles.subscription_tier to free while promotional/store access remains.
 *
 * Env: REVENUECAT_SECRET_API_KEY (needs customer_information:customers:read)
 * Optional: REVENUECAT_PROJECT_ID, REVENUECAT_PAID_ENTITLEMENT_LOOKUP_KEYS (comma-separated lookup_keys)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const RC_V2 = 'https://api.revenuecat.com/v2';

function getRevenueCatSecretKey(): string | null {
  const k =
    process.env.REVENUECAT_SECRET_API_KEY?.trim() ||
    process.env.REVENUECAT_API_SECRET_KEY?.trim() ||
    process.env.RC_SECRET_KEY?.trim();
  return k || null;
}

const DEFAULT_PAID_LOOKUP_KEYS = [
  'premium_features',
  'premium',
  'unlimited_features',
  'unlimited',
  'pro',
];

let cachedProjectId: string | undefined;
let cachedPaidEntitlementIds: Set<string> | undefined;

function paidLookupKeysFromEnv(): string[] {
  const raw = process.env.REVENUECAT_PAID_ENTITLEMENT_LOOKUP_KEYS?.trim();
  if (!raw) return DEFAULT_PAID_LOOKUP_KEYS;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function rcV2Get(secret: string, path: string): Promise<Response> {
  return fetch(`${RC_V2}${path}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  });
}

async function resolveProjectId(secret: string): Promise<string | null> {
  const envId = process.env.REVENUECAT_PROJECT_ID?.trim();
  if (envId) return envId;
  if (cachedProjectId) return cachedProjectId;
  const res = await rcV2Get(secret, '/projects');
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: { id: string }[] };
  const id = data.items?.[0]?.id;
  if (id) cachedProjectId = id;
  return id ?? null;
}

async function resolvePaidEntitlementIds(secret: string, projectId: string): Promise<Set<string> | null> {
  if (cachedPaidEntitlementIds) return cachedPaidEntitlementIds;
  const res = await rcV2Get(secret, `/projects/${encodeURIComponent(projectId)}/entitlements?limit=50`);
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: { id: string; lookup_key: string }[] };
  const wanted = new Set(paidLookupKeysFromEnv());
  const ids = new Set<string>();
  for (const e of data.items ?? []) {
    if (wanted.has(e.lookup_key)) ids.add(e.id);
  }
  cachedPaidEntitlementIds = ids;
  return ids;
}

function activeItemStillValid(expiresAt: number | null | undefined): boolean {
  if (expiresAt == null) return true;
  return Number(expiresAt) > Date.now();
}

/**
 * @returns true = paid entitlement still active in RC, false = determined none, null = could not call API
 */
export async function revenueCatSubscriberHasActivePremiumOrUnlimited(
  appUserId: string
): Promise<boolean | null> {
  const secret = getRevenueCatSecretKey();
  if (!secret) return null;

  const projectId = await resolveProjectId(secret);
  if (!projectId) {
    console.warn('[revenuecat-entitlements] Could not resolve project id');
    return null;
  }

  const paidIds = await resolvePaidEntitlementIds(secret, projectId);
  if (!paidIds || paidIds.size === 0) {
    console.warn('[revenuecat-entitlements] No paid entitlement ids resolved for lookup keys');
    return null;
  }

  const url = `/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(
    appUserId
  )}/active_entitlements?limit=20`;
  try {
    const res = await rcV2Get(secret, url);
    if (res.status === 404) return false;
    if (!res.ok) {
      console.warn('[revenuecat-entitlements] active_entitlements failed:', res.status, appUserId);
      return null;
    }
    const data = (await res.json()) as {
      items?: { entitlement_id?: string; expires_at?: number | null }[];
    };
    for (const item of data.items ?? []) {
      const eid = item.entitlement_id;
      if (!eid || !paidIds.has(eid)) continue;
      if (activeItemStillValid(item.expires_at)) return true;
    }
    return false;
  } catch (e) {
    console.warn('[revenuecat-entitlements] active_entitlements error:', appUserId, e);
    return null;
  }
}

function normalizeTier(value: string | null | undefined): 'free' | 'premium' | 'unlimited' {
  const s = String(value || 'free').toLowerCase();
  if (s === 'unlimited') return 'unlimited';
  if (s === 'premium') return 'premium';
  return 'free';
}

export async function shouldSkipRevenueCatDowngradeToFree(
  supabase: SupabaseClient,
  appUserId: string
): Promise<boolean> {
  const rc = await revenueCatSubscriberHasActivePremiumOrUnlimited(appUserId);
  if (rc === true) return true;
  if (rc === false) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, subscription_period_end, subscription_renewal_date')
    .eq('id', appUserId)
    .maybeSingle();

  if (!profile) return false;

  const tier = normalizeTier(profile.subscription_tier as string);
  if (tier !== 'premium' && tier !== 'unlimited') return false;

  const status = String(profile.subscription_status || '').toLowerCase();
  if (status !== 'active') return false;

  const endRaw = profile.subscription_period_end ?? profile.subscription_renewal_date;
  if (!endRaw) return false;

  return new Date(String(endRaw)).getTime() > Date.now();
}
