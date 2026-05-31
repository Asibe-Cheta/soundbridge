export type EventPollOption = {
  label: string;
  date?: string;
  location?: string;
};

export type EventPollMessagePayload = {
  type: 'event_poll';
  campaign_id: string;
  body: string;
  options: EventPollOption[];
};

export function buildEventPollCombinations(
  dateOptions: string[],
  locationOptions: string[],
  maxCombinations = 6,
): EventPollOption[] {
  const dates = dateOptions.map((d) => d.trim()).filter(Boolean);
  const locations = locationOptions.map((l) => l.trim()).filter(Boolean);
  const combos: EventPollOption[] = [];

  for (const location of locations) {
    for (const date of dates) {
      combos.push({
        label: `${location} — ${date}`,
        date,
        location,
      });
      if (combos.length >= maxCombinations) return combos;
    }
  }

  return combos;
}

export function parseEventPollMessage(content: string): EventPollMessagePayload | null {
  try {
    const parsed = JSON.parse(content) as Partial<EventPollMessagePayload>;
    if (parsed?.type !== 'event_poll' || !parsed.campaign_id || !Array.isArray(parsed.options)) {
      return null;
    }
    return {
      type: 'event_poll',
      campaign_id: parsed.campaign_id,
      body: parsed.body || '',
      options: parsed.options.map((opt) => ({
        label: String(opt.label ?? ''),
        date: opt.date ? String(opt.date) : undefined,
        location: opt.location ? String(opt.location) : undefined,
      })),
    };
  } catch {
    return null;
  }
}

export const LIVE_INTEREST_ABSOLUTE_THRESHOLD = 25;
export const LIVE_INTEREST_FOLLOWER_RATIO = 0.15;
export const THRESHOLD_COOLDOWN_DAYS = 30;

export function meetsLiveInterestThreshold(yesCount: number, followersCount: number): boolean {
  if (yesCount >= LIVE_INTEREST_ABSOLUTE_THRESHOLD) return true;
  if (followersCount > 0 && yesCount >= Math.ceil(followersCount * LIVE_INTEREST_FOLLOWER_RATIO)) {
    return true;
  }
  return false;
}
