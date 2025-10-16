import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { eventNotificationService } from '@/src/services/EventNotificationService';

/**
 * POST /api/events/[id]/queue-notifications
 * Queue push notifications for users matching event criteria
 * Called when a featured event is created/published
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Verify event exists and user is the organizer
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, creator_id, organizer_id, is_featured, title')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Error fetching event:', eventError);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is the event creator/organizer
    const eventCreatorId = event.creator_id || event.organizer_id;
    if (eventCreatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the event organizer can queue notifications' },
        { status: 403 }
      );
    }

    // Check if event is featured
    if (!event.is_featured) {
      return NextResponse.json(
        {
          error: 'Only featured events can have notifications queued',
          message: 'Set is_featured=true on the event first',
        },
        { status: 400 }
      );
    }

    console.log(`📧 Queuing notifications for event: ${event.title} (${eventId})`);

    // Queue notifications using the service
    const result = await eventNotificationService.queueNotificationsForEvent(eventId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to queue notifications',
          details: result.error,
        },
        { status: 500 }
      );
    }

    console.log(`✅ Queued ${result.queued_count} notifications for event: ${eventId}`);

    return NextResponse.json({
      success: true,
      queued_count: result.queued_count,
      message: `Successfully queued ${result.queued_count} notifications`,
      event: {
        id: event.id,
        title: event.title,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/events/[id]/queue-notifications:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

