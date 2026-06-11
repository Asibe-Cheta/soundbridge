/**
 * Daily play-count fraud analysis — populates creator_fraud_analysis.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const FRAUD_JOB_VERSION = '2026-06-12-v2';

/** Displayed play_count vs recorded play_sessions — catches legacy client-side inflation. */
const MIN_PLAY_COUNT_FOR_INFLATION = 100;
const SESSION_COVERAGE_THRESHOLD = 0.1;

type PlayRow = {
  user_id: string | null;
  ip_address: string | null;
  played_at: string;
  is_suspicious: boolean;
  is_rejected: boolean;
};

type TrackAnalysisInput = {
  creatorId: string;
  trackId: string;
  trackTitle: string;
  plays: PlayRow[];
};

export type FraudSignalDetail = {
  play_to_listener_ratio?: { value: number; triggered: boolean; level: string };
  platform_ratio?: { value: number; triggered: boolean; threshold: number };
  ip_concentration?: { value: number; triggered: boolean; unique_ips: number };
  time_clustering?: { value: number; triggered: boolean; window_hours: number };
  play_count_inflation?: {
    value: number;
    coverage: number;
    triggered: boolean;
    display_play_count: number;
    all_time_sessions: number;
  };
};

export function detectPlayCountInflation(displayPlayCount: number, allTimeSessionCount: number) {
  const playCount = Math.max(0, Number(displayPlayCount) || 0);
  const sessions = Math.max(0, allTimeSessionCount);
  const coverage = playCount > 0 ? sessions / playCount : 1;
  const inflationRatio = playCount / Math.max(sessions, 1);
  const triggered = playCount >= MIN_PLAY_COUNT_FOR_INFLATION && coverage < SESSION_COVERAGE_THRESHOLD;

  return {
    value: Math.round(inflationRatio * 100) / 100,
    coverage: Math.round(coverage * 10000) / 10000,
    triggered,
    display_play_count: playCount,
    all_time_sessions: sessions,
  };
}

export function scoreFromSignals(signals: FraudSignalDetail): {
  fraudScore: number;
  fraudStatus: 'clean' | 'monitor' | 'flagged' | 'hold';
  payoutHeld: boolean;
} {
  let score = 0;

  const ratio = signals.play_to_listener_ratio;
  if (ratio?.triggered) {
    if (ratio.value > 10) score += 35;
    else if (ratio.value > 7) score += 28;
    else if (ratio.value > 3) score += 18;
    else score += 8;
  }

  if (signals.platform_ratio?.triggered) score += 25;
  if (signals.ip_concentration?.triggered) score += 22;
  if (signals.time_clustering?.triggered) score += 18;

  const inflation = signals.play_count_inflation;
  if (inflation?.triggered) {
    const pc = inflation.display_play_count ?? 0;
    if (pc >= 5000 || inflation.value >= 100) score += 80;
    else if (pc >= 1000) score += 65;
    else if (pc >= 500) score += 50;
    else score += 35;
  }

  score = Math.min(100, score);

  let fraudStatus: 'clean' | 'monitor' | 'flagged' | 'hold' = 'clean';
  if (score >= 76) fraudStatus = 'hold';
  else if (score >= 51) fraudStatus = 'flagged';
  else if (score >= 26) fraudStatus = 'monitor';

  const inflationHold =
    Boolean(inflation?.triggered) &&
    ((inflation?.display_play_count ?? 0) >= 500 || (inflation?.value ?? 0) >= 50);

  const payoutHeld =
    fraudStatus === 'hold' ||
    inflationHold ||
    (fraudStatus === 'flagged' && (ratio?.value ?? 0) > 10);

  return { fraudScore: score, fraudStatus, payoutHeld };
}

