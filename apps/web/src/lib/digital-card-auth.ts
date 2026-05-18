import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  fetchProfileAndActiveSubscriptionTier,
  type ProfileTierInput,
} from '@/src/lib/upload-entitlement';
import { resolveEffectiveTier, type EffectiveTier } from '@/src/lib/effective-subscription-tier';
import { createServiceClient } from '@/src/lib/supabase';

export const RECOVERY_EVIDENCE_BUCKET = 'recovery-evidence';
export const RECOVERY_SESSION_TTL_MS = 15 * 60 * 1000;

/** Monthly card generation limits per effective subscription tier (-1 = unlimited). */
export const CARD_MONTHLY_LIMITS: Record<EffectiveTier, number> = {
  free: 1,
  premium: 5,
  unlimited: -1,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isValidSha256Hex(value: string): boolean {
  return SHA256_HEX_RE.test(value);
}

export function getCardSecretKey(): string | null {
  const key = process.env.CARD_SECRET_KEY?.trim();
  return key && key.length >= 16 ? key : null;
}

export function hashRecoverySessionToken(token: string): string {
  return createHmac('sha256', getCardSecretKey() || 'recovery-session-fallback')
    .update(token)
    .digest('hex');
}

export function generateOpaqueSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function startOfUtcMonth(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function nextUtcMonthStart(d = new Date()): string {
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return next.toISOString();
}

export async function resolveCreatorTier(userId: string): Promise<EffectiveTier> {
  const { profile, subscriptionTier } = await fetchProfileAndActiveSubscriptionTier(
    createServiceClient(),
    userId,
  );
  return resolveEffectiveTier(profile as ProfileTierInput | null, subscriptionTier);
}

export function getMonthlyLimit(tier: EffectiveTier): number {
  return CARD_MONTHLY_LIMITS[tier];
}

export type GenerationUsage = {
  tier: EffectiveTier;
  generations_used_this_month: number;
  generations_remaining_this_month: number;
  generations_lifetime: number;
  monthly_limit: number;
  resets_at: string;
  can_generate: boolean;
};

export async function getGenerationUsage(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<GenerationUsage> {
  const tier = await resolveCreatorTier(creatorId);
  const monthlyLimit = getMonthlyLimit(tier);
  const monthStart = startOfUtcMonth();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'card_generations_this_month, card_generations_lifetime, card_generation_month, created_at',
    )
    .eq('id', creatorId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(error?.message || 'Profile not found');
  }

  let usedThisMonth = profile.card_generations_this_month ?? 0;
  const lifetime = profile.card_generations_lifetime ?? 0;
  const storedMonth = profile.card_generation_month
    ? String(profile.card_generation_month).slice(0, 10)
    : null;

  if (storedMonth !== monthStart) {
    usedThisMonth = 0;
  }

  const unlimited = monthlyLimit < 0;
  const remaining = unlimited ? 999999 : Math.max(0, monthlyLimit - usedThisMonth);

  return {
    tier,
    generations_used_this_month: usedThisMonth,
    generations_remaining_this_month: remaining,
    generations_lifetime: lifetime,
    monthly_limit: unlimited ? -1 : monthlyLimit,
    resets_at: nextUtcMonthStart(),
    can_generate: unlimited || usedThisMonth < monthlyLimit,
  };
}

/** Inline UTC month reset + increment (single creator, called inside generate-token transaction flow). */
export async function resetMonthIfNeeded(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<void> {
  const monthStart = startOfUtcMonth();
  const { data: profile } = await supabase
    .from('profiles')
    .select('card_generation_month')
    .eq('id', creatorId)
    .maybeSingle();

  const storedMonth = profile?.card_generation_month
    ? String(profile.card_generation_month).slice(0, 10)
    : null;

  if (storedMonth !== monthStart) {
    await supabase
      .from('profiles')
      .update({
        card_generations_this_month: 0,
        card_generation_month: monthStart,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creatorId);
  }
}

export async function incrementGenerationCounters(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<void> {
  const monthStart = startOfUtcMonth();
  await resetMonthIfNeeded(supabase, creatorId);

  const { data: profile } = await supabase
    .from('profiles')
    .select('card_generations_this_month, card_generations_lifetime')
    .eq('id', creatorId)
    .maybeSingle();

  const used = (profile?.card_generations_this_month ?? 0) + 1;
  const lifetime = (profile?.card_generations_lifetime ?? 0) + 1;

  await supabase
    .from('profiles')
    .update({
      card_generations_this_month: used,
      card_generations_lifetime: lifetime,
      card_generation_month: monthStart,
      updated_at: new Date().toISOString(),
    })
    .eq('id', creatorId);
}

export function buildCardAuthToken(params: {
  creatorId: string;
  accountCreatedAt: string;
  cardGeneratedAt: string;
  salt: string;
}): string {
  const secret = getCardSecretKey();
  if (!secret) {
    throw new Error('CARD_SECRET_KEY is not configured');
  }
  const payload = [
    params.creatorId,
    params.accountCreatedAt,
    params.cardGeneratedAt,
    params.salt,
  ].join('|');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!isValidSha256Hex(a) || !isValidSha256Hex(b)) return false;
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function isPersonaVerified(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const [{ data: sp }, { data: profile }] = await Promise.all([
    supabase
      .from('service_provider_profiles')
      .select('verification_status, is_verified')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('profiles').select('is_verified').eq('id', userId).maybeSingle(),
  ]);

  if (sp?.verification_status === 'approved' && sp.is_verified) return true;
  return Boolean(profile?.is_verified);
}

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retry_after_seconds: number; message: string };

/** Max 3 failed attempts per IP per hour. */
export async function checkIpRecoveryRateLimit(
  supabase: SupabaseClient,
  ip: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('recovery_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('outcome', 'failed')
    .gte('created_at', since);

  if (error) {
    console.error('[digital-card] ip rate limit check:', error.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= 3) {
    return {
      allowed: false,
      retry_after_seconds: 3600,
      message: 'Too many recovery attempts. Please try again in 60 minutes.',
    };
  }
  return { allowed: true };
}

/** Max 5 failed attempts per creator per 24 hours. */
export async function checkCreatorRecoveryRateLimit(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('recovery_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .eq('outcome', 'failed')
    .gte('created_at', since);

  if (error) {
    console.error('[digital-card] creator rate limit check:', error.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= 5) {
    return {
      allowed: false,
      retry_after_seconds: 86400,
      message: 'Too many recovery attempts for this account. Please try again later.',
    };
  }
  return { allowed: true };
}

export async function logRecoveryAttempt(
  supabase: SupabaseClient,
  row: {
    creator_id: string | null;
    ip_address: string;
    outcome: 'success' | 'failed' | 'rate_limited' | 'pending_manual';
    recovery_session_id?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from('recovery_attempts').insert({
    creator_id: row.creator_id,
    ip_address: row.ip_address,
    outcome: row.outcome,
    recovery_session_id: row.recovery_session_id ?? null,
    metadata: row.metadata ?? {},
  });
}

export async function invalidateActiveTokens(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('card_auth_tokens')
    .update({ is_active: false, invalidated_at: now })
    .eq('creator_id', creatorId)
    .eq('is_active', true);
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'application/pdf':
      return 'pdf';
    case 'video/mp4':
      return 'mp4';
    case 'video/quicktime':
      return 'mov';
    default:
      return 'bin';
  }
}
