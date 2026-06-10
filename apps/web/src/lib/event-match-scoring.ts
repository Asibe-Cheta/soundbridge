/**
 * Personalised event intelligence — scoring formula.
 * See PERSONALIZED_EVENT_INTELLIGENCE.MD
 */

export type MatchReasons = {
  genre?: number;
  genre_signal?: string;
  mood?: number;
  mood_signal?: string;
  location?: number;
  location_signal?: string;
  availability?: number;
  availability_signal?: string;
  artist_affinity?: number;
  artist_signal?: string;
  planning_window?: number;
  planning_signal?: string;
  signals?: string[];
};

export type ScoredEventMatch = {
  event_id: string;
  match_score: number;
  match_reasons: MatchReasons;
  expires_at: string;
};

export type BehaviourProfile = {
  user_id: string;
  preferred_genres: string[];
  preferred_moods: string[];
  preferred_event_cities: string[];
  primary_location_city: string | null;
};

export type NotificationTimingPrefs = {
  preferred_notification_times: string[];
  event_planning_window: string;
  active_event_months: number[];
  timezone: string;
};

export type UserAffinity = {
  tippedCreatorIds: Set<string>;
  tippedGenres: Set<string>;
  followedCreatorIds: Set<string>;
  liveInterestCreatorIds: Set<string>;
};

export type ScoringEvent = {
  id: string;
  creator_id: string;
  title: string;
  category: string | null;
  event_date: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  creator_moods: string[];
};

export type ScoringUser = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  preferred_moods: string[];
  notification_genres: string[];
};

const EARTH_RADIUS_KM = 6371;

export function mapEventCategoryToGenre(category: string | null): string {
  if (!category) return 'Other';
  const map: Record<string, string> = {
    Gospel: 'Gospel Concert',
    Jazz: 'Jazz Room',
    Classical: 'Instrumental',
    Carnival: 'Carnival',
    Christian: 'Gospel Concert',
    'Hip-Hop': 'Music Concert',
    Afrobeat: 'Music Concert',
    Rock: 'Music Concert',
    Pop: 'Music Concert',
    Secular: 'Music Concert',
    Other: 'Other',
  };
  return map[category] ?? category;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeCity(city: string | null | undefined): string {
  return (city ?? '').trim().toLowerCase();
}

function moodOverlap(eventMoods: string[], userMoods: string[]): { score: number; signal?: string } {
  const userSet = new Set(userMoods.map((m) => m.toLowerCase()));
  const eventSet = eventMoods.map((m) => m.toLowerCase()).filter(Boolean);
  if (!eventSet.length || !userSet.size) return { score: 0 };

  const overlap = eventSet.filter((m) => userSet.has(m));
  if (overlap.length >= 2 || (overlap.length === 1 && eventSet.length === 1)) {
    return { score: 15, signal: `Mood match: ${overlap.join(', ')}` };
  }
  if (overlap.length === 1) {
    return { score: 8, signal: `Partial mood match: ${overlap[0]}` };
  }
  return { score: 0 };
}

function eventHourInTimezone(eventDate: string, timezone: string): number {
  try {
    return parseInt(
      new Date(eventDate).toLocaleString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone || 'UTC',
      }),
      10,
    );
  } catch {
    return new Date(eventDate).getUTCHours();
  }
}

function eventMonthInTimezone(eventDate: string, timezone: string): number {
  try {
    return parseInt(
      new Date(eventDate).toLocaleString('en-US', {
        month: 'numeric',
        timeZone: timezone || 'UTC',
      }),
      10,
    );
  } catch {
    return new Date(eventDate).getUTCMonth() + 1;
  }
}

function matchesPreferredTimeSlot(hour: number, slots: string[]): boolean {
  for (const slot of slots) {
    if (slot === 'any_time') return true;
    if (slot === 'morning' && hour < 12) return true;
    if (slot === 'afternoon' && hour >= 12 && hour < 17) return true;
    if (slot === 'evening' && hour >= 17 && hour < 21) return true;
  }
  return false;
}

function scorePlanningWindow(window: string, daysUntil: number): { score: number; signal?: string } {
  const w = window || 'any_time';
  if (w === 'any_time') return { score: 5, signal: 'Matches your planning window' };
  if (w === 'last_minute' && daysUntil >= 0 && daysUntil <= 7) {
    return { score: 5, signal: 'Last-minute planner match' };
  }
  if (w === 'few_weeks' && daysUntil >= 7 && daysUntil <= 28) {
    return { score: 5, signal: 'Few-weeks-ahead planner match' };
  }
  if (w === 'one_to_three_months' && daysUntil >= 30 && daysUntil <= 90) {
    return { score: 5, signal: 'Long-range planner match' };
  }
  return { score: 0 };
}

