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

const HIGH_CONFIDENCE_THRESHOLD = 75;
const MIN_STORE_SCORE = 50;
const MAX_CALENDAR_CHECKS_PER_USER = 25;
const MAX_CALENDAR_CHECKS_PER_RUN = 40;
const USER_PROCESS_CONCURRENCY = 25;
const PAGE_SIZE = 1000;
const PROFILE_CHUNK_SIZE = 500;

/** Bump when scoring logic changes — visible in cron/debug responses. */
export const EVENT_MATCH_JOB_VERSION = '2026-06-11-v5';

const EMPTY_AFFINITY: UserAffinity = {
  tippedCreatorIds: new Set(),
  tippedGenres: new Set(),
  followedCreatorIds: new Set(),
  liveInterestCreatorIds: new Set(),
};

type UserProcessContext = {
  affinityByUser: Map<string, UserAffinity>;
  calendarConnectedUsers: Set<string>;
  existingScoresByUser: Map<string, Map<string, ExistingScoreRow>>;
  calendarCheckBudget: { remaining: number };
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];

  const results = new Array<R>(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

type NotifPrefs = {
  preferred_notification_times: string[];
  event_planning_window: string;
  active_event_months: number[];
  timezone: string;
  genres: string[];
};

async function fetchAllRows<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  select: string,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    if (!data?.length) break;

    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

function mapNotifRow(row: {
  user_id: string;
  preferred_event_genres?: string[] | null;
  preferred_notification_times?: string[] | null;
  event_planning_window?: string | null;
  active_event_months?: number[] | null;
  timezone?: string | null;
}): NotifPrefs {
  return {
    preferred_notification_times: row.preferred_notification_times ?? ['any_time'],
    event_planning_window: row.event_planning_window ?? 'any_time',
    active_event_months: row.active_event_months ?? [],
    timezone: row.timezone ?? 'UTC',
    genres: (row.preferred_event_genres as string[] | null) ?? [],
  };
}

function mergeNotifPrefs(target: NotifPrefs, genres: string[] | null | undefined) {
  if (!genres?.length) return;
  target.genres = [...new Set([...target.genres, ...genres])];
}

async function loadNotificationPrefsByUser(
  supabase: SupabaseClient,
): Promise<Map<string, NotifPrefs>> {
  const notifByUser = new Map<string, NotifPrefs>();

  const [primaryRows, legacyRows] = await Promise.all([
    fetchAllRows<{
      user_id: string;
      preferred_event_genres: string[] | null;
      preferred_notification_times: string[] | null;
      event_planning_window: string | null;
      active_event_months: number[] | null;
      timezone: string | null;
    }>(
      supabase,
      'notification_preferences',
      'user_id, preferred_event_genres, preferred_notification_times, event_planning_window, active_event_months, timezone',
    ),
    fetchAllRows<{
      user_id: string;
      preferred_event_genres: string[] | null;
      timezone: string | null;
    }>(supabase, 'user_notification_preferences', 'user_id, preferred_event_genres, timezone'),
  ]);

  for (const row of primaryRows) {
    notifByUser.set(row.user_id, mapNotifRow(row));
  }

  for (const row of legacyRows) {
    const existing = notifByUser.get(row.user_id);
    if (existing) {
      mergeNotifPrefs(existing, row.preferred_event_genres);
      if (row.timezone) existing.timezone = row.timezone;
      continue;
    }

    notifByUser.set(row.user_id, {
      ...defaultTiming(),
      timezone: row.timezone ?? 'UTC',
      genres: (row.preferred_event_genres as string[] | null) ?? [],
    });
  }

  return notifByUser;
}

function affinityForUser(
  map: Map<string, UserAffinity>,
  userId: string,
): UserAffinity {
  return map.get(userId) ?? EMPTY_AFFINITY;
}

async function loadAffinityByUser(supabase: SupabaseClient): Promise<Map<string, UserAffinity>> {
  const map = new Map<string, UserAffinity>();

  const ensure = (userId: string): UserAffinity => {
    let affinity = map.get(userId);
    if (!affinity) {
      affinity = {
        tippedCreatorIds: new Set(),
        tippedGenres: new Set(),
        followedCreatorIds: new Set(),
        liveInterestCreatorIds: new Set(),
      };
      map.set(userId, affinity);
    }
    return affinity;
  };

  const follows = await fetchAllRows<{ follower_id: string; following_id: string }>(
    supabase,
    'follows',
    'follower_id, following_id',
  );

  const tips: { sender_id: string; recipient_id: string | null; track_id: string | null }[] = [];
  const creatorTips: { tipper_id: string; creator_id: string | null }[] = [];
  const liveInterest: { user_id: string; creator_id: string | null }[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('tips')
      .select('sender_id, recipient_id, track_id')
      .eq('status', 'completed')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`tips: ${error.message}`);
    if (!data?.length) break;
    tips.push(...(data as typeof tips));
    if (data.length < PAGE_SIZE) break;
  }

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('creator_tips')
      .select('tipper_id, creator_id')
      .eq('status', 'completed')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`creator_tips: ${error.message}`);
    if (!data?.length) break;
    creatorTips.push(...(data as typeof creatorTips));
    if (data.length < PAGE_SIZE) break;
  }

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('live_interest_responses')
      .select('user_id, creator_id')
      .eq('response', 'yes')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`live_interest_responses: ${error.message}`);
    if (!data?.length) break;
    liveInterest.push(...(data as typeof liveInterest));
    if (data.length < PAGE_SIZE) break;
  }

  for (const row of follows) {
    if (row.follower_id && row.following_id) {
      ensure(row.follower_id).followedCreatorIds.add(row.following_id);
    }
  }

  const trackIds = new Set<string>();
  for (const tip of tips) {
    if (tip.sender_id && tip.recipient_id) {
      ensure(tip.sender_id).tippedCreatorIds.add(tip.recipient_id);
    }
    if (tip.track_id) trackIds.add(tip.track_id);
  }

  for (const tip of creatorTips) {
    if (tip.tipper_id && tip.creator_id) {
      ensure(tip.tipper_id).tippedCreatorIds.add(tip.creator_id);
    }
  }

  for (const row of liveInterest) {
    if (row.user_id && row.creator_id) {
      ensure(row.user_id).liveInterestCreatorIds.add(row.creator_id);
    }
  }

  if (trackIds.size) {
    const trackIdList = [...trackIds];
    const tippedTracks: { id: string; genre: string | null }[] = [];

    for (let i = 0; i < trackIdList.length; i += PROFILE_CHUNK_SIZE) {
      const chunk = trackIdList.slice(i, i + PROFILE_CHUNK_SIZE);
      const { data } = await supabase.from('audio_tracks').select('id, genre').in('id', chunk);
      tippedTracks.push(...((data as { id: string; genre: string | null }[] | null) ?? []));
    }

    const genreByTrack = new Map(tippedTracks.map((t) => [t.id, t.genre]));

    for (const tip of tips) {
      if (!tip.sender_id || !tip.track_id) continue;
      const genre = genreByTrack.get(tip.track_id);
      if (!genre) continue;
      const affinity = ensure(tip.sender_id);
      affinity.tippedGenres.add(mapEventCategoryToGenre(genre));
      affinity.tippedGenres.add(genre);
    }
  }

  return map;
}

