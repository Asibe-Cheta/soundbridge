import { NextRequest } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { digitalCardCorsHeaders, jsonResponse } from '@/src/lib/digital-card-cors';
import { isValidSha256Hex, isValidUuid } from '@/src/lib/digital-card-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: digitalCardCorsHeaders });
}

/** POST /api/card/store-fingerprint */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const body = (await request.json()) as { creator_id?: string; file_hash?: string };
    const creatorId = body.creator_id ?? user.id;

    if (creatorId !== user.id) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    if (!isValidUuid(creatorId)) {
      return jsonResponse({ error: 'invalid_request', message: 'creator_id is required' }, 400);
    }

    const fileHash = (body.file_hash ?? '').toLowerCase();
    if (!isValidSha256Hex(fileHash)) {
      return jsonResponse(
        { error: 'invalid_hash', message: 'file_hash must be a 64-character hex string' },
        400,
      );
    }

    const service = createServiceClient();
    const { data: activeToken, error: fetchError } = await service
      .from('card_auth_tokens')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('[card/store-fingerprint] fetch:', fetchError);
      return jsonResponse({ error: 'internal_error' }, 500);
    }

    if (!activeToken) {
      return jsonResponse(
        {
          error: 'no_active_token',
          message: 'Generate a card token before storing a fingerprint.',
        },
        404,
      );
    }

    const { error: updateError } = await service
      .from('card_auth_tokens')
      .update({ file_fingerprint: fileHash })
      .eq('id', activeToken.id);

    if (updateError) {
      console.error('[card/store-fingerprint] update:', updateError);
      return jsonResponse({ error: 'internal_error' }, 500);
    }

    return jsonResponse({ stored: true });
  } catch (error: unknown) {
    console.error('[card/store-fingerprint]', error);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
}
