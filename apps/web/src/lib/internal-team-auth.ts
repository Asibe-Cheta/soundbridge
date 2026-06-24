import { NextRequest } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

export type InternalTeamCheckResult =
  | { ok: true; userId: string; serviceClient: ReturnType<typeof createServiceClient> }
  | { ok: false; status: number; error: string };

export function isInternalTeamAccessDenied(
  r: InternalTeamCheckResult,
): r is { ok: false; status: number; error: string } {
  return r.ok === false;
}

export async function requireInternalTeam(
  request: NextRequest,
): Promise<InternalTeamCheckResult> {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);

  if (authError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('is_internal_team')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_internal_team) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  return { ok: true as const, userId: user.id, serviceClient };
}
