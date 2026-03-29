/**
 * POST /api/connections/requests/:id/accept
 * Same behavior as POST /api/connections/:requestId/accept — for mobile path.
 * @see WEB_TEAM_MOBILE_UPDATES_2026_03_01.MD §5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyConnectionAccepted } from '@/src/lib/post-notifications';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { data: connectionRequest, error: requestError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !connectionRequest) {
      return NextResponse.json({ success: false, error: 'Connection request not found' }, { status: 404, headers: CORS });
    }
    if (connectionRequest.recipient_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: CORS });
    }
    if (connectionRequest.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Request already processed' }, { status: 400, headers: CORS });
    }

    const userId1 = connectionRequest.requester_id < connectionRequest.recipient_id ? connectionRequest.requester_id : connectionRequest.recipient_id;
    const userId2 = connectionRequest.requester_id < connectionRequest.recipient_id ? connectionRequest.recipient_id : connectionRequest.requester_id;

    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .insert({
        user_id: userId1,
        connected_user_id: userId2,
        status: 'connected',
        connected_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (connectionError) {
      console.error('connections insert:', connectionError);
      return NextResponse.json({ success: false, error: 'Failed to create connection' }, { status: 500, headers: CORS });
    }

    await supabase
      .from('connection_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    const connectedUserId = connectionRequest.requester_id === user.id ? connectionRequest.recipient_id : connectionRequest.requester_id;
    const { data: accepterProfile } = await supabase.from('profiles').select('display_name, username').eq('id', user.id).single();
    const accepterName = accepterProfile?.display_name || accepterProfile?.username || 'Someone';
    notifyConnectionAccepted(
      connectionRequest.requester_id,
      accepterName,
      connection.id,
      user.id,
      accepterProfile?.username ?? null,
      {
        pushTitle: `${accepterProfile?.username ? `@${accepterProfile.username}` : accepterName} accepted your connection`,
        pushBody: "You're now connected",
      }
    ).catch(() => {});

    return NextResponse.json({ success: true, data: { connection_id: connection.id } }, { headers: CORS });
  } catch (e) {
    console.error('POST /api/connections/requests/[id]/accept:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
