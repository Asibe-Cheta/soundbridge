import { NextRequest } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const DEFAULT_ADMIN_ROLES = ['admin', 'super_admin', 'moderator'] as const;

export type AdminCheckResult =
  | { ok: true; userId: string; serviceClient: ReturnType<typeof createServiceClient> }
  | { ok: false; status: number; error: string };

/** Narrows failed admin checks (use instead of `if (!r.ok)` — negation often does not narrow). */
export function isAdminAccessDenied(
  r: AdminCheckResult
): r is { ok: false; status: number; error: string } {
  return r.ok === false;
}

export async function requireAdmin(
  request: NextRequest,
  allowedRoles: readonly string[] = DEFAULT_ADMIN_ROLES
): Promise<AdminCheckResult> {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);

  if (authError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const serviceClient = createServiceClient();

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

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
