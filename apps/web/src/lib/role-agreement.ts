import { createHash } from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/src/lib/supabase';

export function hashAgreementText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retry_after_seconds: number; message: string };

/** Max 5 sign attempts per IP per hour. Same policy as the podcast-host agreement. */
export async function checkRoleAgreementRateLimit(
  supabase: SupabaseClient,
  ip: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('role_agreement_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', since);

  if (error) {
    console.error('[role-agreement] rate limit check:', error.message);
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

export async function logRoleAgreementAttempt(supabase: SupabaseClient, ip: string): Promise<void> {
  const { error } = await supabase.from('role_agreement_attempts').insert({ ip_address: ip });
  if (error) {
    console.error('[role-agreement] failed to log attempt:', error.message);
  }
}

/**
 * Read-only admin check for use in a Server Component (e.g. the agreement
 * page itself). Deliberately omits cookie set/remove — Next.js forbids
 * writing cookies outside a Server Action or Route Handler, which is exactly
 * the bug that previously broke /join (see 45b7bdf9). We only ever need to
 * read the existing session here, never refresh it, so a no-op writer is
 * correct, not a shortcut.
 */
export async function getCurrentUserIsAdmin(): Promise<{ isAdmin: boolean; adminName: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { isAdmin: false, adminName: null };
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          /* read-only: never write cookies from a Server Component */
        },
        remove() {
          /* read-only: never write cookies from a Server Component */
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return { isAdmin: false, adminName: null };
    }

    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_admin, role, display_name, username')
      .eq('id', data.user.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin === true || profile?.role === 'admin' || profile?.role === 'super_admin';
    if (!isAdmin) {
      return { isAdmin: false, adminName: null };
    }

    return { isAdmin: true, adminName: profile?.display_name || profile?.username || 'SoundBridge Admin' };
  } catch (error) {
    console.error('[role-agreement] admin check failed:', error);
    return { isAdmin: false, adminName: null };
  }
}
