import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { endLiveStream } from '@/src/lib/live-stream-lifecycle';
import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';

const MAX_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const WARNING_AT_MS = 2 * 60 * 60 * 1000 + 45 * 60 * 1000; // 2h45m

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return (
    request.headers.get('authorization') === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get('secret') === secret ||
    request.headers.get('x-vercel-cron-secret') === secret
  );
}

/** Runs every minute (see vercel.json). Server-side enforcement — never relies on a client-side timer. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: activeStreams, error } = await supabase
    .from('live_streams')
    .select('id, user_id, started_at, duration_warning_sent_at')
    .eq('status', 'active');

  if (error) {
    console.error('[cron/live-streams-enforce-duration] fetch failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  let ended = 0;
  let warned = 0;

  for (const stream of activeStreams || []) {
    const elapsedMs = now - new Date(stream.started_at).getTime();

    if (elapsedMs >= MAX_DURATION_MS) {
      await endLiveStream(supabase, stream.id, 'duration_limit');
      ended++;
      continue;
    }

    if (elapsedMs >= WARNING_AT_MS && !stream.duration_warning_sent_at) {
      await sendExpoPushIfAllowed(supabase, stream.user_id, 'live_stream', {
        title: 'Your stream ends in 15 minutes',
        body: 'You’ve reached the 3 hour streaming limit soon — wrap up or save your closing thoughts.',
        data: { type: 'live_stream_ending_soon', liveStreamId: stream.id },
      });
      await supabase
        .from('live_streams')
        .update({ duration_warning_sent_at: new Date().toISOString() })
        .eq('id', stream.id);
      warned++;
    }
  }

  return NextResponse.json({ checked: activeStreams?.length || 0, ended, warned });
}
