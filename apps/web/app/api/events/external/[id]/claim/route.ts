import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { eventNotificationService } from '@/src/services/EventNotificationService';

/**
 * POST /api/events/external/:id/claim
 * Graduates an external_events row into events and queues discovery notifications.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: externalId } = await params;
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!externalId) {
      return NextResponse.json({ success: false, message: 'Event id required' }, { status: 400 });
    }

    const { data: newEventId, error: rpcError } = await supabase.rpc('claim_external_event', {
      p_external_event_id: externalId,
      p_user_id: user.id,
    });

    if (rpcError) {
      const msg = rpcError.message ?? '';
      if (msg.includes('ALREADY_CLAIMED')) {
        return NextResponse.json(
          { success: false, message: 'Already claimed' },
          { status: 409 }
        );
      }
      if (msg.includes('NOT_FOUND')) {
        return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
      }
      if (msg.includes('FORBIDDEN')) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
      console.error('claim_external_event RPC error', rpcError);
      return NextResponse.json(
        { success: false, message: 'Could not claim event', details: rpcError.message },
        { status: 500 }
      );
    }

    if (!newEventId) {
      return NextResponse.json({ success: false, message: 'No event created' }, { status: 500 });
    }

    const queueResult = await eventNotificationService.queueNotificationsForEvent(newEventId);

    if (!queueResult.success) {
      console.error('Claim succeeded but notification queue failed', queueResult.error);
    }

    return NextResponse.json({
      success: true,
      event_id: newEventId,
      queued_count: queueResult.queued_count,
    });
  } catch (error) {
    console.error('POST /api/events/external/[id]/claim', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
