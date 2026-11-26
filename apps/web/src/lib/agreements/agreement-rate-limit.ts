import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Salted hash, never the raw IP -- same reasoning as survey-rate-limit.ts. */
export function hashAgreementIp(ip: string): string {
  const salt = process.env.AGREEMENT_IP_HASH_SALT || process.env.SURVEY_IP_HASH_SALT || 'soundbridge-agreement-default-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export type AgreementRateLimitResult = { allowed: true } | { allowed: false };

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX = 20;

/** Covers both the page view and the sign attempt -- same ledger, same IP key. */
export async function checkAgreementRateLimit(
  supabase: SupabaseClient,
  ipHash: string,
  limits: { windowMs?: number; max?: number } = {},
): Promise<AgreementRateLimitResult> {
  const windowMs = limits.windowMs ?? DEFAULT_WINDOW_MS;
  const max = limits.max ?? DEFAULT_MAX;

  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from('agreement_rate_limit_hits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  if (error) {
    console.error('[agreement-rate-limit] check failed:', error.message);
  } else if ((count ?? 0) >= max) {
    return { allowed: false };
  }

  const { error: insertErr } = await supabase.from('agreement_rate_limit_hits').insert({ ip_hash: ipHash });
  if (insertErr) {
    console.error('[agreement-rate-limit] failed to record hit:', insertErr.message);
  }

  return { allowed: true };
}
