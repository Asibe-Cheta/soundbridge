import { NextRequest } from 'next/server';

import { digitalCardCorsHeaders, jsonResponse } from '@/src/lib/digital-card-cors';
import {
  checkCreatorRecoveryRateLimit,
  checkIpRecoveryRateLimit,
  extractClientIp,
  generateOpaqueSessionToken,
  hashRecoverySessionToken,
  isPersonaVerified,
  isValidSha256Hex,
  isValidUuid,
  logRecoveryAttempt,
  RECOVERY_SESSION_TTL_MS,
  safeEqualHex,
} from '@/src/lib/digital-card-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: digitalCardCorsHeaders });
}

const VERIFY_FAIL_BODY = {
  verified: false,
  error: 'verification_failed',
  message:
    'This card could not be verified. Please make sure you are uploading your original card file, not a screenshot or copy.',
};

/** POST /api/recovery/verify-card [PUBLIC] */
export async function POST(request: NextRequest) {
  const service = createServiceClient();
  const ip = extractClientIp(request);

  try {
    const body = (await request.json()) as {
      uid?: string;
      token?: string;
      file_hash?: string;
    };

    const uid = body.uid?.trim() ?? '';
    const token = (body.token ?? '').toLowerCase();
    const fileHash = (body.file_hash ?? '').toLowerCase();

    if (!isValidUuid(uid) || !token || !isValidSha256Hex(fileHash)) {
      await logRecoveryAttempt(service, {
        creator_id: isValidUuid(uid) ? uid : null,
        ip_address: ip,
        outcome: 'failed',
        metadata: { reason: 'invalid_payload' },
      });
      return jsonResponse(VERIFY_FAIL_BODY, 400);
    }

    const ipLimit = await checkIpRecoveryRateLimit(service, ip);
    if (!ipLimit.allowed) {
      await logRecoveryAttempt(service, {
        creator_id: uid,
        ip_address: ip,
        outcome: 'rate_limited',
      });
      return jsonResponse(
        {
          error: 'rate_limited',
          message: ipLimit.message,
          retry_after_seconds: ipLimit.retry_after_seconds,
        },
        429,
      );
    }

    const creatorLimit = await checkCreatorRecoveryRateLimit(service, uid);
    if (!creatorLimit.allowed) {
      await logRecoveryAttempt(service, {
        creator_id: uid,
        ip_address: ip,
        outcome: 'rate_limited',
      });
      return jsonResponse(
        {
          error: 'rate_limited',
          message: creatorLimit.message,
          retry_after_seconds: creatorLimit.retry_after_seconds,
        },
        429,
      );
    }

    const { data: row } = await service
      .from('card_auth_tokens')
      .select('id, card_auth_token, file_fingerprint, is_active')
      .eq('creator_id', uid)
      .eq('is_active', true)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasActiveRow = Boolean(row?.is_active);
    const tokenMatch = row?.card_auth_token
      ? safeEqualHex(token, row.card_auth_token.toLowerCase())
      : false;
    const fingerprintMatch = row?.file_fingerprint
      ? safeEqualHex(fileHash, row.file_fingerprint.toLowerCase())
      : false;

    const verified = hasActiveRow && tokenMatch && fingerprintMatch;

    if (!verified) {
      await logRecoveryAttempt(service, {
        creator_id: uid,
        ip_address: ip,
        outcome: 'failed',
        metadata: { has_active_row: hasActiveRow },
      });
      return jsonResponse(VERIFY_FAIL_BODY, 400);
    }

    const personaVerified = await isPersonaVerified(service, uid);
    const sessionToken = generateOpaqueSessionToken();
    const sessionHash = hashRecoverySessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + RECOVERY_SESSION_TTL_MS).toISOString();

    const { data: session, error: sessionError } = await service
      .from('recovery_sessions')
      .insert({
        session_token_hash: sessionHash,
        creator_id: uid,
        persona_verified: personaVerified,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('[recovery/verify-card] session:', sessionError);
      return jsonResponse(VERIFY_FAIL_BODY, 400);
    }

    await logRecoveryAttempt(service, {
      creator_id: uid,
      ip_address: ip,
      outcome: 'success',
      recovery_session_id: session.id,
    });

    return jsonResponse({
      verified: true,
      recovery_session_id: sessionToken,
      persona_verified: personaVerified,
      expires_at: expiresAt,
    });
  } catch (error: unknown) {
    console.error('[recovery/verify-card]', error);
    return jsonResponse(VERIFY_FAIL_BODY, 400);
  }
}
