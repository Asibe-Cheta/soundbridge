import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export function hashAgreementText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retry_after_seconds: number; message: string };

/** Max 5 sign attempts per IP per hour. */
export async function checkPodcastHostAgreementRateLimit(
  supabase: SupabaseClient,
  ip: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('podcast_host_agreement_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', since);

  if (error) {
    console.error('[podcast-host-agreement] rate limit check:', error.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= 5) {
    return {
      allowed: false,
      retry_after_seconds: 3600,
      message: 'Too many attempts. Please try again in an hour.',
    };
  }
  return { allowed: true };
}

export async function logPodcastHostAgreementAttempt(
  supabase: SupabaseClient,
  ip: string,
): Promise<void> {
  const { error } = await supabase.from('podcast_host_agreement_attempts').insert({ ip_address: ip });
  if (error) {
    console.error('[podcast-host-agreement] failed to log attempt:', error.message);
  }
}
