import { NextRequest } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export const GLOBALREADY_ALLOWED_EMAILS = [
  'asibechetachukwu@gmail.com',
  'johnbimi82@gmail.com',
] as const;

export function isGlobalReadyAllowedEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? '').toLowerCase().trim();
  return GLOBALREADY_ALLOWED_EMAILS.includes(
    normalized as (typeof GLOBALREADY_ALLOWED_EMAILS)[number],
  );
}

export type GlobalReadyAccessResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: number; error: string };

export function isGlobalReadyAccessDenied(
  r: GlobalReadyAccessResult,
): r is { ok: false; status: number; error: string } {
  return r.ok === false;
}

export async function requireGlobalReadyAccess(
  request: NextRequest,
): Promise<GlobalReadyAccessResult> {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Sign in required' };
  }

  const email = user.email?.toLowerCase().trim() ?? '';
  if (!isGlobalReadyAllowedEmail(email)) {
    return { ok: false, status: 403, error: 'This page is restricted to authorised Global Ready clients' };
  }

  return { ok: true, userId: user.id, email };
}

export function getGlobalReadyPriceId(): string | null {
  const priceId = process.env.GLOBALREADY_PRICE_ID?.trim();
  return priceId && priceId.startsWith('price_') ? priceId : null;
}
