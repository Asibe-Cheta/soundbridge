import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: session, error } = await supabase
    .from('request_room_sessions')
    .select(
      `id,creator_id,session_name,minimum_tip_amount,status,started_at,ended_at,total_tips_collected,total_requests_received,created_at`,
    )
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: creator } = await supabase
    .from('profiles')
    .select('id,display_name,username,avatar_url')
    .eq('id', session.creator_id)
    .maybeSingle();

  return NextResponse.json({
    session: {
      ...session,
      creator,
    },
  });
}

