import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseRouteAuth } from '@/src/lib/api-auth';

// Type-only imports above on purpose: api-auth.ts pulls in @supabase/ssr +
// next/headers, and src/lib/supabase.ts pulls in @supabase/auth-helpers-nextjs
// -- both hang when imported standalone outside a real Next.js server (same
// issue as grace-period-service.ts / tip-room-stats.ts elsewhere in this
// codebase). The real functions are lazily imported below, only when a test
// hasn't injected a replacement, so this module stays importable (and its
// pure logic testable) on its own.
type GetSupabaseRouteClientFn = (request: NextRequest, requireAuth?: boolean) => Promise<SupabaseRouteAuth>;
type CreateServiceClientFn = () => SupabaseClient<any>;

const DEFAULT_ADMIN_ROLES = ['admin', 'super_admin', 'moderator'] as const;

export type AdminCheckResult =
  | { ok: true; userId: string; serviceClient: SupabaseClient<any> }
  | { ok: false; status: number; error: string };

/** Narrows failed admin checks (use instead of `if (!r.ok)` — negation often does not narrow). */
export function isAdminAccessDenied(
  r: AdminCheckResult
): r is { ok: false; status: number; error: string } {
  return r.ok === false;
}

export type RequireAdminDeps = {
  getSupabaseRouteClientFn?: GetSupabaseRouteClientFn;
  createServiceClientFn?: CreateServiceClientFn;
};

export async function requireAdmin(
  request: NextRequest,
  allowedRoles: readonly string[] = DEFAULT_ADMIN_ROLES,
  deps: RequireAdminDeps = {}
): Promise<AdminCheckResult> {
  const resolveRouteClient =
    deps.getSupabaseRouteClientFn ?? (await import('@/src/lib/api-auth')).getSupabaseRouteClient;
  const resolveServiceClient =
    deps.createServiceClientFn ?? (await import('@/src/lib/supabase')).createServiceClient;

  const { user, error: authError } = await resolveRouteClient(request, true);

  if (authError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const serviceClient = resolveServiceClient();

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_admin === true) {
    return { ok: true as const, userId: user.id, serviceClient };
  }

  if (profile?.role && allowedRoles.includes(profile.role)) {
    return { ok: true as const, userId: user.id, serviceClient };
  }

  const { data: userRole } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (userRole?.role && allowedRoles.includes(userRole.role)) {
    return { ok: true as const, userId: user.id, serviceClient };
  }

  return { ok: false as const, status: 403, error: 'Forbidden - Admin access required' };
}
