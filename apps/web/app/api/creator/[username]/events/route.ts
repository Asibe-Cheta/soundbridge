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
      .eq('username', username as any)
      .single() as { data: any; error: any };

    if (creatorError || !creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Get all events for this creator using the same query as getCreatorEvents
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:profiles!events_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          location,
          country
        ),
        attendees:event_attendees!event_attendees_event_id_fkey(count)
      `)
      .eq('creator_id', creator.id as any)
      .order('event_date', { ascending: false }) as { data: any; error: any };

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Transform the data to match Event interface (same as getCreatorEvents)
    const transformedData = (data || []).map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      creator_id: event.creator_id,
      event_date: event.event_date,
      location: event.location,
      venue: event.venue,
      latitude: event.latitude,
      longitude: event.longitude,
      category: event.category,
      price_gbp: event.price_gbp,
      price_ngn: event.price_ngn,
      max_attendees: event.max_attendees,
      current_attendees: event.current_attendees,
      attendee_count: event.attendees?.[0]?.count || 0,
      image_url: event.image_url,
      created_at: event.created_at,
      formatted_price: event.price_gbp === 0 ? 'Free' : `£${event.price_gbp}`,
      formatted_date: new Date(event.event_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      creator: event.creator ? {
        id: event.creator.id,
        username: event.creator.username,
        display_name: event.creator.display_name,
        avatar_url: event.creator.avatar_url,
        banner_url: null,
        location: event.creator.location,
        country: event.creator.country,
        bio: null,
        role: 'creator' as const,
        is_verified: false,
        social_links: {},
        created_at: '',
        updated_at: ''
      } : undefined
    }));

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
