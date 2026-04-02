import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { sendExpoPush } from '@/src/lib/push-notifications';

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return Boolean(secret && token && token === secret);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId } = await request.json();
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: session } = await supabase
      .from('live_sessions')
      .select('id, creator_id, status, title')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session?.creator_id || session.status !== 'live') {
      return NextResponse.json({ sent: 0, skipped: true, reason: 'session_not_live' });
    }

    const { data: creator } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', session.creator_id)
      .maybeSingle();

    const creatorName = creator?.display_name || creator?.username || 'Someone';
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', session.creator_id)
      .limit(2000);

    const followerIds = Array.from(
      new Set((followers ?? []).map((row) => row.follower_id).filter(Boolean))
    ).filter((id) => id !== session.creator_id);

    let sent = 0;
    for (const followerId of followerIds) {
      const ok = await sendExpoPush(supabase, followerId, {
        title: `${creatorName} just went live`,
        body: session.title ? `${session.title}` : 'Tap to join now',
        data: {
          type: 'live_session_started',
          entityId: session.id,
          entityType: 'live_session',
          creatorId: session.creator_id,
          sessionId: session.id,
        },
        channelId: 'social',
        priority: 'high',
      });
      if (ok) sent += 1;
    }

    return NextResponse.json({ sent, followers: followerIds.length });
  } catch (error) {
    console.error('[internal/push/live-session-started] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
