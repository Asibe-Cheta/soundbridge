/**
 * Bulk "creator went live" push to all followers. Follows the batched
 * pattern proven in scripts/broadcast-push-missing-avatar.mjs (raw fetch to
 * Expo's HTTP API, 100 messages/request, paginated Supabase reads) rather
 * than the slower per-recipient sequential loop used by the existing
 * /api/internal/push/live-session-started route (Agora feature) — that
 * route would be slow for a creator with a large following.
 *
 * Only reads profiles.expo_push_token (not the user_push_tokens fallback) —
 * same simplification the broadcast script already makes for bulk sends, to
 * keep this to one paginated query instead of one lookup per follower.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidExpoPushToken } from '@/src/lib/expo-push-client';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;
const PREFERENCE_CHUNK_SIZE = 500;

interface FollowerTarget {
  id: string;
  expo_push_token: string;
}

async function fetchFollowerIds(supabase: SupabaseClient, creatorId: string): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', creatorId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('[live-stream-notifications] follows page fetch failed:', error.message);
      break;
    }
    if (!data?.length) break;

    for (const row of data as { follower_id: string }[]) ids.push(row.follower_id);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return ids;
}

/** Two-step (follower ids, then profiles by id) rather than an embedded join —
 * avoids depending on an exact FK constraint name for the follows->profiles relation. */
async function fetchFollowersWithPushTokens(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<FollowerTarget[]> {
  const followerIds = await fetchFollowerIds(supabase, creatorId);
  if (followerIds.length === 0) return [];

  const targets: FollowerTarget[] = [];
  for (let i = 0; i < followerIds.length; i += PREFERENCE_CHUNK_SIZE) {
    const chunk = followerIds.slice(i, i + PREFERENCE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .in('id', chunk)
      .not('expo_push_token', 'is', null);
    if (error) {
      console.error('[live-stream-notifications] profiles chunk fetch failed:', error.message);
      continue;
    }
    for (const row of (data as { id: string; expo_push_token: string | null }[]) || []) {
      if (row.expo_push_token && isValidExpoPushToken(row.expo_push_token)) {
        targets.push({ id: row.id, expo_push_token: row.expo_push_token });
      }
    }
  }
  return targets;
}

async function filterOptedOut(supabase: SupabaseClient, targets: FollowerTarget[]): Promise<FollowerTarget[]> {
  const optedOutIds = new Set<string>();

  for (let i = 0; i < targets.length; i += PREFERENCE_CHUNK_SIZE) {
    const chunk = targets.slice(i, i + PREFERENCE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('user_id, enabled')
      .in('user_id', chunk.map((t) => t.id));
    if (error) {
      console.error('[live-stream-notifications] preferences chunk fetch failed:', error.message);
      continue;
    }
    for (const row of (data as { user_id: string; enabled?: boolean }[]) || []) {
      if (row.enabled === false) optedOutIds.add(row.user_id);
    }
  }

  return targets.filter((t) => !optedOutIds.has(t.id));
}

async function sendBatch(expoAccessToken: string, batch: unknown[]) {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${expoAccessToken}`,
    },
    body: JSON.stringify(batch),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Expo push HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
}

/**
 * Fire-and-forget from the start-stream route — never let a push failure
 * affect whether the stream actually starts.
 */
export async function notifyFollowersLiveStreamStarted(
  supabase: SupabaseClient,
  params: { creatorId: string; creatorName: string; liveStreamId: string },
): Promise<void> {
  try {
    const expoAccessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
    if (!expoAccessToken) {
      console.error('[live-stream-notifications] EXPO_ACCESS_TOKEN not configured — skipping broadcast');
      return;
    }

    const allTargets = await fetchFollowersWithPushTokens(supabase, params.creatorId);
    const targets = await filterOptedOut(supabase, allTargets);
    if (targets.length === 0) return;

    const messages = targets.map((t) => ({
      to: t.expo_push_token,
      title: `${params.creatorName} is live now`,
      body: 'Tap to watch and join the conversation.',
      data: {
        type: 'live_stream',
        liveStreamId: params.liveStreamId,
        creatorId: params.creatorId,
        url: `soundbridge://live/${params.liveStreamId}`,
      },
      sound: 'default',
    }));

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        await sendBatch(expoAccessToken, batch);
      } catch (err) {
        console.error('[live-stream-notifications] batch send failed:', err);
      }
    }
  } catch (err) {
    console.error('[live-stream-notifications] notifyFollowersLiveStreamStarted failed:', err);
  }
}
