import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { incrementEventNotificationsOpened } from '@/src/lib/event-analytics';
import { recordEventPromotionInteraction } from '@/src/lib/event-promotion-tracking';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/events/notification-open
 * Body: { eventId: string, notificationId?: string }
 * Increments notifications_opened when user lands from push (?ref=notification).
 *
 * notificationId is the event_notifications.id the push payload already carries
 * (see EventNotificationService.sendQueuedNotifications' `data.notificationId`) —
 * when present, also marks that specific row clicked/clicked_at for the Item 50
 * Sent/Reached/Opened/Booked funnel (mobile reads event_notifications directly).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventId = typeof body.eventId === 'string' ? body.eventId : '';
    const notificationId = typeof body.notificationId === 'string' ? body.notificationId : '';

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400, headers: corsHeaders });
    }

    const service = createServiceClient();
    await incrementEventNotificationsOpened(service, eventId);

    if (notificationId) {
      const { error: clickError } = await service
        .from('event_notifications')
        .update({ clicked: true, clicked_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('event_id', eventId);
      if (clickError) {
        console.error('[events/notification-open] failed to mark notification clicked:', clickError);
      }
    }

    const { user, supabase } = await getSupabaseRouteClient(request, true);
    if (user) {
      await recordEventPromotionInteraction(supabase, user.id, eventId, 'notification');
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('[events/notification-open]', error);
    return NextResponse.json({ success: false }, { status: 500, headers: corsHeaders });
  }
}
