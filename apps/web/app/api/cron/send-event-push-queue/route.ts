/**
 * Vercel Cron (GET): flush event_notifications rows (status=queued, due).
 * GitHub Actions also POSTs /api/notifications/send-queued; this avoids 15m gaps when using Vercel-only scheduling.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eventNotificationService } from '@/src/services/EventNotificationService';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[send-event-push-queue] CRON_SECRET not set');
    return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const eventResult = await eventNotificationService.sendQueuedNotifications();
  const trackResult = await eventNotificationService.sendQueuedTrackNotifications();

  const success = eventResult.success && trackResult.success;
  const sentCount = eventResult.sent_count + trackResult.sent_count;
  const failedCount = eventResult.failed_count + trackResult.failed_count;

  return NextResponse.json({
    success,
    sent_count: sentCount,
    failed_count: failedCount,
    event_notifications: eventResult,
    track_notifications: trackResult,
    timestamp: new Date().toISOString(),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Pro/Enterprise: long-running push drain. */
export const maxDuration = 300;
