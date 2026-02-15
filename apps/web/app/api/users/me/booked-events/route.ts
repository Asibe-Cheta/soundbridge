import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/users/me/booked-events
 * Returns the list of events the user has tickets for (status active or used).
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

    const { data: tickets, error: ticketsError } = await supabase
      .from('purchased_event_tickets')
      .select(`
        event_id,
        ticket_code,
        quantity,
        status,
        purchase_date
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'used']);

    if (ticketsError || !tickets?.length) {
      return NextResponse.json(
        { items: [], total: 0 },
        { headers: corsHeaders }
      );
    }

    const eventIds = [...new Set(tickets.map(t => t.event_id))];

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_date,
        location,
        venue,
        category,
        image_url,
        creator_id,
        creator:profiles!events_creator_id_fkey(id, username, display_name, avatar_url)
      `)
      .in('id', eventIds)
      .order('event_date', { ascending: true });

    if (eventsError) {
      console.error('[booked-events]', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500, headers: corsHeaders }
      );
    }

    const ticketCountByEvent = new Map<string, number>();
    for (const t of tickets) {
      ticketCountByEvent.set(t.event_id, (ticketCountByEvent.get(t.event_id) || 0) + (t.quantity || 1));
    }

    const items = (events || []).map(e => ({
      ...e,
      ticket_quantity: ticketCountByEvent.get(e.id) ?? 1,
    }));

    return NextResponse.json(
      { items, total: items.length },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('[booked-events]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
