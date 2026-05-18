import { NextRequest } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { digitalCardCorsHeaders, jsonResponse } from '@/src/lib/digital-card-cors';
import {
  buildCardAuthToken,
  getCardSecretKey,
  getGenerationUsage,
  incrementGenerationCounters,
  invalidateActiveTokens,
  isValidUuid,
} from '@/src/lib/digital-card-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: digitalCardCorsHeaders });
}

/** POST /api/card/generate-token */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    if (!getCardSecretKey()) {
      return jsonResponse(
        { error: 'not_configured', message: 'Card authentication is not configured.' },
        503,
      );
    }

    let body: { creator_id?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (body.creator_id && body.creator_id !== user.id) {
      return jsonResponse({ error: 'forbidden', message: 'creator_id must match authenticated user' }, 403);
    }

    if (body.creator_id && !isValidUuid(body.creator_id)) {
      return jsonResponse({ error: 'invalid_request', message: 'creator_id is required' }, 400);
    }

    const creatorId = user.id;
    const service = createServiceClient();
    const usage = await getGenerationUsage(service, creatorId);

    if (!usage.can_generate) {
      return jsonResponse(
        {
          error: 'generation_limit_reached',
          message: 'You have used all your card generations for this period.',
          tier: usage.tier,
          limit: usage.monthly_limit,
          used: usage.generations_used_this_month,
          resets_at: usage.resets_at,
        },
        403,
      );
    }

    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('created_at')
      .eq('id', creatorId)
      .maybeSingle();

    if (profileError || !profile?.created_at) {
      return jsonResponse({ error: 'invalid_request', message: 'Creator profile not found' }, 400);
    }

    await invalidateActiveTokens(service, creatorId);

    const generatedAt = new Date().toISOString();
    const salt = crypto.randomUUID();
    const token = buildCardAuthToken({
      creatorId,
      accountCreatedAt: profile.created_at,
      cardGeneratedAt: generatedAt,
      salt,
    });

    const { error: insertError } = await service.from('card_auth_tokens').insert({
      creator_id: creatorId,
      card_auth_token: token,
      token_salt: salt,
      is_active: true,
      generated_at: generatedAt,
    });

    if (insertError) {
      console.error('[card/generate-token] insert:', insertError);
      return jsonResponse({ error: 'internal_error', message: 'Failed to create card token' }, 500);
    }

    await incrementGenerationCounters(service, creatorId);
    const updatedUsage = await getGenerationUsage(service, creatorId);

    return jsonResponse({
      token,
      generated_at: generatedAt,
      generations_used_this_month: updatedUsage.generations_used_this_month,
      generations_remaining_this_month: updatedUsage.generations_remaining_this_month,
      generations_lifetime: updatedUsage.generations_lifetime,
    });
  } catch (error: unknown) {
    console.error('[card/generate-token]', error);
    return jsonResponse(
      { error: 'internal_error', message: error instanceof Error ? error.message : 'Server error' },
      500,
    );
  }
}
