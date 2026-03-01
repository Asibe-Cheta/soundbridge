/**
 * GET /api/connections/requests/pending
 * Pending connection requests for the current user (as recipient). Paginated.
 * @see WEB_TEAM_MOBILE_UPDATES_2026_03_01.MD §5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: CORS }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
    const offset = (page - 1) * limit;

    const { data: requests, error: reqError, count } = await supabase
      .from('connection_requests')
      .select('id, requester_id, message, created_at', { count: 'exact' })
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reqError) {
      console.error('connection_requests pending:', reqError);
      return NextResponse.json(
        { success: false, error: 'Failed to load requests' },
        { status: 500, headers: CORS }
      );
    }

    const list = requests ?? [];
    const total = count ?? 0;

    if (list.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            requests: [],
            total: total,
            page,
            limit,
          },
        },
        { headers: CORS }
      );
    }

    const senderIds = [...new Set(list.map((r: { requester_id: string }) => r.requester_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username, professional_headline')
      .in('id', senderIds);

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; display_name?: string; avatar_url?: string; username?: string; professional_headline?: string }) => [
        p.id,
        {
          id: p.id,
          display_name: p.display_name ?? p.username ?? 'Unknown',
          avatar_url: p.avatar_url ?? null,
          role: p.professional_headline ?? 'creator',
        },
      ])
    );

    const requestsOut = list.map((r: { id: string; requester_id: string; message: string | null; created_at: string }) => ({
      id: r.id,
      sender_id: r.requester_id,
      sender: profileMap.get(r.requester_id) ?? {
        id: r.requester_id,
        display_name: 'Unknown',
        avatar_url: null,
        role: 'creator',
      },
      message: r.message ?? undefined,
      created_at: r.created_at,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          requests: requestsOut,
          total,
          page,
          limit,
        },
      },
      { headers: CORS }
    );
  } catch (e) {
    console.error('GET /api/connections/requests/pending:', e);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: CORS }
    );
  }
}
