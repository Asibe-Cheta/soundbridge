/**
 * Shared "end a live stream" logic — called from the creator-initiated end
 * route, the 3hr-limit cron, and the Cloudflare disconnect webhook, so all
 * three paths behave identically (stop the Cloudflare input, mark the DB row
 * ended, send the creator their session summary).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { stopLiveInput } from '@/src/lib/cloudflare-stream';
import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';

export type EndLiveStreamReason = 'creator_ended' | 'duration_limit' | 'disconnected' | 'failed';

interface LiveStreamRow {
  id: string;
  user_id: string;
  cloudflare_stream_id: string;
  started_at: string;
  status: string;
}

function formatDuration(startedAt: string, endedAt: Date): string {
  const ms = endedAt.getTime() - new Date(startedAt).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** Idempotent — safe to call even if the stream was already ended by another path. */
export async function endLiveStream(
  supabase: SupabaseClient,
  liveStreamId: string,
  reason: EndLiveStreamReason,
): Promise<{ ended: boolean }> {
  const { data: stream } = await supabase
    .from('live_streams')
    .select('id, user_id, cloudflare_stream_id, started_at, status')
    .eq('id', liveStreamId)
    .maybeSingle<LiveStreamRow>();

  if (!stream || stream.status !== 'active') {
    return { ended: false };
  }

  const endedAt = new Date();
  const newStatus = reason === 'failed' ? 'failed' : 'ended';

  await supabase
    .from('live_streams')
    .update({ status: newStatus, ended_at: endedAt.toISOString() })
    .eq('id', liveStreamId)
    .eq('status', 'active');

  try {
    await stopLiveInput(stream.cloudflare_stream_id);
  } catch (err) {
    console.error('[live-stream-lifecycle] stopLiveInput failed:', err);
  }

  // Summary: total tips (creator's net share) received during the session.
  try {
    const { data: tips } = await supabase
      .from('tips')
      .select('creator_earnings')
      .eq('live_stream_id', liveStreamId)
      .eq('status', 'completed');
    const totalTips = (tips || []).reduce((sum, t: { creator_earnings?: number }) => sum + Number(t.creator_earnings || 0), 0);

    const durationText = formatDuration(stream.started_at, endedAt);
    const tipsText = totalTips > 0 ? ` and received $${totalTips.toFixed(2)} in tips` : '';

    await sendExpoPushIfAllowed(supabase, stream.user_id, 'live_stream', {
      title: 'Your stream has ended',
      body: `You streamed for ${durationText}${tipsText}. Great work.`,
      data: { type: 'live_stream_ended', liveStreamId },
    });
  } catch (err) {
    console.error('[live-stream-lifecycle] summary notification failed:', err);
  }

  return { ended: true };
}