async function loadCalendarConnectedUsers(supabase: SupabaseClient): Promise<Set<string>> {
  const connected = new Set<string>();
  const rows = await fetchAllRows<{ user_id: string; calendar_connected: boolean | null }>(
    supabase,
    'calendar_integrations',
    'user_id, calendar_connected',
  );

  for (const row of rows) {
    if (row.user_id && row.calendar_connected) connected.add(row.user_id);
  }

  return connected;
}

async function loadExistingScoresForEvents(
  supabase: SupabaseClient,
  eventIds: string[],
): Promise<Map<string, Map<string, ExistingScoreRow>>> {
  const byUser = new Map<string, Map<string, ExistingScoreRow>>();
  if (!eventIds.length) return byUser;

  for (let i = 0; i < eventIds.length; i += PROFILE_CHUNK_SIZE) {
    const chunk = eventIds.slice(i, i + PROFILE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('event_match_scores')
      .select('user_id, event_id, personalised_reason, indicator_shown, indicator_dismissed')
      .in('event_id', chunk);

    if (error) throw new Error(`event_match_scores: ${error.message}`);

    for (const row of data ?? []) {
      let eventMap = byUser.get(row.user_id);
      if (!eventMap) {
        eventMap = new Map();
        byUser.set(row.user_id, eventMap);
      }
      eventMap.set(row.event_id, row as ExistingScoreRow);
    }
  }

  return byUser;
}

async function loadProfilesByIds(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<
  Map<
    string,
    {
      id: string;
      city: string | null;
      latitude: number | null;
      longitude: number | null;
      preferred_moods: string[] | null;
    }
  >
> {
  const profileById = new Map<
    string,
    {
      id: string;
      city: string | null;
      latitude: number | null;
      longitude: number | null;
      preferred_moods: string[] | null;
    }
  >();

  for (let i = 0; i < userIds.length; i += PROFILE_CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + PROFILE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, city, latitude, longitude, preferred_moods')
      .in('id', chunk);

    if (error) throw new Error(`profiles: ${error.message}`);

    for (const profile of data ?? []) {
      profileById.set(profile.id, profile);
    }
  }

  return profileById;
}

type ExistingScoreRow = {
  event_id: string;
  personalised_reason: string | null;
  indicator_shown: boolean;
  indicator_dismissed: boolean;
};

export type EventMatchIntelligenceJobResult = {
  jobVersion: string;
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
    jobVersion: EVENT_MATCH_JOB_VERSION,
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
    .select('id, creator_id, title, category, event_date, city, location, latitude, longitude, status')
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
    location: e.location,
    latitude: e.latitude,
    longitude: e.longitude,
    creator_moods: creatorMoodMap.get(e.creator_id) ?? [],
  }));

  const behaviourRows = await fetchAllRows<BehaviourProfile>(
    supabase,
    'user_behaviour_profiles',
    '*',
  );
  const behaviourByUser = new Map(
    behaviourRows.map((row) => [row.user_id, row as BehaviourProfile]),
  );

  const notifByUser = await loadNotificationPrefsByUser(supabase);

  const candidateIds = new Set<string>();
  for (const row of behaviourRows) candidateIds.add(row.user_id);
  for (const userId of notifByUser.keys()) candidateIds.add(userId);

  const moodProfileRows = await fetchAllRows<{
    id: string;
    preferred_moods: string[] | null;
  }>(supabase, 'profiles', 'id, preferred_moods');

  for (const profile of moodProfileRows) {
    if ((profile.preferred_moods as string[] | null)?.length) {
      candidateIds.add(profile.id);
    }
  }

  const profileById = await loadProfilesByIds(supabase, [...candidateIds]);

  const eligibleUserIds: string[] = [];
  for (const userId of candidateIds) {
    const profile = profileById.get(userId);
    const notificationGenres = notifByUser.get(userId)?.genres ?? [];
    const profileMoods = (profile?.preferred_moods as string[] | null) ?? [];

    if (hasBehaviourSignals(behaviourByUser.get(userId) ?? null, notificationGenres, profileMoods)) {
      eligibleUserIds.push(userId);
    }
  }

  const [affinityByUser, calendarConnectedUsers, existingScoresByUser] = await Promise.all([
    loadAffinityByUser(supabase),
    loadCalendarConnectedUsers(supabase),
    loadExistingScoresForEvents(
      supabase,
      scoringEvents.map((event) => event.id),
    ),
  ]);

  const processContext: UserProcessContext = {
    affinityByUser,
    calendarConnectedUsers,
    existingScoresByUser,
    calendarCheckBudget: { remaining: MAX_CALENDAR_CHECKS_PER_RUN },
  };

  const userResults = await mapWithConcurrency(eligibleUserIds, USER_PROCESS_CONCURRENCY, async (userId) => {
    try {
      const batchResult = await processUser(
        supabase,
        userId,
        scoringEvents,
        behaviourByUser.get(userId) ?? null,
        notifByUser.get(userId),
        profileById.get(userId),
        creatorNameMap,
        processContext,
      );
      return { userId, batchResult, error: null as string | null };
    } catch (err) {
      return {
        userId,
        batchResult: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  for (const entry of userResults) {
    if (entry.error) {
      result.errors.push(`user ${entry.userId}: ${entry.error}`);
      continue;
    }

    if (!entry.batchResult) continue;

    result.usersProcessed += 1;
    result.scoresUpserted += entry.batchResult.upserted;
    result.scoresDeleted += entry.batchResult.deleted;
    result.reasonsGenerated += entry.batchResult.reasons;
    result.maxScoreSeen = Math.max(result.maxScoreSeen, entry.batchResult.maxScore);
    result.pairsAbove50 += entry.batchResult.pairsAbove50;
    result.pairsAbove75 += entry.batchResult.pairsAbove75;
    result.errors.push(...entry.batchResult.upsertErrors);
  }

  return result;
}

export async function debugEventMatchForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const windowEnd = new Date(tomorrow);
  windowEnd.setDate(windowEnd.getDate() + 90);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, city, latitude, longitude, preferred_moods')
    .eq('id', userId)
    .maybeSingle();

  const behaviourRows = await supabase
    .from('user_behaviour_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const notifByUser = await loadNotificationPrefsByUser(supabase);
  const notif = notifByUser.get(userId);

  const notificationGenres = notif?.genres ?? [];
  const profileMoods = (profile?.preferred_moods as string[] | null) ?? [];
  const eligible = hasBehaviourSignals(
    (behaviourRows.data as BehaviourProfile | null) ?? null,
    notificationGenres,
    profileMoods,
  );

  const { data: events } = await supabase
    .from('events')
    .select('id, creator_id, title, category, event_date, city, location, latitude, longitude, status')
    .gte('event_date', tomorrow.toISOString())
    .lte('event_date', windowEnd.toISOString())
    .eq('status', 'active')
    .order('event_date', { ascending: true });

  const creatorIds = [...new Set((events ?? []).map((e) => e.creator_id).filter(Boolean))];
  const creatorMoodMap = await loadCreatorMoods(supabase, creatorIds);
  const creatorNameMap = await loadCreatorNames(supabase, creatorIds);

  const scoringEvents: ScoringEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    creator_id: e.creator_id,
    title: e.title,
    category: e.category,
    event_date: e.event_date,
    city: e.city,
    location: e.location,
    latitude: e.latitude,
    longitude: e.longitude,
    creator_moods: creatorMoodMap.get(e.creator_id) ?? [],
  }));

  const affinity = await loadUserAffinity(supabase, userId);
  const { data: calendarRow } = await supabase
    .from('calendar_integrations')
    .select('calendar_connected')
    .eq('user_id', userId)
    .maybeSingle();

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
    preferred_moods: profileMoods,
    notification_genres: notificationGenres,
  };

  const scores = scoringEvents.map((event) => {
    const match = scoreUserEventPair({
      event,
      behaviour: (behaviourRows.data as BehaviourProfile | null) ?? null,
      user,
      timing,
      affinity,
      calendarConnected: Boolean(calendarRow?.calendar_connected),
      calendarFree: null,
    });

    return {
      event_id: event.id,
      title: event.title,
      creator_id: event.creator_id,
      event_city: event.city,
      event_location: event.location,
      follows_creator: affinity.followedCreatorIds.has(event.creator_id),
      match_score: match.match_score,
      match_reasons: match.match_reasons,
    };
  });

  return {
    jobVersion: EVENT_MATCH_JOB_VERSION,
    userId,
    eligible,
    profile_city: profile?.city ?? null,
    notification_genres: notificationGenres,
    calendar_connected: Boolean(calendarRow?.calendar_connected),
    followed_creator_ids: [...affinity.followedCreatorIds],
    upcoming_events_count: scoringEvents.length,
    scores,
  };
}

