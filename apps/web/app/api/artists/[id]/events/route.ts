import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Get upcoming events for a specific artist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const resolvedParams = await params;
    const artistId = resolvedParams.id;

    // Get artist's upcoming events using the database function
    const { data: events, error } = await supabase
      .rpc('get_artist_upcoming_events', {
        p_artist_id: artistId
      });

    if (error) {
      console.error('Error fetching artist events:', error);
      throw error;
    }

    // Enhance with additional details
    const enhancedEvents = await Promise.all(
      (events || []).map(async (event: any) => {
        // Get full event details
        const { data: eventDetails } = await supabase
          .from('events')
          .select(`
            *,
            creator:profiles!events_creator_id_fkey(
              id,
              display_name,
              avatar_url,
              username
            )
          `)
          .eq('id', event.event_id)
          .single();

        // Get all ticket types
        const { data: tickets } = await supabase
          .from('event_tickets')
          .select('*')
          .eq('event_id', event.event_id)
          .eq('is_active', true)
          .order('price_gbp', { ascending: true });

        // Get available bundles
        const { data: bundles } = await supabase
          .from('event_bundles')
          .select(`
            *,
            ticket:event_tickets(ticket_name, ticket_type)
          `)
          .eq('event_id', event.event_id)
          .eq('is_active', true);

        return {
          ...eventDetails,
          tickets: tickets || [],
          bundles: bundles || [],
          min_price: event.min_price,
          total_tickets_available: event.tickets_available,
        };
      })
    );

    return NextResponse.json({
      success: true,
      events: enhancedEvents,
      total: enhancedEvents.length
    });

  } catch (error) {
    console.error('Get artist events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

