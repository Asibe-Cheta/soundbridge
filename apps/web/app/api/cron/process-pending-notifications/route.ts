// Vercel Cron Job: Process Pending Event Notifications
// Runs every 5 minutes to send scheduled event notifications
// Endpoint: /api/cron/process-pending-notifications

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

function buildNotificationContent(notificationType: string, eventTitle?: string) {
  const safeTitle = eventTitle || 'Upcoming Event';

  switch (notificationType) {
    case 'two_weeks':
      return {
        title: 'Event in 2 weeks',
        body: `${safeTitle} is happening in 2 weeks.`,
      };
    case 'one_week':
      return {
        title: 'Event in 1 week',
        body: `${safeTitle} is happening in 1 week.`,
      };
    case '24_hours':
      return {
        title: 'Event tomorrow',
        body: `${safeTitle} is happening in 24 hours.`,
      };
    case 'event_day':
      return {
        title: 'Event today',
        body: `${safeTitle} is today.`,
      };
    default:
      return {
        title: `Event: ${safeTitle}`,
        body: `${safeTitle} is coming up.`,
      };
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔔 Process pending notifications cron job started');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: runLog } = await supabase
      .from('cron_job_runs')
      .insert({
        job_name: 'process_pending_notifications',
        status: 'running',
      })
      .select('id')
      .single();

    const { data: pendingNotifications, error: pendingError } = await supabase
      .from('scheduled_notifications')
      .select(`
        id,
        user_id,
        event_id,
        notification_type,
        title,
        body,
        data,
        scheduled_for,
        events (
          id,
          title,
          event_date,
          location
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);

    if (pendingError) {
      console.error('❌ Failed to fetch pending notifications:', pendingError);
      if (runLog?.id) {
        await supabase
          .from('cron_job_runs')
          .update({
            status: 'failed',
            error_message: pendingError.message,
            finished_at: new Date().toISOString(),
          })
          .eq('id', runLog.id);
      }
      return NextResponse.json(
        { success: false, error: pendingError.message },
        { status: 500 }
      );
    }

    if (!pendingNotifications?.length) {
      if (runLog?.id) {
        await supabase
          .from('cron_job_runs')
          .update({
            status: 'success',
            processed_count: 0,
            finished_at: new Date().toISOString(),
          })
          .eq('id', runLog.id);
      }
      return NextResponse.json({ success: true, processed: 0 });
    }

    const notificationIds = pendingNotifications.map((n) => n.id);
    await supabase
      .from('scheduled_notifications')
      .update({ status: 'processing' })
      .in('id', notificationIds);

    const userIds = Array.from(new Set(pendingNotifications.map((n) => n.user_id)));
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('user_id, push_token, last_used_at')
      .eq('active', true)
      .in('user_id', userIds)
      .order('last_used_at', { ascending: false });

    const tokenMap = new Map<string, string>();
    for (const token of tokens || []) {
      if (!tokenMap.has(token.user_id)) {
        tokenMap.set(token.user_id, token.push_token);
      }
    }

    const sendQueue: Array<{
      notificationId: string;
      message: ExpoPushMessage;
      title: string;
      body: string;
    }> = [];

    for (const notification of pendingNotifications) {
      const pushToken = tokenMap.get(notification.user_id);
      const eventTitle = (notification as any).events?.title;
      const isMessageNotification = notification.notification_type === 'message';
      const fallbackContent = buildNotificationContent(
        notification.notification_type,
        eventTitle
      );
      const title = notification.title || fallbackContent.title;
      const body = notification.body || fallbackContent.body;
      const payloadData = isMessageNotification
        ? (notification.data || {})
        : {
            type: 'event_reminder',
            eventId: notification.event_id,
            notificationType: notification.notification_type,
          };

      if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'failed',
            error: 'No valid push token',
            title,
            body,
          })
          .eq('id', notification.id);
        continue;
      }

      sendQueue.push({
        notificationId: notification.id,
        title,
        body,
        message: {
          to: pushToken,
          sound: 'default',
          title,
          body,
          data: payloadData,
          channelId: isMessageNotification ? 'messages' : 'events',
        },
      });
    }

    const messages = sendQueue.map((item) => item.message);
    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failCount = 0;
    let offset = 0;

    for (const chunk of chunks) {
      const chunkItems = sendQueue.slice(offset, offset + chunk.length);
      offset += chunk.length;

      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const { notificationId, title, body } = chunkItems[i];

          if (ticket.status === 'ok') {
            await supabase
              .from('scheduled_notifications')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                expo_receipt_id: ticket.id,
                title,
                body,
                error: null,
              })
              .eq('id', notificationId);
            successCount++;
          } else {
            await supabase
              .from('scheduled_notifications')
              .update({
                status: 'failed',
                error: ticket.message || 'Expo push failed',
                title,
                body,
              })
              .eq('id', notificationId);
            failCount++;
          }
        }
      } catch (chunkError: any) {
        console.error('Expo push error:', chunkError);
        for (const item of chunkItems) {
          await supabase
            .from('scheduled_notifications')
            .update({
              status: 'failed',
              error: chunkError?.message || 'Expo push failed',
              title: item.title,
              body: item.body,
            })
            .eq('id', item.notificationId);
        }
        failCount += chunkItems.length;
      }
    }

    if (runLog?.id) {
      await supabase
        .from('cron_job_runs')
        .update({
          status: 'success',
          processed_count: successCount,
          finished_at: new Date().toISOString(),
        })
        .eq('id', runLog.id);
    }

    console.log('✅ Process pending notifications completed');

    return NextResponse.json({
      success: true,
      processed: successCount + failCount,
      sent: successCount,
      failed: failCount,
    });
  } catch (error) {
    console.error('❌ process pending notifications cron job failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
