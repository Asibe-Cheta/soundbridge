import type { SupabaseClient } from '@supabase/supabase-js';
import { checkUserFreeForEventWindow } from '@/src/lib/google-calendar';
import { generatePersonalisedEventReason } from '@/src/lib/gemini-event-match-reason';
import {
  hasBehaviourSignals,
  mapEventCategoryToGenre,
  scoreUserEventPair,
  type BehaviourProfile,
  type NotificationTimingPrefs,
  type ScoredEventMatch,
  type ScoringEvent,
  type ScoringUser,
  type UserAffinity,
} from '@/src/lib/event-match-scoring';

const USER_BATCH_SIZE = 100;
const HIGH_CONFIDENCE_THRESHOLD = 75;
const MIN_STORE_SCORE = 50;
const MAX_CALENDAR_CHECKS_PER_USER = 25;

type ExistingScoreRow = {
  event_id: string;
  personalised_reason: string | null;
  indicator_shown: boolean;
  indicator_dismissed: boolean;
};

export type EventMatchIntelligenceJobResult = {
  usersProcessed: number;
  upcomingEventsCount: number;
  maxScoreSeen: number;
  pairsAbove50: number;
  pairsAbove75: number;
  scoresUpserted: number;
  scoresDeleted: number;
  reasonsGenerated: number;
  expiredDeleted: number;
  errors: string[];
};

function defaultTiming(): NotificationTimingPrefs {
  return {
    preferred_notification_times: ['any_time'],
    event_planning_window: 'any_time',
    active_event_months: [],
    timezone: 'UTC',
  };
}

