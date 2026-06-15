import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { sendExpoPush } from '@/src/lib/push-notifications';
import { sendCreatorTrackLiveEmail } from '@/src/lib/distribution-emails';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const { id } = await params;
  const service = admin.serviceClient;

  const { data: row, error: fetchErr } = await service
    .from('distribution_requests')
    .select(
      `
      *,
      creator:profiles!distribution_requests_creator_id_fkey (
        id, display_name, username, expo_push_token
      )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404, headers: CORS });
  }

  if (row.track_status === 'live') {
    return NextResponse.json({ success: true, alreadyLive: true }, { headers: CORS });
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await service
    .from('distribution_requests')
    .update({ track_status: 'live', track_went_live_at: now })
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500, headers: CORS });
  }

  const creator = row.creator as {
    id?: string;
    display_name?: string | null;
    username?: string | null;
  } | null;

  const creatorName = creator?.display_name || creator?.username || 'Creator';
  const trackTitle = row.track_title as string;
  const creatorId = row.creator_id as string;
  const creatorEmail = (row.creator_email as string) || null;

  const pushTitle = 'Your track is live';
  const pushBody = `${trackTitle} is now available on Spotify, Apple Music and major streaming platforms.`;

  sendExpoPush(service, creatorId, {
    title: pushTitle,
    body: pushBody,
    data: { type: 'creator_post', trackTitle, distributionRequestId: id },
    channelId: 'social',
    priority: 'high',
  }).catch((e) => console.error('[distribution mark-live] push failed:', e));

  if (creatorEmail) {
    sendCreatorTrackLiveEmail(creatorEmail, creatorName, trackTitle).catch((e) =>
      console.error('[distribution mark-live] email failed:', e),
    );
  }

  await service.from('notifications').insert({
    user_id: creatorId,
    type: 'creator_post',
    title: pushTitle,
    body: pushBody,
    metadata: { distributionRequestId: id, trackTitle },
    data: { type: 'creator_post', distributionRequestId: id, trackTitle },
    read: false,
  });

  return NextResponse.json({ success: true }, { headers: CORS });
}
