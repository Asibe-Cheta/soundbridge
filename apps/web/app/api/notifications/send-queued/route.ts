import { NextRequest, NextResponse } from 'next/server';
import { eventNotificationService } from '@/src/services/EventNotificationService';

/**
 * POST /api/notifications/send-queued
 * Send queued event notifications via Expo Push API
 * This endpoint should be called by a cron job every 15 minutes
 * 
 * Security: Requires authorization header with service key
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (cron job secret or service key)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized access attempt to send-queued endpoint');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📤 Starting queued notification send job...');

    // Send queued notifications
    const result = await eventNotificationService.sendQueuedNotifications();

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to send queued notifications',
          sent_count: result.sent_count,
          failed_count: result.failed_count,
        },
        { status: 500 }
      );
    }

    console.log(
      `✅ Notification send job complete: ${result.sent_count} sent, ${result.failed_count} failed`
    );

    return NextResponse.json({
      success: true,
      sent_count: result.sent_count,
      failed_count: result.failed_count,
      message: `Successfully sent ${result.sent_count} notifications, ${result.failed_count} failed`,
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

/**
 * GET /api/notifications/send-queued
 * Check status of queued notifications (for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
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

