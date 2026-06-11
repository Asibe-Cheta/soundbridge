/**
 * Suspicious track query (FRAUD_DETECTION_SQL.MD Task 1) — app-layer equivalent of fraud_suspicious_tracks_query.sql
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type SuspiciousTrackRow = {
  track_id: string;
  creator_id: string;
  creator_email: string | null;
  creator_name: string;
  track_title: string;
  total_play_count: number;
  unique_listener_count: number;
  unique_ip_count: number;
  play_to_listener_ratio: number;
  analysis_id: string | null;
  fraud_status: string | null;
  warning_email_sent: boolean;
};

const MIN_PLAYS = 100;
const MAX_UNIQUE_LISTENERS = 3;
const MIN_RATIO = 50;

export function matchesSuspiciousPattern(
  totalPlays: number,
  uniqueListeners: number,
): boolean {
  if (totalPlays <= MIN_PLAYS) return false;
  const ratio = uniqueListeners > 0 ? totalPlays / uniqueListeners : totalPlays;
  return uniqueListeners <= MAX_UNIQUE_LISTENERS || ratio > MIN_RATIO;
}

export async function getSuspiciousTrackCreators(
  service: SupabaseClient,
): Promise<SuspiciousTrackRow[]> {
  const { data: tracks, error } = await service
    .from('audio_tracks')
    .select('id, title, creator_id, play_count')
    .gt('play_count', MIN_PLAYS)
    .order('play_count', { ascending: false })
    .limit(300);

  if (error || !tracks?.length) return [];

  const creatorIds = [...new Set(tracks.map((t) => t.creator_id).filter(Boolean))];
  const trackIds = tracks.map((t) => t.id);

  const [{ data: profiles }, { data: analysisRows }] = await Promise.all([
    service.from('profiles').select('id, username, display_name').in('id', creatorIds),
    service
      .from('creator_fraud_analysis')
      .select('id, track_id, fraud_status, warning_email_sent, analysis_date')
      .in('track_id', trackIds)
      .order('analysis_date', { ascending: false }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const analysisByTrack = new Map<string, (typeof analysisRows extends (infer R)[] | null ? R : never)>();
  for (const row of analysisRows ?? []) {
    if (row.track_id && !analysisByTrack.has(row.track_id)) {
      analysisByTrack.set(row.track_id, row);
    }
  }

  const emailMap = new Map<string, string | null>();
  await Promise.all(
    creatorIds.map(async (id) => {
      const { data } = await service.auth.admin.getUserById(id);
      emailMap.set(id, data.user?.email ?? null);
    }),
  );

  const results: SuspiciousTrackRow[] = [];

  for (const track of tracks) {
    const { data: sessions } = await service
      .from('play_sessions')
      .select('user_id, ip_address')
      .eq('track_id', track.id)
      .eq('is_rejected', false);

    const uniqueListeners = new Set((sessions ?? []).map((s) => s.user_id).filter(Boolean)).size;
    const uniqueIps = new Set(
      (sessions ?? []).map((s) => s.ip_address).filter((ip) => ip && String(ip).trim()),
    ).size;
    const totalPlays = Number(track.play_count ?? 0);
    const ratio =
      Math.round((uniqueListeners > 0 ? totalPlays / uniqueListeners : totalPlays) * 100) / 100;

    if (!matchesSuspiciousPattern(totalPlays, uniqueListeners)) continue;

    const profile = profileMap.get(track.creator_id);
    const analysis = analysisByTrack.get(track.id);

    results.push({
      track_id: track.id,
      creator_id: track.creator_id,
      creator_email: emailMap.get(track.creator_id) ?? null,
      creator_name: profile?.display_name || profile?.username || 'Creator',
      track_title: track.title ?? 'Untitled',
      total_play_count: totalPlays,
      unique_listener_count: uniqueListeners,
      unique_ip_count: uniqueIps,
      play_to_listener_ratio: ratio,
      analysis_id: analysis?.id ?? null,
      fraud_status: analysis?.fraud_status ?? null,
      warning_email_sent: Boolean(analysis?.warning_email_sent),
    });
  }

  return results.sort((a, b) => b.total_play_count - a.total_play_count);
}
