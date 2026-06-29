import type { SupabaseClient } from '@supabase/supabase-js';

export const FEATURE_NUDGE_TYPES = [
  'post_upload_distribution',
  'ai_career_adviser_deferred',
  'event_promotion',
  'signup_setup_checklist',
] as const;

export type FeatureNudgeType = (typeof FEATURE_NUDGE_TYPES)[number];

const AI_MIN_DAYS = 3;
const AI_EXPIRE_DAYS = 14;
const AI_MIN_PLAYS = 20;

export type AiAdviserNudgeStatus =
  | { eligible: false; reason: 'no_first_upload' | 'already_shown' | 'expired' | 'too_early' | 'no_qualifying_activity' }
  | { eligible: true; trackId: string | null; firstUploadAt: string };

export async function getCreatorTotalPlays(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from('audio_tracks')
    .select('play_count')
    .eq('creator_id', userId);

  return (data ?? []).reduce((sum, row) => sum + (Number(row.play_count) || 0), 0);
}

export async function creatorHasReceivedTip(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('tips')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('status', 'completed');

  return (count ?? 0) > 0;
}

export async function creatorHasRepeatListen(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: tracks } = await supabase
    .from('audio_tracks')
    .select('id')
    .eq('creator_id', userId);

  const trackIds = (tracks ?? []).map((t) => t.id);
  if (trackIds.length === 0) return false;

  const { count: signalCount } = await supabase
    .from('track_quality_signals')
    .select('track_id', { count: 'exact', head: true })
    .in('track_id', trackIds)
    .gt('repeat_listens', 0);

  if ((signalCount ?? 0) > 0) return true;

  const { data: sessions } = await supabase
    .from('play_sessions')
    .select('track_id, user_id')
    .in('track_id', trackIds)
    .not('user_id', 'is', null)
    .eq('is_valid', true)
    .limit(500);

  const seen = new Map<string, Set<string>>();
  for (const row of sessions ?? []) {
    if (!row.user_id) continue;
    const key = row.track_id;
    const users = seen.get(key) ?? new Set<string>();
    if (users.has(row.user_id)) return true;
    users.add(row.user_id);
    seen.set(key, users);
  }

  return false;
}

export async function hasQualifyingAiAdviserActivity(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ qualifies: boolean; totalPlays: number; hasTip: boolean; hasRepeatListen: boolean }> {
  const [totalPlays, hasTip, hasRepeatListen] = await Promise.all([
    getCreatorTotalPlays(supabase, userId),
    creatorHasReceivedTip(supabase, userId),
    creatorHasRepeatListen(supabase, userId),
  ]);

  return {
    qualifies: totalPlays >= AI_MIN_PLAYS || hasTip || hasRepeatListen,
    totalPlays,
    hasTip,
    hasRepeatListen,
  };
}

export async function getFirstUploadTrack(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ trackId: string; createdAt: string } | null> {
  const { data } = await supabase
    .from('audio_tracks')
    .select('id, created_at')
    .eq('creator_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.id || !data.created_at) return null;
  return { trackId: data.id, createdAt: data.created_at };
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

export async function evaluateAiAdviserNudge(
  supabase: SupabaseClient,
  userId: string,
): Promise<AiAdviserNudgeStatus> {
  const { data: existing } = await supabase
    .from('creator_context_nudges')
    .select('id, track_id, first_upload_at, shown_at, dismissed_at, expired_at')
    .eq('user_id', userId)
    .eq('nudge_type', 'ai_career_adviser_deferred')
    .maybeSingle();

  if (existing?.shown_at || existing?.dismissed_at) {
    return { eligible: false, reason: 'already_shown' };
  }
  if (existing?.expired_at) {
    return { eligible: false, reason: 'expired' };
  }

  const firstUpload = await getFirstUploadTrack(supabase, userId);
  if (!firstUpload) {
    return { eligible: false, reason: 'no_first_upload' };
  }

  const anchorAt = existing?.first_upload_at ?? firstUpload.createdAt;
  const elapsed = daysSince(anchorAt);

  if (elapsed >= AI_EXPIRE_DAYS) {
    if (existing?.id && !existing.expired_at) {
      await supabase
        .from('creator_context_nudges')
        .update({ expired_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
    return { eligible: false, reason: 'expired' };
  }

  if (elapsed < AI_MIN_DAYS) {
    return { eligible: false, reason: 'too_early' };
  }

  const activity = await hasQualifyingAiAdviserActivity(supabase, userId);
  if (!activity.qualifies) {
    if (elapsed >= AI_EXPIRE_DAYS) {
      return { eligible: false, reason: 'expired' };
    }
    return { eligible: false, reason: 'no_qualifying_activity' };
  }

  return {
    eligible: true,
    trackId: existing?.track_id ?? firstUpload.trackId,
    firstUploadAt: anchorAt,
  };
}

export async function ensureAiAdviserNudgeRow(
  supabase: SupabaseClient,
  userId: string,
  trackId: string,
  firstUploadAt: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('creator_context_nudges')
    .select('id')
    .eq('user_id', userId)
    .eq('nudge_type', 'ai_career_adviser_deferred')
    .maybeSingle();

  if (existing) return;

  await supabase.from('creator_context_nudges').insert({
    user_id: userId,
    nudge_type: 'ai_career_adviser_deferred',
    track_id: trackId,
    first_upload_at: firstUploadAt,
  });
}