/** Score and upsert matches for one user (fast path for smoke tests). */
export async function persistEventMatchScoresForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const windowEnd = new Date(tomorrow);
  windowEnd.setDate(windowEnd.getDate() + 90);

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, creator_id, title, category, event_date, city, location, latitude, longitude, status')
    .gte('event_date', tomorrow.toISOString())
    .lte('event_date', windowEnd.toISOString())
    .eq('status', 'active')
    .order('event_date', { ascending: true });

  if (eventsError) {
    throw new Error(`events fetch: ${eventsError.message}`);
  }

  if (!events?.length) {
    return { jobVersion: EVENT_MATCH_JOB_VERSION, userId, upserted: 0, message: 'No upcoming events' };
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
    location: e.location,
    latitude: e.latitude,
    longitude: e.longitude,
    creator_moods: creatorMoodMap.get(e.creator_id) ?? [],
  }));

  const [profileById, behaviourRow, notifByUser] = await Promise.all([
    loadProfilesByIds(supabase, [userId]),
    supabase.from('user_behaviour_profiles').select('*').eq('user_id', userId).maybeSingle(),
    loadNotificationPrefsByUser(supabase),
  ]);

  const result = await processUser(
    supabase,
    userId,
    scoringEvents,
    (behaviourRow.data as BehaviourProfile | null) ?? null,
    notifByUser.get(userId),
    profileById.get(userId),
    creatorNameMap,
  );

  return {
    jobVersion: EVENT_MATCH_JOB_VERSION,
    userId,
    ...result,
  };
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
  processContext?: UserProcessContext,
): Promise<{
  upserted: number;
  deleted: number;
  reasons: number;
  maxScore: number;
  pairsAbove50: number;
  pairsAbove75: number;
  upsertErrors: string[];
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

  const affinity = processContext
    ? affinityForUser(processContext.affinityByUser, userId)
    : await loadUserAffinity(supabase, userId);

  const calendarConnected = processContext
    ? processContext.calendarConnectedUsers.has(userId)
    : Boolean(
        (
          await supabase
            .from('calendar_integrations')
            .select('calendar_connected')
            .eq('user_id', userId)
            .maybeSingle()
        ).data?.calendar_connected,
      );

  const existingByEvent = processContext
    ? new Map(processContext.existingScoresByUser.get(userId) ?? [])
    : new Map(
        (
          (await supabase
            .from('event_match_scores')
            .select('event_id, personalised_reason, indicator_shown, indicator_dismissed')
            .eq('user_id', userId)).data ?? []
        ).map((r) => [r.event_id, r as ExistingScoreRow]),
      );

  const scored: ScoredEventMatch[] = [];

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
    if (processContext && processContext.calendarCheckBudget.remaining <= 0) break;

    const event = events.find((e) => e.id === candidate.event_id);
    if (!event) continue;

    if (processContext) processContext.calendarCheckBudget.remaining -= 1;

    const free = await checkUserFreeForEventWindow(supabase, userId, event.event_date, event.id);
    if (free !== null) {
      calendarFreeMap.set(event.id, free);
    }
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
  const upsertErrors: string[] = [];

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

    if (error) {
      upsertErrors.push(`${match.event_id}: ${error.message}`);
    } else {
      upserted += 1;
    }
  }

  return {
    upserted,
    deleted: toDelete.length,
    reasons,
    maxScore,
    pairsAbove50,
    pairsAbove75,
    upsertErrors,
  };
}
