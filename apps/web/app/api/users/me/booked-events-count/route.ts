import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/users/me/booked-events-count
 * Returns the count of distinct events the user has tickets for (status active or used).
 * Use this instead of querying event_tickets.user_id — purchases live in purchased_event_tickets.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: tickets, error } = await supabase
      .from('purchased_event_tickets')
      .select('event_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'used']);

    if (error) {
      console.error('[booked-events-count]', error);
      return NextResponse.json(
        { error: 'Failed to fetch booked events count' },
        { status: 500, headers: corsHeaders }
      );
    }

    const distinctEventIds = new Set((tickets || []).map(t => t.event_id));
    const count = distinctEventIds.size;

    return NextResponse.json({ count }, { headers: corsHeaders });
  } catch (err) {
    console.error('[booked-events-count]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
