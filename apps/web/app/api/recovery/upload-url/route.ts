import { NextRequest } from 'next/server';

import { digitalCardCorsHeaders, jsonResponse } from '@/src/lib/digital-card-cors';
import {
  extensionForMime,
  hashRecoverySessionToken,
  RECOVERY_EVIDENCE_BUCKET,
} from '@/src/lib/digital-card-auth';
import { createServiceClient } from '@/src/lib/supabase';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
]);

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: digitalCardCorsHeaders });
}

/** POST /api/recovery/upload-url [PUBLIC] */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      recovery_session_id?: string;
      file_type?: 'card' | 'selfie_video';
      mime_type?: string;
    };

    const sessionToken = body.recovery_session_id?.trim() ?? '';
    const fileType = body.file_type;
    const mimeType = body.mime_type?.trim() ?? '';

    if (!sessionToken || (fileType !== 'card' && fileType !== 'selfie_video')) {
      return jsonResponse({ error: 'invalid_request' }, 400);
    }

    if (!ALLOWED_MIMES.has(mimeType)) {
      return jsonResponse({ error: 'invalid_request', message: 'Unsupported mime_type' }, 400);
    }

    const service = createServiceClient();
    const hash = hashRecoverySessionToken(sessionToken);
    const { data: session } = await service
      .from('recovery_sessions')
      .select('id, creator_id, expires_at, used_at')
      .eq('session_token_hash', hash)
      .maybeSingle();

    if (!session || session.used_at || new Date(session.expires_at).getTime() < Date.now()) {
      return jsonResponse({ error: 'session_expired_or_invalid' }, 400);
    }

    const ext = extensionForMime(mimeType);
    const fileName = fileType === 'card' ? `card.${ext}` : `selfie.${ext}`;
    const storagePath = `${session.creator_id}/${session.id}/${fileName}`;

    const { data: signed, error: signError } = await service.storage
      .from(RECOVERY_EVIDENCE_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: true });

    if (signError || !signed) {
      console.error('[recovery/upload-url] sign:', signError);
      return jsonResponse({ error: 'internal_error', message: 'Failed to create upload URL' }, 500);
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return jsonResponse({
      upload_url: signed.signedUrl,
      storage_path: storagePath,
      expires_at: expiresAt,
    });
  } catch (error: unknown) {
    console.error('[recovery/upload-url]', error);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
}
