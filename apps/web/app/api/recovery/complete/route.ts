import { NextRequest } from 'next/server';

import { digitalCardCorsHeaders, jsonResponse } from '@/src/lib/digital-card-cors';
import {
  checkCreatorRecoveryRateLimit,
  checkIpRecoveryRateLimit,
  extractClientIp,
  hashRecoverySessionToken,
  isPersonaVerified,
  logRecoveryAttempt,
} from '@/src/lib/digital-card-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: digitalCardCorsHeaders });
}

async function loadRecoverySession(
  service: ReturnType<typeof createServiceClient>,
  recoverySessionId: string,
) {
  const hash = hashRecoverySessionToken(recoverySessionId);
  const { data } = await service
    .from('recovery_sessions')
    .select('id, creator_id, persona_verified, expires_at, used_at')
    .eq('session_token_hash', hash)
    .maybeSingle();
  return data;
}

/** POST /api/recovery/complete [PUBLIC] — Persona-verified path only */
export async function POST(request: NextRequest) {
  const service = createServiceClient();
  const ip = extractClientIp(request);

  try {
    const body = (await request.json()) as { recovery_session_id?: string };
    const sessionToken = body.recovery_session_id?.trim() ?? '';

    if (!sessionToken) {
      return jsonResponse(
        {
          success: false,
          error: 'session_expired_or_invalid',
          message: 'Recovery session has expired. Please start over.',
        },
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

    const session = await loadRecoverySession(service, sessionToken);
    if (!session || session.used_at) {
      return jsonResponse(
        {
          success: false,
          error: 'session_expired_or_invalid',
          message: 'Recovery session has expired. Please start over.',
        },
        400,
      );
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return jsonResponse(
        {
          success: false,
          error: 'session_expired_or_invalid',
          message: 'Recovery session has expired. Please start over.',
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

    if (!session.persona_verified) {
      return jsonResponse(
        {
          success: false,
          error: 'invalid_request',
          message: 'This session requires manual recovery. Use submit-manual instead.',
        },
        400,
      );
    }

    const personaOk = await isPersonaVerified(service, session.creator_id);
    if (!personaOk) {
      return jsonResponse(
        {
          success: false,
          error: 'face_verification_not_confirmed',
          message:
            'Face verification has not been confirmed. Please complete the identity check.',
        },
        403,
      );
    }

    const now = new Date().toISOString();

    await service
      .from('recovery_sessions')
      .update({ used_at: now })
      .eq('id', session.id);

    await service
      .from('card_auth_tokens')
      .update({ is_active: false, used_for_recovery_at: now, invalidated_at: now })
      .eq('creator_id', session.creator_id)
      .eq('is_active', true);

    const { data: authUser, error: userError } = await service.auth.admin.getUserById(
      session.creator_id,
    );
    if (userError || !authUser?.user?.email) {
      console.error('[recovery/complete] getUserById:', userError);
      return jsonResponse({ success: false, error: 'internal_error' }, 500);
    }

    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
    });

    const loginUrl =
      linkData?.properties?.action_link ??
      (linkData as { action_link?: string })?.action_link ??
      null;

    if (linkError || !loginUrl) {
      console.error('[recovery/complete] generateLink:', linkError);
      return jsonResponse({ success: false, error: 'internal_error' }, 500);
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await logRecoveryAttempt(service, {
      creator_id: session.creator_id,
      ip_address: ip,
      outcome: 'success',
      recovery_session_id: session.id,
      metadata: { flow: 'persona_complete' },
    });

    return jsonResponse({
      success: true,
      login_token: loginUrl,
      token_type: 'magic_link',
      expires_at: expiresAt,
    });
  } catch (error: unknown) {
    console.error('[recovery/complete]', error);
    return jsonResponse({ success: false, error: 'internal_error' }, 500);
  }
}
