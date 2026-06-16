import type { NextRequest } from 'next/server';

function normalizeSecret(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Bearer token from Authorization header (trimmed). */
export function bearerTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return normalizeSecret(authHeader.slice('Bearer '.length));
}

/**
 * Cron / GitHub Actions auth: CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY on the server.
 * Values are trimmed so copy-paste whitespace in Vercel/GitHub does not cause 401s.
 */
export function isCronOrServiceRoleAuthorized(request: NextRequest): boolean {
  const token = bearerTokenFromRequest(request);
  if (!token) return false;

  const allowed = [
    normalizeSecret(process.env.CRON_SECRET),
    normalizeSecret(process.env.SUPABASE_SERVICE_ROLE_KEY),
  ].filter((s): s is string => Boolean(s));

  return allowed.some((secret) => secret === token);
}
