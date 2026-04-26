import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await getSupabaseRouteClient(request, true);
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { sessionId } = await params;

  const { data: session } = await auth.supabase
    .from('request_room_sessions')
    .select('id,creator_id,status')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.creator_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from('request_room_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ session: data });
}

