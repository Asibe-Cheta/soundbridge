/**
 * GET /api/connections/requests
 * 
 * Get pending connection requests for authenticated user
 * 
 * Query Parameters:
 * - type: 'sent' or 'received' (default: 'received')
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

export async function GET(request: NextRequest) {
  try {
    console.log('📬 Get Connection Requests API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received';

    // Build query
    let query = supabase
      .from('connection_requests')
      .select('*')
      .eq('status', 'pending');

    if (type === 'sent') {
      query = query.eq('requester_id', user.id);
    } else {
      query = query.eq('recipient_id', user.id);
    }

    query = query.order('created_at', { ascending: false });

    const { data: requests, error: requestsError } = await query;

    if (requestsError) {
      console.error('❌ Error fetching connection requests:', requestsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch connection requests', details: requestsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json(
        { success: true, data: { requests: [] } },
        { headers: corsHeaders }
      );
    }

    // Get requester/recipient profiles
    const userIds = [
      ...new Set(
        requests.flatMap((r) => [r.requester_id, r.recipient_id])
      ),
    ];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline')
      .in('id', userIds);

    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p) => profileMap.set(p.id, p));
    }

    // Get mutual connections count for each requester
    const formattedRequests = await Promise.all(
      requests.map(async (req) => {
        const requesterId = type === 'sent' ? user.id : req.requester_id;
        const requesterProfile = profileMap.get(requesterId);

        // Get mutual connections count
        const { count: mutualCount } = await supabase
          .from('connections')
          .select('*', { count: 'exact', head: true })
          .or(`and(user_id.eq.${user.id},connected_user_id.in.(${requesterId})),and(user_id.eq.${requesterId},connected_user_id.eq.${user.id})`)
          .eq('status', 'connected');

        return {
          id: req.id,
          requester: {
            id: requesterId,
            name: requesterProfile?.display_name || requesterProfile?.username || 'Unknown',
            username: requesterProfile?.username,
            avatar_url: requesterProfile?.avatar_url,
            role: requesterProfile?.professional_headline,
            mutual_connections: mutualCount || 0,
          },
          message: req.message,
          created_at: req.created_at,
        };
      })
    );

    console.log(`✅ Fetched ${formattedRequests.length} connection requests`);

    return NextResponse.json(
      {
        success: true,
        data: {
          requests: formattedRequests,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching connection requests:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

