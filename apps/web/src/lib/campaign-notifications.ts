/**
 * Marketing campaign push notifications — deep-link into the mobile team's `campaigns/<id>`
 * in-app screens via `type: 'campaign'` + `campaignId` (WEB_TEAM_IG_LIVE_CAMPAIGN.MD,
 * WEB_TEAM_VIDEO_AND_EARNING_CAMPAIGNS.MD). Two shapes share the send primitives below:
 *  - the IG Live promo: a fixed 14-entry date schedule (Aug 22 - Sep 4, 2026), driven by the
 *    daily cron in app/api/cron/send-campaign-notifications.
 *  - one-off campaigns (video-content-teaser, earning-reminder): a small catalog, triggered
 *    manually via app/api/campaigns/send-one-off — no schedule, sent once on request.
 *
 * Broadcast follows the same paginated-profiles + EXPO_ACCESS_TOKEN bearer pattern as
 * live-stream-notifications.ts (the current working bulk-send path — the older
 * supabase/functions/send-event-notifications helper predates Expo's mandatory push auth
 * token and would fail sends today).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidExpoPushToken } from '@/src/lib/expo-push-client';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;
const PREFERENCE_CHUNK_SIZE = 500;

export type CampaignAudience = 'all' | 'creators';

export const IG_LIVE_CAMPAIGN_ID = 'ig-live-sept4';

export interface CampaignScheduleEntry {
  date: string; // YYYY-MM-DD, matched against the current UTC date
  title: string;
  body: string;
}

export const IG_LIVE_CAMPAIGN_SCHEDULE: CampaignScheduleEntry[] = [
  { date: '2026-08-22', title: "It's happening", body: "🎙️ Big one coming. Sept 4, we're going live on Instagram to show you how creators get discovered & paid. Free. No catch." },
  { date: '2026-08-23', title: 'Sound familiar?', body: "Millions of streams. Barely any money. Sound familiar? We're fixing that Sept 4 — live on IG." },
  { date: '2026-08-24', title: "Something's been hidden", body: "There's a way creators are getting discovered that most artists don't know about yet. We're breaking it down Sept 4." },
  { date: '2026-08-25', title: "It's already working", body: "This isn't theory. Creators on SoundBridge are already getting tipped, booked, and discovered. Sept 4 we show you how." },
  { date: '2026-08-26', title: 'Ads not working?', body: "Spent money on ads and got nothing back? There's a better way to grow — and it's free." },
  { date: '2026-08-27', title: '8 days to go', body: '8 days to go. Sept 4, IG Live: how to finally earn from your craft.' },
  { date: '2026-08-28', title: 'Meet our guest', body: 'Joining us Sept 4: Babah Kay from The Mastermind Agency. He knows exactly what it takes to get noticed.' },
  { date: '2026-08-29', title: 'No fees, ever', body: 'No fees. No gatekeepers. Just a real path to getting paid for your music. Sept 4, IG Live.' },
  { date: '2026-08-30', title: '5 days left', body: '5 days left. Set your reminder — Sept 4, Instagram Live.' },
  { date: '2026-08-31', title: 'Why some break through', body: "Why do some creators break through while others don't? We're answering that Sept 4." },
  { date: '2026-09-01', title: '3 days', body: "3 days. This one's for every artist tired of doing everything right and still getting nowhere." },
  { date: '2026-09-02', title: '2 days to go', body: '2 days to go. Sept 4, 7:30 PM — mark it down.' },
  { date: '2026-09-03', title: 'Tomorrow', body: 'Tomorrow. IG Live. How creators get discovered and paid, explained.' },
  { date: '2026-09-04', title: "We're live tonight", body: "We're live tonight. Come through — this is the one you don't want to miss." },
];

/** Find today's entry by UTC date; null on any day outside the campaign window. */
export function todaysCampaignEntry(
  now: Date = new Date(),
  schedule: CampaignScheduleEntry[] = IG_LIVE_CAMPAIGN_SCHEDULE,
): CampaignScheduleEntry | null {
  const todayUtc = now.toISOString().slice(0, 10);
  return schedule.find((entry) => entry.date === todayUtc) ?? null;
}

interface PushTarget {
  id: string;
  expo_push_token: string;
}

