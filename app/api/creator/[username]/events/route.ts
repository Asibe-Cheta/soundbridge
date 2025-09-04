import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolvedParams = await params;
    const { username } = resolvedParams;

    const supabase = createServiceClient();

    // First, get the creator's profile
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Get all events for this creator
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        location,
        price,
        attendee_count,
        created_at,
        updated_at,
        creator:profiles!events_creator_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('creator_id', creator.id)
      .order('event_date', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Format the events data
    const formattedEvents = (events || []).map(event => ({
      ...event,
      formatted_price: event.price === 0 ? 'Free' : `£${event.price}`,
      formatted_date: new Date(event.event_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }));

    return NextResponse.json({
      success: true,
      data: formattedEvents
    });

  } catch (error) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
