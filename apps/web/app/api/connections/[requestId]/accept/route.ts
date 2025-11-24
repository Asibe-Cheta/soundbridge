/**
 * POST /api/connections/[requestId]/accept
 * 
 * Accept a connection request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyConnectionAccepted } from '@/src/lib/post-notifications';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId;
    console.log('✅ Accept Connection Request API called:', requestId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get connection request
    const { data: connectionRequest, error: requestError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !connectionRequest) {
      return NextResponse.json(
        { success: false, error: 'Connection request not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if user is the recipient
    if (connectionRequest.recipient_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - you can only accept requests sent to you' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if already processed
    if (connectionRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Connection request already processed' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create connection (ensure user_id < connected_user_id)
    const userId1 = connectionRequest.requester_id < connectionRequest.recipient_id
      ? connectionRequest.requester_id
      : connectionRequest.recipient_id;
    const userId2 = connectionRequest.requester_id < connectionRequest.recipient_id
      ? connectionRequest.recipient_id
      : connectionRequest.requester_id;

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
      console.error('❌ Error creating connection:', connectionError);
      return NextResponse.json(
        { success: false, error: 'Failed to create connection', details: connectionError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ Error updating request status:', updateError);
      // Connection was created, so we'll continue
    }

    // Get connected user profile
    const connectedUserId = connectionRequest.requester_id === user.id
      ? connectionRequest.recipient_id
      : connectionRequest.requester_id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline')
      .eq('id', connectedUserId)
      .single();

    // Send notification to requester
    const { data: accepterProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();

    const accepterName = accepterProfile?.display_name || accepterProfile?.username || 'Someone';
    notifyConnectionAccepted(connectionRequest.requester_id, accepterName, connection.id).catch((err) => {
      console.error('Failed to send connection accepted notification:', err);
      // Don't fail the request if notification fails
    });

    console.log('✅ Connection request accepted:', requestId);

    return NextResponse.json(
      {
        success: true,
        data: {
          connection: {
            id: connection.id,
            connected_user: {
              id: connectedUserId,
              name: profile?.display_name || profile?.username || 'Unknown',
              username: profile?.username,
              avatar_url: profile?.avatar_url,
              role: profile?.professional_headline,
            },
            connected_at: connection.connected_at,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error accepting connection request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