export function analyzeTrackPlays(
  plays: PlayRow[],
  platformUserCount: number,
  options?: { displayPlayCount?: number; allTimeSessionCount?: number },
): {
  totalPlays: number;
  uniqueListeners: number;
  playToListenerRatio: number;
  platformRatio: number;
  ipConcentrationScore: number;
  timeClusteringScore: number;
  suspiciousPlaysCount: number;
  rejectedPlaysCount: number;
  signals: FraudSignalDetail;
} {
  const eligible = plays.filter((p) => !p.is_rejected);
  const totalPlays = eligible.length;
  const uniqueListeners = new Set(eligible.map((p) => p.user_id).filter(Boolean)).size;
  const playToListenerRatio = uniqueListeners > 0 ? totalPlays / uniqueListeners : totalPlays;

  const platformRatio = platformUserCount > 0 ? totalPlays / platformUserCount : 0;

  const ipCounts = new Map<string, number>();
  for (const p of eligible) {
    if (!p.ip_address) continue;
    ipCounts.set(p.ip_address, (ipCounts.get(p.ip_address) ?? 0) + 1);
  }
  const uniqueIps = ipCounts.size;
  const topIpPlays = uniqueIps > 0 ? Math.max(...ipCounts.values()) : 0;
  const ipConcentrationScore = totalPlays > 0 ? topIpPlays / totalPlays : 0;

  let timeClusteringScore = 0;
  if (eligible.length >= 5) {
    const sorted = [...eligible].sort(
      (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime(),
    );
    const windowMs = 6 * 60 * 60 * 1000;
    let bestCluster = 0;
    for (let i = 0; i < sorted.length; i++) {
      const start = new Date(sorted[i].played_at).getTime();
      let count = 0;
      for (let j = i; j < sorted.length; j++) {
        if (new Date(sorted[j].played_at).getTime() - start <= windowMs) count++;
        else break;
      }
      bestCluster = Math.max(bestCluster, count);
    }
    timeClusteringScore = bestCluster / eligible.length;
  }

  const playCountInflation = detectPlayCountInflation(
    options?.displayPlayCount ?? totalPlays,
    options?.allTimeSessionCount ?? totalPlays,
  );

  const signals: FraudSignalDetail = {
    play_to_listener_ratio: {
      value: Math.round(playToListenerRatio * 100) / 100,
      triggered: playToListenerRatio > 3,
      level:
        playToListenerRatio > 10
          ? 'highly_suspicious'
          : playToListenerRatio > 7
            ? 'suspicious'
            : playToListenerRatio > 3
              ? 'elevated'
              : 'normal',
    },
    platform_ratio: {
      value: Math.round(platformRatio * 10000) / 10000,
      triggered: platformRatio > 0.3,
      threshold: 0.3,
    },
    ip_concentration: {
      value: Math.round(ipConcentrationScore * 10000) / 10000,
      triggered: uniqueIps > 0 && uniqueIps < 5 && ipConcentrationScore > 0.2,
      unique_ips: uniqueIps,
    },
    time_clustering: {
      value: Math.round(timeClusteringScore * 10000) / 10000,
      triggered: timeClusteringScore > 0.8,
      window_hours: 6,
    },
    play_count_inflation: playCountInflation,
  };

  return {
    totalPlays,
    uniqueListeners,
    playToListenerRatio: Math.round(playToListenerRatio * 100) / 100,
    platformRatio: Math.round(platformRatio * 10000) / 10000,
    ipConcentrationScore: Math.round(ipConcentrationScore * 10000) / 10000,
    timeClusteringScore: Math.round(timeClusteringScore * 10000) / 10000,
    suspiciousPlaysCount: plays.filter((p) => p.is_suspicious).length,
    rejectedPlaysCount: plays.filter((p) => p.is_rejected).length,
    signals,
  };
}

export async function runPlaycountFraudAnalysisJob(
  service: SupabaseClient,
  options?: { analysisDate?: string; creatorId?: string },
): Promise<{
  jobVersion: string;
  tracksAnalyzed: number;
  rowsUpserted: number;
  flagged: number;
  hold: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const analysisDate = options?.analysisDate ?? new Date().toISOString().slice(0, 10);
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { count: platformUserCount, error: userCountError } = await service
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (userCountError) errors.push(`platform user count: ${userCountError.message}`);
  const platformUsers = Math.max(platformUserCount ?? 1, 1);

  let tracksQuery = service
    .from('audio_tracks')
    .select('id, title, creator_id, play_count')
    .gte('play_count', 1)
    .order('play_count', { ascending: false })
    .limit(500);

  if (options?.creatorId) {
    tracksQuery = tracksQuery.eq('creator_id', options.creatorId);
  }

  const { data: tracks, error: tracksError } = await tracksQuery;
  if (tracksError) {
    errors.push(`tracks: ${tracksError.message}`);
    return { jobVersion: FRAUD_JOB_VERSION, tracksAnalyzed: 0, rowsUpserted: 0, flagged: 0, hold: 0, errors };
  }

  let rowsUpserted = 0;
  let flagged = 0;
  let hold = 0;

  for (const track of tracks ?? []) {
    const playCount = Number(track.play_count ?? 0);

    const { count: allTimeSessions, error: sessionCountError } = await service
      .from('play_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', track.id);

    if (sessionCountError) {
      errors.push(`session count ${track.id}: ${sessionCountError.message}`);
      continue;
    }

    const { data: plays, error: playsError } = await service
      .from('play_sessions')
      .select('user_id, ip_address, played_at, is_suspicious, is_rejected, is_valid')
      .eq('track_id', track.id)
      .gte('played_at', since.toISOString());

    if (playsError) {
      errors.push(`plays ${track.id}: ${playsError.message}`);
      continue;
    }

    const inflationOnly =
      playCount >= MIN_PLAY_COUNT_FOR_INFLATION &&
      detectPlayCountInflation(playCount, allTimeSessions ?? 0).triggered;

    if (!plays?.length && !inflationOnly) continue;

    const metrics = analyzeTrackPlays((plays ?? []) as PlayRow[], platformUsers, {
      displayPlayCount: playCount,
      allTimeSessionCount: allTimeSessions ?? 0,
    });
    let { fraudScore, fraudStatus, payoutHeld } = scoreFromSignals(metrics.signals);

    if (inflationOnly && fraudStatus === 'clean') {
      fraudStatus = 'hold';
      fraudScore = Math.max(fraudScore, 80);
      payoutHeld = true;
    }

    if (fraudStatus === 'flagged') flagged++;
    if (fraudStatus === 'hold') hold++;

    const { error: upsertError } = await service.from('creator_fraud_analysis').upsert(
      {
        creator_id: track.creator_id,
        track_id: track.id,
        analysis_date: analysisDate,
        total_plays: metrics.totalPlays || allTimeSessions || 0,
        unique_listeners: metrics.uniqueListeners,
        play_to_listener_ratio: metrics.playToListenerRatio,
        platform_ratio: metrics.platformRatio,
        ip_concentration_score: metrics.ipConcentrationScore,
        time_clustering_score: metrics.timeClusteringScore,
        suspicious_plays_count: metrics.suspiciousPlaysCount,
        rejected_plays_count: metrics.rejectedPlaysCount,
        fraud_score: fraudScore,
        fraud_status: fraudStatus,
        fraud_signals: metrics.signals,
        payout_held: payoutHeld,
      },
      { onConflict: 'creator_id,track_id,analysis_date' },
    );

    if (upsertError) errors.push(`upsert ${track.id}: ${upsertError.message}`);
    else rowsUpserted++;
  }

  return {
    jobVersion: FRAUD_JOB_VERSION,
    tracksAnalyzed: tracks?.length ?? 0,
    rowsUpserted,
    flagged,
    hold,
    errors,
  };
}

export async function getPlayDetailForAnalysis(
  service: SupabaseClient,
  analysisId: string,
): Promise<{
  analysis: Record<string, unknown> | null;
  playsByUser: { user_id: string | null; count: number; avg_duration: number }[];
  playsByIp: { ip_address: string | null; count: number }[];
  timeline: { hour: string; count: number }[];
  recentPlays: Record<string, unknown>[];
}> {
  const { data: analysis } = await service
    .from('creator_fraud_analysis')
    .select('*, profiles:creator_id(username, display_name), audio_tracks:track_id(title)')
    .eq('id', analysisId)
    .maybeSingle();

  if (!analysis?.track_id) {
    return { analysis, playsByUser: [], playsByIp: [], timeline: [], recentPlays: [] };
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: plays } = await service
    .from('play_sessions')
    .select('id, user_id, ip_address, played_at, play_duration_seconds, is_valid, is_suspicious, is_rejected, fraud_reason')
    .eq('track_id', analysis.track_id)
    .gte('played_at', since.toISOString())
    .order('played_at', { ascending: false })
    .limit(500);

  const userMap = new Map<string | null, { count: number; totalDuration: number }>();
  const ipMap = new Map<string | null, number>();
  const hourMap = new Map<string, number>();

  for (const p of plays ?? []) {
    const uid = p.user_id as string | null;
    const u = userMap.get(uid) ?? { count: 0, totalDuration: 0 };
    u.count++;
    u.totalDuration += Number(p.play_duration_seconds ?? 0);
    userMap.set(uid, u);

    const ip = p.ip_address as string | null;
    ipMap.set(ip, (ipMap.get(ip) ?? 0) + 1);

    const hour = new Date(p.played_at as string).toISOString().slice(0, 13);
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }

  return {
    analysis,
    playsByUser: [...userMap.entries()].map(([user_id, v]) => ({
      user_id,
      count: v.count,
      avg_duration: v.count > 0 ? Math.round(v.totalDuration / v.count) : 0,
    })),
    playsByIp: [...ipMap.entries()].map(([ip_address, count]) => ({ ip_address, count })),
    timeline: [...hourMap.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    recentPlays: plays ?? [],
  };
}

export async function runManualHighPlayAnalysis(service: SupabaseClient, limit = 10) {
  const { data: topTracks } = await service
    .from('audio_tracks')
    .select('id, title, creator_id, play_count')
    .order('play_count', { ascending: false })
    .limit(limit);

  const results = [];
  for (const track of topTracks ?? []) {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const [{ count: allTimeSessions }, { data: plays }] = await Promise.all([
      service
        .from('play_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', track.id),
      service
        .from('play_sessions')
        .select('user_id, ip_address, played_at, play_duration_seconds, is_suspicious, is_rejected')
        .eq('track_id', track.id)
        .gte('played_at', since.toISOString()),
    ]);

    const uniqueUsers = new Set((plays ?? []).map((p) => p.user_id).filter(Boolean)).size;
    const uniqueIps = new Set((plays ?? []).map((p) => p.ip_address).filter(Boolean)).size;
    const durations = (plays ?? []).map((p) => Number(p.play_duration_seconds ?? 0));
    const avgDuration =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const sessionCount = allTimeSessions ?? 0;
    const inflation = detectPlayCountInflation(Number(track.play_count ?? 0), sessionCount);

    results.push({
      track_id: track.id,
      track_title: track.title,
      creator_id: track.creator_id,
      play_count: track.play_count,
      session_rows: sessionCount,
      unique_user_ids: uniqueUsers,
      unique_ip_addresses: uniqueIps,
      avg_play_duration_seconds: avgDuration,
      session_coverage: inflation.coverage,
      inflation_ratio: inflation.value,
      likely_inflated: inflation.triggered,
    });
  }

  return results;
}
