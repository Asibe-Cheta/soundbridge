/**
 * POST /api/connections/[requestId]/reject
 * 
 * Reject a connection request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

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
    console.log('❌ Reject Connection Request API called:', requestId);

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
        { success: false, error: 'Unauthorized - you can only reject requests sent to you' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ Error rejecting connection request:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to reject connection request', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Connection request rejected:', requestId);

    return NextResponse.json(
      { success: true, message: 'Connection request rejected' },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error rejecting connection request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

