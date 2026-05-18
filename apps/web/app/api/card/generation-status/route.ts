import { NextRequest } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { digitalCardCorsHeaders, jsonResponse } from '@/src/lib/digital-card-cors';
import { getGenerationUsage } from '@/src/lib/digital-card-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: digitalCardCorsHeaders });
}

/** GET /api/card/generation-status — tier usage for Generate Card button */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const service = createServiceClient();
    const usage = await getGenerationUsage(service, user.id);

    return jsonResponse({
      tier: usage.tier,
      generations_used_this_month: usage.generations_used_this_month,
      generations_remaining_this_month: usage.generations_remaining_this_month,
      generations_lifetime: usage.generations_lifetime,
      monthly_limit: usage.monthly_limit,
      resets_at: usage.resets_at,
      can_generate: usage.can_generate,
    });
  } catch (error: unknown) {
    console.error('[card/generation-status]', error);
    return jsonResponse(
      { error: 'internal_error', message: error instanceof Error ? error.message : 'Server error' },
      500,
    );
  }
}