export function daysUntilEventDate(eventDate: string, now = new Date()): number {
  const event = new Date(eventDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEventDay = new Date(event.getFullYear(), event.getMonth(), event.getDate());
  return Math.round(
    (startOfEventDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function hasBehaviourSignals(
  behaviour: BehaviourProfile | null,
  notificationGenres: string[],
  profileMoods: string[],
): boolean {
  if (notificationGenres.length > 0) return true;
  if (profileMoods.length > 0) return true;
  if (!behaviour) return false;

  return (
    behaviour.preferred_genres.length > 0 ||
    behaviour.preferred_moods.length > 0 ||
    behaviour.preferred_event_cities.length > 0 ||
    !!behaviour.primary_location_city
  );
}

export function scoreUserEventPair(params: {
  event: ScoringEvent;
  behaviour: BehaviourProfile | null;
  user: ScoringUser;
  timing: NotificationTimingPrefs;
  affinity: UserAffinity;
  calendarConnected: boolean;
  calendarFree: boolean | null;
}): ScoredEventMatch {
  const { event, behaviour, user, timing, affinity, calendarConnected, calendarFree } = params;
  const reasons: MatchReasons = { signals: [] };
  let total = 0;

  const mappedGenre = mapEventCategoryToGenre(event.category);
  const userGenres = new Set([
    ...(behaviour?.preferred_genres ?? []),
    ...user.notification_genres,
  ]);

  if (userGenres.has(mappedGenre)) {
    reasons.genre = 25;
    reasons.genre_signal = `${mappedGenre} is in your preferred genres`;
    reasons.signals!.push(reasons.genre_signal);
    total += 25;
  } else if ([...affinity.tippedGenres].some((g) => g === mappedGenre || g === event.category)) {
    reasons.genre = 15;
    reasons.genre_signal = `You've supported ${mappedGenre} artists before`;
    reasons.signals!.push(reasons.genre_signal);
    total += 15;
  } else {
    reasons.genre = 0;
  }

  const userMoods = [
    ...(behaviour?.preferred_moods ?? []),
    ...user.preferred_moods,
  ].filter(Boolean);
  const moodResult = moodOverlap(event.creator_moods, userMoods);
  reasons.mood = moodResult.score;
  if (moodResult.signal) {
    reasons.mood_signal = moodResult.signal;
    reasons.signals!.push(moodResult.signal);
  }
  total += moodResult.score;

  const eventCity = normalizeCity(event.city);
  const primaryCity = normalizeCity(behaviour?.primary_location_city);
  const preferredCities = (behaviour?.preferred_event_cities ?? []).map(normalizeCity);

  if (primaryCity && eventCity && primaryCity === eventCity) {
    reasons.location = 20;
    reasons.location_signal = `In your city (${event.city})`;
    reasons.signals!.push(reasons.location_signal);
    total += 20;
  } else if (eventCity && preferredCities.includes(eventCity)) {
    reasons.location = 15;
    reasons.location_signal = `In a city you attend events in (${event.city})`;
    reasons.signals!.push(reasons.location_signal);
    total += 15;
  } else if (
    user.latitude != null &&
    user.longitude != null &&
    event.latitude != null &&
    event.longitude != null
  ) {
    const km = haversineKm(user.latitude, user.longitude, event.latitude, event.longitude);
    const miles = km * 0.621371;
    if (miles <= 50) {
      reasons.location = 10;
      reasons.location_signal = `Within 50 miles of you`;
      reasons.signals!.push(reasons.location_signal);
      total += 10;
    } else {
      reasons.location = 0;
    }
  } else {
    reasons.location = 0;
  }

  if (calendarConnected) {
    if (calendarFree === true) {
      reasons.availability = 20;
      reasons.availability_signal = 'You are free on your calendar for this event';
      reasons.signals!.push(reasons.availability_signal);
      total += 20;
    } else {
      reasons.availability = 0;
    }
  } else {
    let avail = 0;
    const hour = eventHourInTimezone(event.event_date, timing.timezone);
    const month = eventMonthInTimezone(event.event_date, timing.timezone);
    const slots = timing.preferred_notification_times?.length
      ? timing.preferred_notification_times
      : ['any_time'];

    if (matchesPreferredTimeSlot(hour, slots)) {
      avail += 10;
      reasons.availability_signal = 'Event time fits when you like to hear about events';
      reasons.signals!.push(reasons.availability_signal);
    }

    const months = timing.active_event_months ?? [];
    if (months.length === 0 || months.includes(month)) {
      avail += 10;
      if (months.length > 0) {
        reasons.signals!.push('Event falls in your active months');
      }
    }

    reasons.availability = avail;
    total += avail;
  }

  let affinityScore = 0;
  if (affinity.tippedCreatorIds.has(event.creator_id)) {
    affinityScore = 15;
    reasons.artist_signal = 'You have tipped this artist before';
  } else if (affinity.liveInterestCreatorIds.has(event.creator_id)) {
    affinityScore = 15;
    reasons.artist_signal = 'You expressed live interest in this artist';
  } else if (affinity.followedCreatorIds.has(event.creator_id)) {
    affinityScore = 8;
    reasons.artist_signal = 'You follow this artist';
  }
  reasons.artist_affinity = affinityScore;
  if (reasons.artist_signal) reasons.signals!.push(reasons.artist_signal);
  total += affinityScore;

  const daysUntil = daysUntilEventDate(event.event_date);
  const planning = scorePlanningWindow(timing.event_planning_window, daysUntil);
  reasons.planning_window = planning.score;
  if (planning.signal) {
    reasons.planning_signal = planning.signal;
    reasons.signals!.push(planning.signal);
  }
  total += planning.score;

  const match_score = Math.min(100, Math.round(total * 100) / 100);

  return {
    event_id: event.id,
    match_score,
    match_reasons: reasons,
    expires_at: event.event_date,
  };
}
