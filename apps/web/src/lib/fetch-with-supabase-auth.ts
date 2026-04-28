import { createClient } from '@/src/lib/supabase-browser';

/**
 * Same-origin fetch with session cookie + Authorization Bearer when available.
 * Fixes 401s when API routes read @supabase/ssr cookies but the session is only in memory,
 * and ensures credentials are sent consistently.
 */
const SESSION_READ_TIMEOUT_MS = 2500;

async function getSessionWithTimeout(supabase: ReturnType<typeof createClient>) {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), SESSION_READ_TIMEOUT_MS)
      ),
    ]);

    if (!result || !('data' in result)) {
      return null;
    }
    return result.data?.session ?? null;
  } catch {
    return null;
  }
}

export async function fetchWithSupabaseAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const supabase = createClient();
  const session = await getSessionWithTimeout(supabase);
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
