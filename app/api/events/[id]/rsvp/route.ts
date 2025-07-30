import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
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

    const { status } = await request.json();

    // Validate status
    if (!['attending', 'interested', 'not_attending'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Check if RSVP already exists
    const { data: existingRsvp, error: checkError } = await supabase
      .from('event_attendees')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing RSVP:', checkError);
      return NextResponse.json(
        { success: false, error: 'Failed to check RSVP status' },
        { status: 500 }
      );
    }

    let result;
    if (existingRsvp) {
      // Update existing RSVP
      const { data: updatedRsvp, error: updateError } = await supabase
        .from('event_attendees')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', existingRsvp.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating RSVP:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update RSVP' },
          { status: 500 }
        );
      }

      result = updatedRsvp;
    } else {
      // Create new RSVP
      const { data: newRsvp, error: createError } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating RSVP:', createError);
        return NextResponse.json(
          { success: false, error: 'Failed to create RSVP' },
          { status: 500 }
        );
      }

      result = newRsvp;
    }

    return NextResponse.json({
      success: true,
      rsvp: result
    });

  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
    const eventId = resolvedParams.id;

    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete RSVP
    const { error: deleteError } = await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting RSVP:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete RSVP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'RSVP removed'
    });

  } catch (error) {
    console.error('RSVP delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
// Helper functions (unused but kept for future use)
function _formatEventDate(dateString: string): string {
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

function _formatPrice(priceGbp: number | null, priceNgn: number | null): string {
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

function _isFeaturedEvent(event: { current_attendees?: number }): boolean {
  return (event.current_attendees || 0) > 100;
}

function _calculateEventRating(_event: { current_attendees?: number }): number {
  // Placeholder for rating calculation
  return 4.5 + Math.random() * 0.5;
} 