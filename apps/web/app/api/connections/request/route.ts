/**
 * POST /api/connections/request
 * 
 * Send a connection request
 * 
 * Request Body:
 * {
 *   "recipient_id": "user-uuid",
 *   "message": "Optional message with request"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyConnectionRequest } from '@/src/lib/post-notifications';

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

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Send Connection Request API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { recipient_id, message } = body;

    // Validation
    if (!recipient_id) {
      return NextResponse.json(
        { success: false, error: 'recipient_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (recipient_id === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot send connection request to yourself' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .or(`and(user_id.eq.${user.id},connected_user_id.eq.${recipient_id}),and(user_id.eq.${recipient_id},connected_user_id.eq.${user.id})`)
      .eq('status', 'connected')
      .maybeSingle();

    if (existingConnection) {
      return NextResponse.json(
        { success: false, error: 'Already connected to this user' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if pending request exists
    const { data: existingRequest } = await supabase
      .from('connection_requests')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipient_id}),and(requester_id.eq.${recipient_id},recipient_id.eq.${user.id})`)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Connection request already exists' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create connection request
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .insert({
        requester_id: user.id,
        recipient_id,
        message: message || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (requestError) {
      console.error('❌ Error creating connection request:', requestError);
      return NextResponse.json(
        { success: false, error: 'Failed to create connection request', details: requestError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get requester profile for notification
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();

    // Send notification to recipient
    const requesterName = requesterProfile?.display_name || requesterProfile?.username || 'Someone';
    notifyConnectionRequest(recipient_id, requesterName, request.id).catch((err) => {
      console.error('Failed to send connection request notification:', err);
      // Don't fail the request if notification fails
    });

    console.log('✅ Connection request created:', request.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          request: {
            id: request.id,
            recipient_id: request.recipient_id,
            status: request.status,
            created_at: request.created_at,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error creating connection request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

