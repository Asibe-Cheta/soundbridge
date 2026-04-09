import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * POST /api/admin/audio-tracks/duration-backfill
 * Queues duration jobs for audio tracks with duration <= 0.
 * This is a manual backfill helper while worker processing is running.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const service = admin.serviceClient;

  const { data: tracks, error: fetchError } = await service
    .from('audio_tracks')
    .select('id')
    .or('duration.is.null,duration.lte.0')
    .limit(5000);

  if (fetchError) {
    return NextResponse.json(
      { error: 'Failed to load tracks needing duration backfill', details: fetchError.message },
      { status: 500, headers: CORS },
    );
  }

  const payload = (tracks ?? []).map((t: { id: string }) => ({
    track_id: t.id,
    status: 'queued',
    attempts: 0,
  }));

  if (payload.length === 0) {
    return NextResponse.json({ success: true, queued: 0 }, { headers: CORS });
  }

  const { error: insertError } = await service
    .from('audio_track_duration_jobs')
    .upsert(payload, { onConflict: 'track_id', ignoreDuplicates: false });

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to queue duration jobs', details: insertError.message },
      { status: 500, headers: CORS },
    );
  }

  return NextResponse.json({ success: true, queued: payload.length }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
