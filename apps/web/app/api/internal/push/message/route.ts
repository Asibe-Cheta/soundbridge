import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { getPushToken } from '@/src/lib/push-notifications';
import { getExpoPushClient } from '@/src/lib/expo-push-client';

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return Boolean(secret && token && token === secret);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { messageId } = await request.json();
    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: message } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content')
      .eq('id', messageId)
      .maybeSingle();

    if (!message?.recipient_id || !message?.sender_id) {
      return NextResponse.json({ sent: false, reason: 'message_not_found' });
    }

    // Keep fallback behavior aligned with existing API route and mobile preferences.
    let messageNotificationsEnabled: boolean | null = null;
    const { data: np } = await supabase
      .from('notification_preferences')
      .select('message_notifications_enabled')
      .eq('user_id', message.recipient_id)
      .maybeSingle();
    if (np?.message_notifications_enabled !== undefined) {
      messageNotificationsEnabled = np.message_notifications_enabled;
    }
    if (messageNotificationsEnabled === null) {
      const { data: unp } = await supabase
        .from('user_notification_preferences')
        .select('message_notifications_enabled')
        .eq('user_id', message.recipient_id)
        .maybeSingle();
      if (unp?.message_notifications_enabled !== undefined) {
        messageNotificationsEnabled = unp.message_notifications_enabled;
      }
    }
    if (messageNotificationsEnabled === false) {
      return NextResponse.json({ sent: false, reason: 'notifications_disabled' });
    }

    const pushToken = await getPushToken(supabase, message.recipient_id);
    if (!pushToken) {
      return NextResponse.json({ sent: false, reason: 'no_valid_push_token' });
    }

    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', message.sender_id)
      .maybeSingle();

    const senderName = sender?.display_name || sender?.username || 'Someone';
    const conversationId = [message.sender_id, message.recipient_id].sort().join('_');
    const body = (message.content || '').substring(0, 80) || 'Sent you a message';

    const tickets = await getExpoPushClient().sendPushNotificationsAsync([
      {
        to: pushToken,
        sound: 'default',
        priority: 'high',
        title: senderName,
        body,
        data: {
          type: 'message',
          entityId: conversationId,
          messageId: message.id,
          senderId: message.sender_id,
          conversationId,
        },
        channelId: 'messages',
      },
    ]);

    const ticket = tickets[0];
    return NextResponse.json({ sent: ticket?.status === 'ok', ticket });
  } catch (error) {
    console.error('[internal/push/message] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
