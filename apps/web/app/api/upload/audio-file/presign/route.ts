import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { buildR2PublicUrl, r2Client, r2Config } from '@/src/lib/r2-client';
import { createSafeObjectKey, validateAudioPresignPayload } from '@/src/lib/audio-upload-security';

/**
 * If uploads go to Supabase Storage, raise Dashboard → Storage → max file size (default 50MB)
 * or you will see: "The object exceeded the maximum allowed size". Audio to R2 uses presign + PUT.
 */
export const maxDuration = 60;

const MAX_UPLOADS_PER_MINUTE = 5;
const PRESIGN_EXPIRES_SECONDS = 900;

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count, error: rateLimitError } = await supabase
      .from('audio_tracks')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .gte('created_at', since);

    if (rateLimitError) {
      console.error('Presign rate limit check failed:', rateLimitError);
      return NextResponse.json({ error: 'Failed to validate upload limits' }, { status: 500 });
    }

    if ((count || 0) >= MAX_UPLOADS_PER_MINUTE) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const validation = validateAudioPresignPayload(body as Record<string, unknown>);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const { fileName, fileSize, contentType } = validation;
    const objectKey = createSafeObjectKey(user.id, fileName);

    const command = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: fileSize,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
    const publicUrl = buildR2PublicUrl(objectKey);

    return NextResponse.json({
      success: true,
      uploadUrl,
      url: publicUrl,
      objectKey,
      contentType,
      size: fileSize,
    });
  } catch (error) {
    console.error('R2 audio presign API error:', error);
    const message = error instanceof Error ? error.message : 'Presign failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
