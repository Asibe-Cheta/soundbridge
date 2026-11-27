import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Salted hash, never the raw IP -- same reasoning as survey/agreement rate limits. */
export function hashTipRoomLocalRateIp(ip: string): string {
  const salt =
    process.env.TIP_ROOM_LOCAL_RATE_IP_HASH_SALT ||
    process.env.SURVEY_IP_HASH_SALT ||
    'soundbridge-tip-room-local-rate-default-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export type TipRoomLocalRateLimitResult = { allowed: true } | { allowed: false };

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX = 20;

/**
 * Low-stakes endpoint (read-only, cached daily rate, no PII) -- a generous
 * per-minute cap is enough to stop scripted hammering without affecting a
 * real visitor loading the page normally.
 */
export async function checkTipRoomLocalRateLimit(
  supabase: SupabaseClient,
  ipHash: string,
  limits: { windowMs?: number; max?: number } = {},
): Promise<TipRoomLocalRateLimitResult> {
  const windowMs = limits.windowMs ?? DEFAULT_WINDOW_MS;
  const max = limits.max ?? DEFAULT_MAX;

  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from('tip_room_local_rate_hits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  if (error) {
    console.error('[tip-room-local-rate-limit] check failed:', error.message);
  } else if ((count ?? 0) >= max) {
    return { allowed: false };
  }

  const { error: insertErr } = await supabase.from('tip_room_local_rate_hits').insert({ ip_hash: ipHash });
  if (insertErr) {
    console.error('[tip-room-local-rate-limit] failed to record hit:', insertErr.message);
  }

  return { allowed: true };
}
