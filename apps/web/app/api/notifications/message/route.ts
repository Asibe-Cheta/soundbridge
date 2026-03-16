/**
 * API Endpoint: Instant Message Push Notification
 * POST /api/notifications/message
 *
 * Sends a push notification immediately after a message is sent.
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { getPushToken } from '@/src/lib/push-notifications';

export async function POST(request: NextRequest) {
  try {
    const { supabase: authClient, user } = await getSupabaseRouteClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: message, error: messageError } = await adminClient
      .from('messages')
      .select('id, sender_id, recipient_id, content')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (message.sender_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized message access' },
        { status: 403 }
      );
    }

    // Prefer notification_preferences (aligned with mobile); fallback to user_notification_preferences
    let messageNotificationsEnabled: boolean | null = null;
    const { data: np } = await adminClient
      .from('notification_preferences')
      .select('message_notifications_enabled')
      .eq('user_id', message.recipient_id)
      .single();
    if (np?.message_notifications_enabled !== undefined) messageNotificationsEnabled = np.message_notifications_enabled;
    if (messageNotificationsEnabled === null) {
      const { data: unp } = await adminClient
        .from('user_notification_preferences')
        .select('message_notifications_enabled')
        .eq('user_id', message.recipient_id)
        .single();
      if (unp?.message_notifications_enabled !== undefined) messageNotificationsEnabled = unp.message_notifications_enabled;
    }
    if (messageNotificationsEnabled === false) {
      return NextResponse.json({ sent: false, reason: 'Notifications disabled' });
    }

    // Prefer profiles.expo_push_token then user_push_tokens (same as other push flows; fixes DM pushes when app writes only to profiles)
    const pushToken = await getPushToken(adminClient, message.recipient_id);
    if (!pushToken) {
      return NextResponse.json({ sent: false, reason: 'No valid push token' });
    }

    const { data: sender } = await adminClient
      .from('profiles')
      .select('display_name, username')
      .eq('id', message.sender_id)
      .single();

    const senderName = sender?.display_name || sender?.username || 'Someone';
    const conversationId = [message.sender_id, message.recipient_id].sort().join('_');
    const title = senderName;
    const body = (message.content || '').substring(0, 80);
    const payload = {
      type: 'message',
      entityId: conversationId,
      userId: message.sender_id,
      messageId: message.id,
      senderId: message.sender_id,
      conversationId,
    };

    const tickets = await expo.sendPushNotificationsAsync([
      {
        to: pushToken,
        sound: 'default',
        priority: 'high',
        title,
        body,
        data: payload,
        channelId: 'messages',
      },
    ]);

    const ticket = tickets[0];
    const updateBase = {
      title,
      body,
      data: payload,
      error: ticket?.status === 'ok' ? null : ticket?.message || 'Expo push failed',
      expo_receipt_id: ticket?.status === 'ok' ? ticket.id : null,
      status: ticket?.status === 'ok' ? 'sent' : 'failed',
      sent_at: ticket?.status === 'ok' ? new Date().toISOString() : null,
    };

    const { data: updated } = await adminClient
      .from('scheduled_notifications')
      .update(updateBase)
      .eq('user_id', message.recipient_id)
      .eq('notification_type', 'message')
      .eq('status', 'pending')
      .filter('data->>messageId', 'eq', message.id)
      .select('id')
      .limit(1)
      .single();

    if (!updated) {
      await adminClient
        .from('scheduled_notifications')
        .insert({
          user_id: message.recipient_id,
          notification_type: 'message',
          title,
          body,
          data: payload,
          scheduled_for: new Date().toISOString(),
          status: updateBase.status,
          sent_at: updateBase.sent_at,
          expo_receipt_id: updateBase.expo_receipt_id,
          error: updateBase.error,
        });
    }

    return NextResponse.json({ sent: ticket?.status === 'ok', ticket });
  } catch (error: any) {
    console.error('❌ Instant message notification failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
