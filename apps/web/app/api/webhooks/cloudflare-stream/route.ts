import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { verifyStreamWebhookSignature } from '@/src/lib/cloudflare-stream';
import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';

/**
 * Cloudflare Stream Live input events: live_input.connected /
 * live_input.disconnected. https://developers.cloudflare.com/stream/stream-live/webhooks
 *
 * Deliberately does NOT auto-end the stream on disconnect — a brief network
 * blip disconnecting and reconnecting within seconds is normal for mobile
 * broadcast, and ending immediately would kill the stream too aggressively.
 * Only notifies the creator. The 3hr-limit cron (live-streams-enforce-duration)
 * is the hard backstop that eventually ends anything left dangling.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('Webhook-Signature');

  const isValid = await verifyStreamWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    console.error('[webhooks/cloudflare-stream] invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: { data?: { input_id?: string; event_type?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const inputId = payload.data?.input_id;
  const eventType = payload.data?.event_type;
  if (!inputId || !eventType) {
    return NextResponse.json({ received: true });
  }

  if (eventType !== 'live_input.disconnected') {
    return NextResponse.json({ received: true });
  }

  try {
    const supabase = createServiceClient();
    const { data: stream } = await supabase
      .from('live_streams')
      .select('id, user_id')
      .eq('cloudflare_stream_id', inputId)
      .eq('status', 'active')
      .maybeSingle();

    if (stream) {
      await sendExpoPushIfAllowed(supabase, stream.user_id, 'live_stream', {
        title: 'Your stream disconnected',
        body: 'Reconnect your broadcast to keep streaming, or it will automatically end.',
        data: { type: 'live_stream_disconnected', liveStreamId: stream.id },
      });
    }
  } catch (err) {
    console.error('[webhooks/cloudflare-stream] disconnect handling failed:', err);
  }

  return NextResponse.json({ received: true });
}
