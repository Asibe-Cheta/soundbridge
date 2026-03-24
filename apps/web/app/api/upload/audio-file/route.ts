import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createR2PutObjectCommand, buildR2PublicUrl, r2Client } from '@/src/lib/r2-client';
import { createSafeObjectKey, validateAudioUploadInput } from '@/src/lib/audio-upload-security';

const UPLOAD_TIMEOUT_MS = 20000;
const MAX_UPLOADS_PER_MINUTE = 5;

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Basic per-user rate limiting based on recent track creation activity.
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count, error: rateLimitError } = await supabase
      .from('audio_tracks')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .gte('created_at', since);

    if (rateLimitError) {
      console.error('Upload rate limit check failed:', rateLimitError);
      return NextResponse.json({ error: 'Failed to validate upload limits' }, { status: 500 });
    }

    if ((count || 0) >= MAX_UPLOADS_PER_MINUTE) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audioFile');
    if (!(audioFile instanceof File)) {
      return NextResponse.json({ error: 'audioFile is required' }, { status: 400 });
    }

    const validation = validateAudioUploadInput(audioFile);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const objectKey = createSafeObjectKey(user.id, audioFile.name);
    const putCommand = createR2PutObjectCommand({
      objectKey,
      body,
      contentType: audioFile.type || 'application/octet-stream',
      contentLength: body.byteLength,
    });

    await Promise.race([
      r2Client.send(putCommand),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('R2 upload timed out')), UPLOAD_TIMEOUT_MS)
      ),
    ]);

    const publicUrl = buildR2PublicUrl(objectKey);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      objectKey,
      size: audioFile.size,
      contentType: audioFile.type || 'application/octet-stream',
    });
  } catch (error) {
    console.error('R2 audio upload API error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
