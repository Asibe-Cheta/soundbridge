import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const resolvedParams = await params;

    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:profiles!events_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          banner_url,
          bio,
          location,
          country,
          social_links
        ),
        attendees:event_attendees(
          user_id,
          status,
          created_at,
          updated_at,
          user:profiles(
            id,
            username,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('id', resolvedParams.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
      console.error('Event fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch event' },
        { status: 500 }
      );
    }

    // Transform event data
    const transformedEvent = {
      ...event,
      attendeeCount: event.attendees?.length || 0,
      attendingUsers: event.attendees?.filter((a: { status: string }) => a.status === 'attending') || [],
      interestedUsers: event.attendees?.filter((a: { status: string }) => a.status === 'interested') || [],
      formattedDate: formatEventDate(event.event_date),
      formattedPrice: formatPrice(event.price_gbp, event.price_ngn),
      isFeatured: isFeaturedEvent(event),
      rating: calculateEventRating()
    };

    return NextResponse.json({
      success: true,
      event: transformedEvent
    });
  } catch (error) {
    console.error('Event fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const resolvedParams = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user owns the event
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('creator_id')
      .eq('id', resolvedParams.id)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (existingEvent.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const updateData = await request.json();

    // Validate category if provided
    if (updateData.category) {
      const validCategories = [
        'Christian', 'Secular', 'Carnival', 'Gospel', 'Hip-Hop',
        'Afrobeat', 'Jazz', 'Classical', 'Rock', 'Pop', 'Other'
      ];

      if (!validCategories.includes(updateData.category)) {
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        );
      }
    }

    // Validate date if provided
    if (updateData.event_date) {
      const eventDate = new Date(updateData.event_date);
      if (isNaN(eventDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid event date' },
          { status: 400 }
        );
      }
    }

    // Update event
    const { data: event, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select(`
        *,
        creator:profiles!events_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          banner_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Event update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      );
    }

    // Transform event data
    const transformedEvent = {
      ...event,
      attendeeCount: 0,
      formattedDate: formatEventDate(event.event_date),
      formattedPrice: formatPrice(event.price_gbp, event.price_ngn),
      isFeatured: isFeaturedEvent(event),
      rating: calculateEventRating()
    };

    return NextResponse.json({
      success: true,
      event: transformedEvent
    });
  } catch (error) {
    console.error('Event update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const resolvedParams = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user owns the event
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('creator_id')
      .eq('id', resolvedParams.id)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (existingEvent.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete event
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', resolvedParams.id);

    if (deleteError) {
      console.error('Event delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays < 7) {
    return `${diffDays} days`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

function formatPrice(priceGbp: number | null, priceNgn: number | null): string {
  if (priceGbp === 0 && priceNgn === 0) {
    return 'Free Entry';
  }

  if (priceGbp && priceGbp > 0) {
    return `£${priceGbp}`;
  }

  if (priceNgn && priceNgn > 0) {
    return `₦${priceNgn.toLocaleString()}`;
  }

  return 'Free Entry';
}

function isFeaturedEvent(event: { current_attendees?: number }): boolean {
  return (event.current_attendees || 0) > 100;
}

function calculateEventRating(): number {
  return 4.5 + Math.random() * 0.5;
} 