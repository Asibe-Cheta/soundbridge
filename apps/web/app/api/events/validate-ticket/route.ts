import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/events/validate-ticket
 * Validate a ticket code for event entry (used by event organizers/door staff)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { ticketCode } = body;

    // Validate required fields
    if (!ticketCode) {
      return NextResponse.json(
        { error: 'Missing required field: ticketCode' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Lookup ticket by code
    const { data: ticket, error: ticketError } = await supabase
      .from('purchased_event_tickets')
      .select(`
        *,
        event:events(
          id,
          title,
          event_date,
          location,
          creator_id
        ),
        user:profiles!purchased_event_tickets_user_id_fkey(
          id,
          display_name,
          username,
          email
        )
      `)
      .eq('ticket_code', ticketCode)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Invalid ticket code',
        },
        { headers: corsHeaders }
      );
    }

    // Check if ticket is active (not refunded or cancelled)
    if (ticket.status !== 'active' && ticket.status !== 'used') {
      return NextResponse.json(
        {
          valid: false,
          message: `Ticket is ${ticket.status}`,
        },
        { headers: corsHeaders }
      );
    }

    // Check if requesting user is the event organizer (authorization)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('creator_id')
      .eq('id', ticket.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Only event organizer can validate tickets
    if (event.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to validate tickets for this event' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Use service role client for updates
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If ticket is not yet used, mark it as used (first-time scan)
    let isFirstScan = false;
    if (ticket.status === 'active') {
      isFirstScan = true;
      const { error: updateError } = await supabaseAdmin
        .from('purchased_event_tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          validated_by: user.id,
        })
        .eq('id', ticket.id);

      if (updateError) {
        console.error('Error updating ticket status:', updateError);
        // Continue even if update fails
      }
    }

    // Format response
    return NextResponse.json(
      {
        valid: true,
        ticket: {
          id: ticket.id,
          event_id: ticket.event_id,
          ticket_code: ticket.ticket_code,
          quantity: ticket.quantity,
          status: isFirstScan ? 'used' : ticket.status,
          purchase_date: ticket.purchase_date,
          used_at: isFirstScan ? new Date().toISOString() : ticket.used_at,
          user: ticket.user ? {
            id: ticket.user.id,
            display_name: ticket.user.display_name || ticket.user.username,
            email: ticket.user.email,
          } : null,
          event: ticket.event ? {
            id: ticket.event.id,
            title: ticket.event.title,
            event_date: ticket.event.event_date,
            location: ticket.event.location,
          } : null,
        },
        message: isFirstScan 
          ? 'Valid ticket - Entry granted' 
          : `Ticket already scanned at ${ticket.used_at ? new Date(ticket.used_at).toLocaleString() : 'unknown time'}`,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error validating ticket:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate ticket',
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
