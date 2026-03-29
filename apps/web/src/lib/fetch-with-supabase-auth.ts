import { createClient } from '@/src/lib/supabase-browser';

/**
 * Same-origin fetch with session cookie + Authorization Bearer when available.
 * Fixes 401s when API routes read @supabase/ssr cookies but the session is only in memory,
 * and ensures credentials are sent consistently.
 */
export async function fetchWithSupabaseAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}