async function fetchPushTargets(
  supabase: SupabaseClient,
  audience: CampaignAudience = 'all',
): Promise<PushTarget[]> {
  const targets: PushTarget[] = [];
  // Same device token can be left behind on more than one profile row (e.g. switching
  // test accounts on one phone) — dedupe on the token so that device isn't sent N copies.
  const seenTokens = new Set<string>();
  let from = 0;
  for (;;) {
    let query = supabase
      .from('profiles')
      .select('id, expo_push_token')
      .not('expo_push_token', 'is', null);
    if (audience === 'creators') {
      query = query.eq('role', 'creator');
    }
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('[campaign-notifications] profiles page fetch failed:', error.message);
      break;
    }
    if (!data?.length) break;

    for (const row of data as { id: string; expo_push_token: string | null }[]) {
      if (
        row.expo_push_token &&
        isValidExpoPushToken(row.expo_push_token) &&
        !seenTokens.has(row.expo_push_token)
      ) {
        seenTokens.add(row.expo_push_token);
        targets.push({ id: row.id, expo_push_token: row.expo_push_token });
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return targets;
}

/** Blanket notification opt-out only (no quiet-hours/quota gating — see doc: fixed daily send). */
async function filterOptedOut(supabase: SupabaseClient, targets: PushTarget[]): Promise<PushTarget[]> {
  const optedOutIds = new Set<string>();

  for (let i = 0; i < targets.length; i += PREFERENCE_CHUNK_SIZE) {
    const chunk = targets.slice(i, i + PREFERENCE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('user_id, enabled')
      .in('user_id', chunk.map((t) => t.id));

    if (error) {
      console.error('[campaign-notifications] preferences chunk fetch failed:', error.message);
      continue;
    }
    for (const row of (data as { user_id: string; enabled?: boolean }[]) || []) {
      if (row.enabled === false) optedOutIds.add(row.user_id);
    }
  }

  return targets.filter((t) => !optedOutIds.has(t.id));
}

async function sendBatch(expoAccessToken: string, batch: unknown[]): Promise<void> {
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

async function broadcastCampaignPush(
  supabase: SupabaseClient,
  campaignId: string,
  content: { title: string; body: string },
  audience: CampaignAudience,
): Promise<{ sent: number; optedOut: number }> {
  const expoAccessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (!expoAccessToken) {
    throw new Error('EXPO_ACCESS_TOKEN not configured');
  }

  const allTargets = await fetchPushTargets(supabase, audience);
  const targets = await filterOptedOut(supabase, allTargets);
  const optedOut = allTargets.length - targets.length;
  if (targets.length === 0) return { sent: 0, optedOut };

  const deepLink = `soundbridge://campaigns/${campaignId}`;
  const messages = targets.map((t) => ({
    to: t.expo_push_token,
    sound: 'default',
    title: content.title,
    body: content.body,
    data: {
      type: 'campaign',
      campaignId,
      deepLink,
      url: deepLink,
    },
  }));

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      await sendBatch(expoAccessToken, batch);
    } catch (err) {
      console.error('[campaign-notifications] batch send failed:', err);
    }
  }

  return { sent: messages.length, optedOut };
}

export async function sendCampaignPushToAllUsers(
  supabase: SupabaseClient,
  entry: CampaignScheduleEntry,
): Promise<{ sent: number; optedOut: number }> {
  return broadcastCampaignPush(supabase, IG_LIVE_CAMPAIGN_ID, entry, 'all');
}

/**
 * One-off campaigns (WEB_TEAM_TWO_NEW_CAMPAIGN_PUSH_NOTIFICATIONS.MD) — no date schedule,
 * sent once on request via app/api/campaigns/send-one-off.
 */
export interface OneOffCampaignEntry {
  title: string;
  body: string;
  audience: CampaignAudience;
}

export const ONE_OFF_CAMPAIGNS: Record<string, OneOffCampaignEntry> = {
  'video-content-teaser': {
    title: 'Video content soon available',
    body: 'Imagine getting tipped right on the spot for your video content. Look out for it.',
    audience: 'all',
  },
  'earning-reminder': {
    title: "People already earning. Don't sleep on it.",
    body: "Have you used the Tip Room yet? Tap to see how it — and your Digital Card — can get you paid.",
    // Tip Room and Digital Card are both creator-facing features; listener accounts have no
    // use for the CTA, so this one is scoped to creators (confirm before first real send).
    audience: 'creators',
  },
};

/** True if this one-off campaign has already gone out (any date) — one-off, not per-day like IG Live. */
export async function hasOneOffCampaignAlreadySent(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('campaign_notification_sends')
    .select('campaign_id')
    .eq('campaign_id', campaignId)
    .limit(1);
  if (error) {
    console.error('[campaign-notifications] one-off guard check failed:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function sendOneOffCampaign(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<{ sent: number; optedOut: number }> {
  const entry = ONE_OFF_CAMPAIGNS[campaignId];
  if (!entry) {
    throw new Error(`Unknown one-off campaign: ${campaignId}`);
  }
  return broadcastCampaignPush(supabase, campaignId, entry, entry.audience);
}

/** Single test push to one known token — bypasses audience/guard entirely (send-first-verify-tap). */
export async function sendOneOffCampaignTestPush(campaignId: string, expoPushToken: string): Promise<void> {
  const entry = ONE_OFF_CAMPAIGNS[campaignId];
  if (!entry) {
    throw new Error(`Unknown one-off campaign: ${campaignId}`);
  }
  if (!isValidExpoPushToken(expoPushToken)) {
    throw new Error('Invalid Expo push token');
  }
  const expoAccessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (!expoAccessToken) {
    throw new Error('EXPO_ACCESS_TOKEN not configured');
  }

  const deepLink = `soundbridge://campaigns/${campaignId}`;
  await sendBatch(expoAccessToken, [
    {
      to: expoPushToken,
      sound: 'default',
      title: entry.title,
      body: entry.body,
      data: { type: 'campaign', campaignId, deepLink, url: deepLink },
    },
  ]);
}
