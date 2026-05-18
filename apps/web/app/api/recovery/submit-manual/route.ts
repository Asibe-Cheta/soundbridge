import { NextRequest } from 'next/server';

import { digitalCardCorsHeaders, jsonResponse } from '@/src/lib/digital-card-cors';
import {
  checkCreatorRecoveryRateLimit,
  checkIpRecoveryRateLimit,
  extractClientIp,
  hashRecoverySessionToken,
  logRecoveryAttempt,
} from '@/src/lib/digital-card-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: digitalCardCorsHeaders });
}

/** POST /api/recovery/submit-manual [PUBLIC] */
export async function POST(request: NextRequest) {
  const service = createServiceClient();
  const ip = extractClientIp(request);

  try {
    const body = (await request.json()) as {
      recovery_session_id?: string;
      card_file_storage_path?: string;
      selfie_video_storage_path?: string;
    };

    const sessionToken = body.recovery_session_id?.trim() ?? '';
    const cardPath = body.card_file_storage_path?.trim() ?? '';
    const selfiePath = body.selfie_video_storage_path?.trim() ?? '';

    if (!sessionToken || !cardPath || !selfiePath) {
      return jsonResponse(
        { submitted: false, error: 'session_expired_or_invalid' },
        400,
      );
    }

    const ipLimit = await checkIpRecoveryRateLimit(service, ip);
    if (!ipLimit.allowed) {
      return jsonResponse(
        {
          error: 'rate_limited',
          message: ipLimit.message,
          retry_after_seconds: ipLimit.retry_after_seconds,
        },
        429,
      );
    }

    const hash = hashRecoverySessionToken(sessionToken);
    const { data: session } = await service
      .from('recovery_sessions')
      .select('id, creator_id, persona_verified, expires_at, used_at')
      .eq('session_token_hash', hash)
      .maybeSingle();

    if (!session || session.used_at || new Date(session.expires_at).getTime() < Date.now()) {
      return jsonResponse(
        { submitted: false, error: 'session_expired_or_invalid' },
        400,
      );
    }

    if (session.persona_verified) {
      return jsonResponse(
        {
          submitted: false,
          error: 'invalid_request',
          message: 'Use recovery/complete for Persona-verified accounts.',
        },
        400,
      );
    }

    const creatorLimit = await checkCreatorRecoveryRateLimit(service, session.creator_id);
    if (!creatorLimit.allowed) {
      return jsonResponse(
        {
          error: 'rate_limited',
          message: creatorLimit.message,
          retry_after_seconds: creatorLimit.retry_after_seconds,
        },
        429,
      );
    }

    const expectedPrefix = `${session.creator_id}/`;
    if (
      !cardPath.startsWith(expectedPrefix) ||
      !selfiePath.startsWith(expectedPrefix)
    ) {
      return jsonResponse({ submitted: false, error: 'invalid_request' }, 400);
    }

    const now = new Date().toISOString();

    const { data: requestRow, error: insertError } = await service
      .from('recovery_requests')
      .insert({
        creator_id: session.creator_id,
        recovery_session_id: session.id,
        status: 'pending',
        card_file_storage_path: cardPath,
        selfie_video_storage_path: selfiePath,
        updated_at: now,
      })
      .select('id')
      .single();

    if (insertError || !requestRow) {
      console.error('[recovery/submit-manual] insert:', insertError);
      return jsonResponse({ submitted: false, error: 'internal_error' }, 500);
    }

    await service.from('recovery_sessions').update({ used_at: now }).eq('id', session.id);

    await service
      .from('card_auth_tokens')
      .update({ is_active: false, used_for_recovery_at: now, invalidated_at: now })
      .eq('creator_id', session.creator_id)
      .eq('is_active', true);

    await logRecoveryAttempt(service, {
      creator_id: session.creator_id,
      ip_address: ip,
      outcome: 'pending_manual',
      recovery_session_id: session.id,
      metadata: { recovery_request_id: requestRow.id },
    });

    return jsonResponse({
      submitted: true,
      recovery_request_id: requestRow.id,
      message:
        'Your recovery request has been submitted. We will contact you within 48 hours.',
    });
  } catch (error: unknown) {
    console.error('[recovery/submit-manual]', error);
    return jsonResponse({ submitted: false, error: 'internal_error' }, 500);
  }
}
