import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const VALID_STATUS = new Set(['pending', 'playing', 'done']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const auth = await getSupabaseRouteClient(request, true);
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { requestId } = await params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || '').toLowerCase();
  if (!VALID_STATUS.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data: reqRow } = await auth.supabase
    .from('request_room_requests')
    .select('id,creator_id')
    .eq('id', requestId)
    .maybeSingle();
  if (!reqRow) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }
  if (reqRow.creator_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from('request_room_requests')
    .update({ status })
    .eq('id', requestId)
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ request: data });
}

