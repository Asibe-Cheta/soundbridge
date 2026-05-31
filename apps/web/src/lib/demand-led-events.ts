import type { SupabaseClient } from '@supabase/supabase-js';
import { sendExpoPush } from '@/src/lib/push-notifications';
import {
  LIVE_INTEREST_ABSOLUTE_THRESHOLD,
  LIVE_INTEREST_FOLLOWER_RATIO,
  THRESHOLD_COOLDOWN_DAYS,
  meetsLiveInterestThreshold,
} from '@/src/lib/event-poll';

type CreatorThresholdRow = {
  creator_id: string;
  yes_count: number;
  followers_count: number | null;
};

export async function expirePollCampaigns(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('poll_campaigns')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}

async function fetchCreatorThresholdRows(supabase: SupabaseClient): Promise<CreatorThresholdRow[]> {
  const { data: tracks, error: tracksError } = await supabase
    .from('audio_tracks')
    .select('id, creator_id');

  if (tracksError) throw tracksError;
  if (!tracks?.length) return [];

  const trackIds = tracks.map((t) => t.id);
  const creatorByTrack = new Map(tracks.map((t) => [t.id, t.creator_id]));

  const yesByCreator = new Map<string, Set<string>>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data: responses, error } = await supabase
      .from('live_interest_responses')
      .select('user_id, track_id')
      .eq('responded_yes', true)
      .in('track_id', trackIds)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!responses?.length) break;

    for (const row of responses) {
      if (!row.user_id || !row.track_id) continue;
      const creatorId = creatorByTrack.get(row.track_id);
      if (!creatorId) continue;
      if (!yesByCreator.has(creatorId)) yesByCreator.set(creatorId, new Set());
      yesByCreator.get(creatorId)!.add(row.user_id);
    }

    if (responses.length < pageSize) break;
    from += pageSize;
  }

  const creatorIds = [...yesByCreator.keys()];
  if (!creatorIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, followers_count')
    .in('id', creatorIds);

  if (profilesError) throw profilesError;

  const followersByCreator = new Map(
    (profiles ?? []).map((p) => [p.id, Number(p.followers_count ?? 0)]),
  );

  return creatorIds.map((creator_id) => ({
    creator_id,
    yes_count: yesByCreator.get(creator_id)?.size ?? 0,
    followers_count: followersByCreator.get(creator_id) ?? 0,
  }));
}

async function wasNotifiedRecently(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - THRESHOLD_COOLDOWN_DAYS);

  const { data } = await supabase
    .from('interest_threshold_notifications')
    .select('notified_at')
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (!data?.notified_at) return false;
  return new Date(data.notified_at) > cutoff;
}

async function pushEnabled(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return true;
  return data.enabled !== false;
}

export async function runLiveInterestThresholdCheck(supabase: SupabaseClient): Promise<{
  notified: number;
  skipped: number;
  errors: string[];
}> {
  const rows = await fetchCreatorThresholdRows(supabase);
  let notified = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const followers = Number(row.followers_count ?? 0);
    if (!meetsLiveInterestThreshold(row.yes_count, followers)) {
      skipped++;
      continue;
    }

    if (await wasNotifiedRecently(supabase, row.creator_id)) {
      skipped++;
      continue;
    }

    const title = 'Your audience wants you live';
    const body = `${row.yes_count} people have said they want to hear your music live. It is time to ask them when and where.`;
    const metadata = { screen: 'CreatorInsightsDashboard', tab: 'event-poll' };

    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: row.creator_id,
      type: 'live_interest_threshold',
      title,
      body,
      metadata,
    });

    if (notifError) {
      errors.push(`${row.creator_id}: ${notifError.message}`);
      continue;
    }

    if (await pushEnabled(supabase, row.creator_id)) {
      try {
        await sendExpoPush(supabase, row.creator_id, {
          title,
          body: `${row.yes_count} people have said they want to hear your music live.`,
          data: metadata,
          channelId: 'social',
          priority: 'high',
        });
      } catch (e) {
        errors.push(`${row.creator_id} push: ${(e as Error).message}`);
      }
    }

    const { error: upsertError } = await supabase
      .from('interest_threshold_notifications')
      .upsert(
        {
          creator_id: row.creator_id,
          yes_count: row.yes_count,
          notified_at: new Date().toISOString(),
        },
        { onConflict: 'creator_id' },
      );

    if (upsertError) {
      errors.push(`${row.creator_id} upsert: ${upsertError.message}`);
      continue;
    }

    notified++;
  }

  return { notified, skipped, errors };
}

export const THRESHOLD_DOC = {
  absoluteMinimum: LIVE_INTEREST_ABSOLUTE_THRESHOLD,
  followerRatio: LIVE_INTEREST_FOLLOWER_RATIO,
  cooldownDays: THRESHOLD_COOLDOWN_DAYS,
};