export async function runEventMatchIntelligenceJob(
  supabase: SupabaseClient,
): Promise<EventMatchIntelligenceJobResult> {
  const result: EventMatchIntelligenceJobResult = {
    usersProcessed: 0,
    upcomingEventsCount: 0,
    maxScoreSeen: 0,
    pairsAbove50: 0,
    pairsAbove75: 0,
    scoresUpserted: 0,
    scoresDeleted: 0,
    reasonsGenerated: 0,
    expiredDeleted: 0,
    errors: [],
  };

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const windowEnd = new Date(tomorrow);
  windowEnd.setDate(windowEnd.getDate() + 90);

  const { data: expiredDeleted, error: expireErr } = await supabase
    .from('event_match_scores')
    .delete()
    .lt('expires_at', now.toISOString())
    .select('id');

  if (expireErr) {
    result.errors.push(`expire cleanup: ${expireErr.message}`);
  } else {
    result.expiredDeleted = expiredDeleted?.length ?? 0;
  }

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, creator_id, title, category, event_date, city, latitude, longitude, status')
    .gte('event_date', tomorrow.toISOString())
    .lte('event_date', windowEnd.toISOString())
    .eq('status', 'active')
    .order('event_date', { ascending: true });

  if (eventsError) {
    result.errors.push(`events fetch: ${eventsError.message}`);
    return result;
  }

  result.upcomingEventsCount = events?.length ?? 0;

  if (!events?.length) {
    return result;
  }

  const creatorIds = [...new Set(events.map((e) => e.creator_id).filter(Boolean))];
  const creatorMoodMap = await loadCreatorMoods(supabase, creatorIds);
  const creatorNameMap = await loadCreatorNames(supabase, creatorIds);

  const scoringEvents: ScoringEvent[] = events.map((e) => ({
    id: e.id,
    creator_id: e.creator_id,
    title: e.title,
    category: e.category,
    event_date: e.event_date,
    city: e.city,
    latitude: e.latitude,
    longitude: e.longitude,
    creator_moods: creatorMoodMap.get(e.creator_id) ?? [],
  }));

  const { data: behaviourRows } = await supabase.from('user_behaviour_profiles').select('*');
  const behaviourByUser = new Map(
    (behaviourRows ?? []).map((row) => [row.user_id, row as BehaviourProfile]),
  );

  const { data: notifRows } = await supabase
    .from('notification_preferences')
    .select(
      'user_id, preferred_event_genres, preferred_notification_times, event_planning_window, active_event_months, timezone',
    );

  const notifByUser = new Map(
    (notifRows ?? []).map((row) => [
      row.user_id,
      {
        preferred_notification_times: row.preferred_notification_times ?? ['any_time'],
        event_planning_window: row.event_planning_window ?? 'any_time',
        active_event_months: row.active_event_months ?? [],
        timezone: row.timezone ?? 'UTC',
        genres: (row.preferred_event_genres as string[] | null) ?? [],
      },
    ]),
  );

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, city, latitude, longitude, preferred_moods')
    .not('id', 'is', null);

  const eligibleUserIds: string[] = [];
  for (const profile of profileRows ?? []) {
    const behaviour = behaviourByUser.get(profile.id) ?? null;
    const notif = notifByUser.get(profile.id);
    const notificationGenres = notif?.genres ?? [];
    const profileMoods = (profile.preferred_moods as string[] | null) ?? [];

    if (hasBehaviourSignals(behaviour, notificationGenres, profileMoods)) {
      eligibleUserIds.push(profile.id);
    }
  }

  for (let offset = 0; offset < eligibleUserIds.length; offset += USER_BATCH_SIZE) {
    const batchIds = eligibleUserIds.slice(offset, offset + USER_BATCH_SIZE);

    for (const userId of batchIds) {
      try {
        const batchResult = await processUser(
          supabase,
          userId,
          scoringEvents,
          behaviourByUser.get(userId) ?? null,
          notifByUser.get(userId),
          profileRows?.find((p) => p.id === userId),
          creatorNameMap,
        );
        result.usersProcessed += 1;
        result.scoresUpserted += batchResult.upserted;
        result.scoresDeleted += batchResult.deleted;
        result.reasonsGenerated += batchResult.reasons;
        result.maxScoreSeen = Math.max(result.maxScoreSeen, batchResult.maxScore);
        result.pairsAbove50 += batchResult.pairsAbove50;
        result.pairsAbove75 += batchResult.pairsAbove75;
      } catch (err) {
        result.errors.push(
          `user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return result;
}

async function loadCreatorMoods(
  supabase: SupabaseClient,
  creatorIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!creatorIds.length) return map;

  const { data: tracks } = await supabase
    .from('audio_tracks')
    .select('creator_id, mood_tags')
    .in('creator_id', creatorIds)
    .not('mood_tags', 'is', null)
    .limit(5000);

  for (const track of tracks ?? []) {
    const moods = (track.mood_tags as string[] | null) ?? [];
    if (!moods.length) continue;
    const existing = map.get(track.creator_id) ?? [];
    map.set(track.creator_id, [...new Set([...existing, ...moods])]);
  }

  return map;
}

async function loadCreatorNames(
  supabase: SupabaseClient,
  creatorIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!creatorIds.length) return map;

  const { data: creators } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', creatorIds);

  for (const c of creators ?? []) {
    map.set(c.id, c.display_name || c.username || 'Artist');
  }

  return map;
}

async function loadUserAffinity(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserAffinity> {
  const affinity: UserAffinity = {
    tippedCreatorIds: new Set(),
    tippedGenres: new Set(),
    followedCreatorIds: new Set(),
    liveInterestCreatorIds: new Set(),
  };

  const [tipsRes, creatorTipsRes, followsRes, liveRes] = await Promise.all([
    supabase.from('tips').select('recipient_id, track_id').eq('sender_id', userId).eq('status', 'completed'),
    supabase.from('creator_tips').select('creator_id').eq('tipper_id', userId).eq('status', 'completed'),
    supabase.from('follows').select('following_id').eq('follower_id', userId),
    supabase
      .from('live_interest_responses')
      .select('creator_id')
      .eq('user_id', userId)
      .eq('response', 'yes'),
  ]);

  for (const tip of tipsRes.data ?? []) {
    if (tip.recipient_id) affinity.tippedCreatorIds.add(tip.recipient_id);
  }
  for (const tip of creatorTipsRes.data ?? []) {
    if (tip.creator_id) affinity.tippedCreatorIds.add(tip.creator_id);
  }
  for (const f of followsRes.data ?? []) {
    if (f.following_id) affinity.followedCreatorIds.add(f.following_id);
  }
  for (const l of liveRes.data ?? []) {
    if (l.creator_id) affinity.liveInterestCreatorIds.add(l.creator_id);
  }

  const trackIds = (tipsRes.data ?? []).map((t) => t.track_id).filter(Boolean) as string[];
  if (trackIds.length) {
    const { data: tippedTracks } = await supabase
      .from('audio_tracks')
      .select('genre, mood_tags')
      .in('id', trackIds);

    for (const track of tippedTracks ?? []) {
      if (track.genre) {
        affinity.tippedGenres.add(mapEventCategoryToGenre(track.genre));
        affinity.tippedGenres.add(track.genre);
      }
    }
  }

  return affinity;
}

async function processUser(
  supabase: SupabaseClient,
  userId: string,
  events: ScoringEvent[],
  behaviour: BehaviourProfile | null,
  notif:
    | {
        preferred_notification_times: string[];
        event_planning_window: string;
        active_event_months: number[];
        timezone: string;
        genres: string[];
      }
    | undefined,
  profile:
    | {
        id: string;
        city: string | null;
        latitude: number | null;
        longitude: number | null;
        preferred_moods: string[] | null;
      }
    | undefined,
  creatorNames: Map<string, string>,
): Promise<{
  upserted: number;
  deleted: number;
  reasons: number;
  maxScore: number;
  pairsAbove50: number;
  pairsAbove75: number;
}> {
  const timing: NotificationTimingPrefs = notif
    ? {
        preferred_notification_times: notif.preferred_notification_times,
        event_planning_window: notif.event_planning_window,
        active_event_months: notif.active_event_months,
        timezone: notif.timezone,
      }
    : defaultTiming();

  const user: ScoringUser = {
    id: userId,
    city: profile?.city ?? null,
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,
    preferred_moods: (profile?.preferred_moods as string[] | null) ?? [],
    notification_genres: notif?.genres ?? [],
  };

  const affinity = await loadUserAffinity(supabase, userId);

  const { data: calendarRow } = await supabase
    .from('calendar_integrations')
    .select('calendar_connected')
    .eq('user_id', userId)
    .maybeSingle();

  const calendarConnected = Boolean(calendarRow?.calendar_connected);

  const { data: existingRows } = await supabase
    .from('event_match_scores')
    .select('event_id, personalised_reason, indicator_shown, indicator_dismissed')
    .eq('user_id', userId);

  const existingByEvent = new Map(
    (existingRows ?? []).map((r) => [r.event_id, r as ExistingScoreRow]),
  );

  const scored: ScoredEventMatch[] = [];
  let calendarChecks = 0;

  const preliminary = events.map((event) =>
    scoreUserEventPair({
      event,
      behaviour,
      user,
      timing,
      affinity,
      calendarConnected: false,
      calendarFree: null,
    }),
  );

  const calendarCandidates = calendarConnected
    ? preliminary
        .filter((s) => s.match_score >= 40)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, MAX_CALENDAR_CHECKS_PER_USER)
    : [];

  const calendarFreeMap = new Map<string, boolean>();
  for (const candidate of calendarCandidates) {
    const event = events.find((e) => e.id === candidate.event_id);
    if (!event) continue;
    const free = await checkUserFreeForEventWindow(supabase, userId, event.event_date, event.id);
    if (free !== null) {
      calendarFreeMap.set(event.id, free);
    }
    calendarChecks += 1;
  }

  let maxScore = 0;
  let pairsAbove50 = 0;
  let pairsAbove75 = 0;

  for (const event of events) {
    const match = scoreUserEventPair({
      event,
      behaviour,
      user,
      timing,
      affinity,
      calendarConnected,
      calendarFree: calendarFreeMap.get(event.id) ?? null,
    });

    maxScore = Math.max(maxScore, match.match_score);
    if (match.match_score >= MIN_STORE_SCORE) {
      pairsAbove50 += 1;
      scored.push(match);
    }
    if (match.match_score >= 75) {
      pairsAbove75 += 1;
    }
  }

  const scoredEventIds = new Set(scored.map((s) => s.event_id));
  const toDelete = [...existingByEvent.keys()].filter((id) => !scoredEventIds.has(id));

  if (toDelete.length) {
    await supabase
      .from('event_match_scores')
      .delete()
      .eq('user_id', userId)
      .in('event_id', toDelete);
  }

  let upserted = 0;
  let reasons = 0;

  for (const match of scored) {
    const existing = existingByEvent.get(match.event_id);
    let personalisedReason = existing?.personalised_reason ?? null;

    if (
      match.match_score >= HIGH_CONFIDENCE_THRESHOLD &&
      !personalisedReason
    ) {
      const event = events.find((e) => e.id === match.event_id);
      if (event) {
        const reason = await generatePersonalisedEventReason({
          eventTitle: event.title,
          artistName: creatorNames.get(event.creator_id) ?? 'Artist',
          genre: mapEventCategoryToGenre(event.category),
          eventDate: event.event_date,
          city: event.city ?? 'your area',
          matchReasons: match.match_reasons,
        });
        if (reason) {
          personalisedReason = reason;
          reasons += 1;
        }
      }
    }

    const { error } = await supabase.from('event_match_scores').upsert(
      {
        user_id: userId,
        event_id: match.event_id,
        match_score: match.match_score,
        match_reasons: match.match_reasons,
        personalised_reason: personalisedReason,
        indicator_shown: existing?.indicator_shown ?? false,
        indicator_dismissed: existing?.indicator_dismissed ?? false,
        calculated_at: new Date().toISOString(),
        expires_at: match.expires_at,
      },
      { onConflict: 'user_id,event_id' },
    );

    if (!error) upserted += 1;
  }

  return { upserted, deleted: toDelete.length, reasons, maxScore, pairsAbove50, pairsAbove75 };
}
