import { NextRequest, NextResponse } from 'next/server';
import { eventNotificationService } from '@/src/services/EventNotificationService';

/** Vercel cron uses CRON_SECRET; GitHub Actions may send SUPABASE_SERVICE_ROLE_KEY only. Accept either. */
function isSendQueuedAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice('Bearer '.length).trim();
  const secrets = [process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY].filter(
    (s): s is string => typeof s === 'string' && s.length > 0
  );
  return secrets.some((s) => token === s);
}

/**
 * POST /api/notifications/send-queued
 * Send queued event notifications via Expo Push API
 * This endpoint should be called by a cron job every 15 minutes
 * 
 * Security: Requires authorization header with service key
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSendQueuedAuthorized(request)) {
      console.error('❌ Unauthorized access attempt to send-queued endpoint');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📤 Starting queued notification send job...');

    // Match /api/cron/send-event-push-queue: drain both event + track queues (GitHub Actions calls this route).
    const eventResult = await eventNotificationService.sendQueuedNotifications();
    const trackResult = await eventNotificationService.sendQueuedTrackNotifications();

    const success = eventResult.success && trackResult.success;
    const sentCount = eventResult.sent_count + trackResult.sent_count;
    const failedCount = eventResult.failed_count + trackResult.failed_count;

    if (!success) {
      return NextResponse.json(
        {
          error: 'Failed to send one or more queued notification batches',
          sent_count: sentCount,
          failed_count: failedCount,
          event_notifications: eventResult,
          track_notifications: trackResult,
        },
        { status: 500 }
      );
    }

    console.log(
      `✅ Notification send job complete: ${sentCount} sent, ${failedCount} failed (event + track)`
    );

    return NextResponse.json({
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      event_notifications: eventResult,
      track_notifications: trackResult,
      message: `Successfully sent ${sentCount} notifications, ${failedCount} failed`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/notifications/send-queued:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/** Pro/Enterprise: allow long Expo push batches. Hobby remains capped at 60s—keep queues small or upgrade. */
export const maxDuration = 300;

/**
 * GET /api/notifications/send-queued
 * Check status of queued notifications (for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSendQueuedAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Supabase admin client
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get stats about queued notifications
    const { data: queuedStats, error: statsError } = await supabaseAdmin
      .from('event_notifications')
      .select('status, notification_type')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString());

    if (statsError) {
      console.error('Error fetching queued stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: statsError.message },
        { status: 500 }
      );
    }

    const queuedCount = queuedStats?.length || 0;

    return NextResponse.json({
      success: true,
      queued_ready_to_send: queuedCount,
      timestamp: new Date().toISOString(),
      message: queuedCount > 0 ? `${queuedCount} notifications ready to send` : 'No notifications queued',
    });
  } catch (error) {
    console.error('Error in GET /api/notifications/send-queued:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

