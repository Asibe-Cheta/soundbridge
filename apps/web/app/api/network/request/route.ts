/**
 * POST /api/network/request
 *
 * Alias for connection request (Connect = mutual, requires acceptance).
 * Mobile may call this path; canonical path is POST /api/connections/request.
 *
 * Body: { "user_id" | "recipient_id": "target-uuid", "message"?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyConnectionRequest } from '@/src/lib/post-notifications';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
  'Content-Type': 'application/json',
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const recipientId = body.recipient_id ?? body.user_id;
    const message = body.message ?? null;

    if (!recipientId) {
      return NextResponse.json(
        { success: false, error: 'recipient_id or user_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (recipientId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot send connection request to yourself' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .or(`and(user_id.eq.${user.id},connected_user_id.eq.${recipientId}),and(user_id.eq.${recipientId},connected_user_id.eq.${user.id})`)
      .eq('status', 'connected')
      .maybeSingle();

    if (existingConnection) {
      return NextResponse.json(
        { success: false, error: 'Already connected to this user' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: existingRequest } = await supabase
      .from('connection_requests')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Connection request already exists' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: connectionRequest, error: requestError } = await supabase
      .from('connection_requests')
      .insert({
        requester_id: user.id,
        recipient_id: recipientId,
        message,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (requestError) {
      console.error('POST /api/network/request:', requestError);
      return NextResponse.json(
        { success: false, error: 'Failed to create connection request', details: requestError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();
    const requesterName = requesterProfile?.display_name || requesterProfile?.username || 'Someone';
    notifyConnectionRequest(
      recipientId,
      requesterName,
      connectionRequest.id,
      user.id,
      requesterProfile?.username ?? null,
      {
        pushTitle: `${requesterProfile?.username ? `@${requesterProfile.username}` : requesterName} wants to connect`,
        pushBody: 'Tap to accept or decline',
      }
    ).catch((err) => {
      console.error('Connection request notification failed:', err);
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          request: {
            id: connectionRequest.id,
            recipient_id: connectionRequest.recipient_id,
            status: connectionRequest.status,
            created_at: connectionRequest.created_at,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    console.error('POST /api/network/request:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
