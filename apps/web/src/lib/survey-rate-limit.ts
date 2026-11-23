import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * One-way hash, never the raw IP. "Do not store IP addresses" means exactly
 * that -- this is a rate-limit key, not an identity, and the salt makes it
 * non-reversible even if the table leaked.
 */
export function hashIp(ip: string): string {
  const salt = process.env.SURVEY_IP_HASH_SALT || 'soundbridge-survey-default-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export type RateLimitResult = { allowed: true } | { allowed: false; reason: 'ip' | 'anon_id' };

const DEFAULT_IP_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_IP_MAX = 60;
const DEFAULT_ANON_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_ANON_MAX = 30;

/**
 * A legitimate respondent saves on every answer (up to ~9 requests for a
 * 7-question survey with Q4/Q7 variants), so limits are generous per-anon_id
 * and tighter per-IP (catches many anon_ids hammered from one source).
 * Records the hit only when allowed, so a blocked burst doesn't itself
 * consume more of the window.
 */
export async function checkSurveyRateLimit(
  supabase: SupabaseClient,
  params: { ipHash: string; anonId: string },
  limits: {
    ipWindowMs?: number;
    ipMax?: number;
    anonWindowMs?: number;
    anonMax?: number;
  } = {},
): Promise<RateLimitResult> {
  const ipWindowMs = limits.ipWindowMs ?? DEFAULT_IP_WINDOW_MS;
  const ipMax = limits.ipMax ?? DEFAULT_IP_MAX;
  const anonWindowMs = limits.anonWindowMs ?? DEFAULT_ANON_WINDOW_MS;
  const anonMax = limits.anonMax ?? DEFAULT_ANON_MAX;

  const ipSince = new Date(Date.now() - ipWindowMs).toISOString();
  const { count: ipCount, error: ipErr } = await supabase
    .from('survey_rate_limit_hits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', params.ipHash)
    .gte('created_at', ipSince);
  if (ipErr) {
    console.error('[survey-rate-limit] ip check failed:', ipErr.message);
  } else if ((ipCount ?? 0) >= ipMax) {
    return { allowed: false, reason: 'ip' };
  }

  const anonSince = new Date(Date.now() - anonWindowMs).toISOString();
  const { count: anonCount, error: anonErr } = await supabase
    .from('survey_rate_limit_hits')
    .select('*', { count: 'exact', head: true })
    .eq('anon_id', params.anonId)
    .gte('created_at', anonSince);
  if (anonErr) {
    console.error('[survey-rate-limit] anon_id check failed:', anonErr.message);
  } else if ((anonCount ?? 0) >= anonMax) {
    return { allowed: false, reason: 'anon_id' };
  }

  const { error: insertErr } = await supabase
    .from('survey_rate_limit_hits')
    .insert({ ip_hash: params.ipHash, anon_id: params.anonId });
  if (insertErr) {
    console.error('[survey-rate-limit] failed to record hit:', insertErr.message);
  }

  return { allowed: true };
}
