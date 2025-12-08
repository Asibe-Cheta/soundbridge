import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/events/[id]/tickets
 * Get ticket sales for an event (organizer only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    // Verify user is the event creator
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, creator_id, price_gbp, price_ngn, max_attendees, current_attendees')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if user is the event creator
    if (event.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You are not the event organizer' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Fetch all tickets for this event
    const { data: tickets, error: ticketsError } = await supabase
      .from('purchased_event_tickets')
      .select(`
        id,
        ticket_code,
        quantity,
        amount_paid,
        currency,
        purchase_date,
        status,
        payment_intent_id,
        platform_fee_amount,
        organizer_amount,
        user_id,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('event_id', eventId)
      .order('purchase_date', { ascending: false });

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Calculate statistics
    const activeTickets = tickets?.filter(t => t.status === 'active' || t.status === 'used') || [];
    const totalRevenue = activeTickets.reduce((sum, t) => sum + (t.organizer_amount || 0), 0);
    const totalTicketsSold = activeTickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
    const refundedTickets = tickets?.filter(t => t.status === 'refunded') || [];
    const totalRefunded = refundedTickets.reduce((sum, t) => sum + (t.amount_paid || 0), 0);

    // Determine primary currency
    const primaryCurrency = event.price_gbp && event.price_gbp > 0 ? 'GBP' : 'NGN';

    // Format tickets for response
    const formattedTickets = tickets?.map(ticket => ({
      id: ticket.id,
      ticket_code: ticket.ticket_code,
      buyer_name: ticket.profiles?.full_name || 'Unknown',
      buyer_email: ticket.profiles?.email || '',
      quantity: ticket.quantity,
      amount_paid: ticket.amount_paid,
      currency: ticket.currency,
      organizer_amount: ticket.organizer_amount,
      platform_fee: ticket.platform_fee_amount,
      purchase_date: ticket.purchase_date,
      status: ticket.status,
      payment_intent_id: ticket.payment_intent_id,
    })) || [];

    return NextResponse.json(
      {
        event: {
          id: event.id,
          title: event.title,
          max_attendees: event.max_attendees,
          current_attendees: event.current_attendees,
        },
        statistics: {
          total_tickets_sold: totalTicketsSold,
          total_revenue: totalRevenue, // In smallest currency unit (pence/kobo)
          total_refunded: totalRefunded,
          active_tickets: activeTickets.length,
          refunded_tickets: refundedTickets.length,
          currency: primaryCurrency,
          remaining_capacity: event.max_attendees ? event.max_attendees - totalTicketsSold : null,
        },
        tickets: formattedTickets,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching event tickets:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch event tickets',
        details: error.message
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
