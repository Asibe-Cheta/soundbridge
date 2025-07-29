import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { status } = await request.json();

    if (!status || !['attending', 'interested', 'not_going'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be attending, interested, or not_going' },
        { status: 400 }
      );
    }

    // Check if event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, max_attendees, current_attendees')
      .eq('id', params.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check capacity if trying to attend
    if (status === 'attending' && event.max_attendees && event.current_attendees >= event.max_attendees) {
      return NextResponse.json(
        { error: 'Event is at full capacity' },
        { status: 400 }
      );
    }

    // Upsert RSVP
    const { error: rsvpError } = await supabase
      .from('event_attendees')
      .upsert({
        event_id: params.id,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString()
      });

    if (rsvpError) {
      console.error('RSVP error:', rsvpError);
      return NextResponse.json(
        { error: 'Failed to update RSVP' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RSVP API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Remove RSVP
    const { error: deleteError } = await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete RSVP error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove RSVP' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete RSVP API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's RSVP status for this event
    const { data: rsvp, error: rsvpError } = await supabase
      .from('event_attendees')
      .select('status, created_at')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (rsvpError && rsvpError.code !== 'PGRST116') {
      console.error('Error fetching RSVP:', rsvpError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch RSVP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rsvp: rsvp || null
    });

  } catch (error) {
    console.error('RSVP status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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

function isFeaturedEvent(event: any): boolean {
  return (event.current_attendees || 0) > 100;
}

function calculateEventRating(event: any): number {
  // Placeholder for rating calculation
  return 4.5 + Math.random() * 0.5;
} 