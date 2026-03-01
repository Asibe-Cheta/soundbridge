/**
 * POST /api/connections/requests/:id/decline
 * Same behavior as POST /api/connections/:requestId/reject — for mobile path.
 * @see WEB_TEAM_MOBILE_UPDATES_2026_03_01.MD §5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

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
      .select('id, recipient_id, status')
      .eq('id', requestId)
      .single();

    if (requestError || !connectionRequest) {
      return NextResponse.json({ success: false, error: 'Connection request not found' }, { status: 404, headers: CORS });
    }
    if (connectionRequest.recipient_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: CORS });
    }

    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) {
      console.error('connection_requests update:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to decline' }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ success: true }, { headers: CORS });
  } catch (e) {
    console.error('POST /api/connections/requests/[id]/decline:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
