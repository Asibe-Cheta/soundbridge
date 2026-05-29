/** Shared discovery intelligence constants and helpers (mobile-aligned). */

export const MOOD_TAG_OPTIONS = [
  'Worshipful',
  'Energetic',
  'Reflective',
  'Celebratory',
  'Raw and honest',
  'Uplifting',
  'Melancholic',
  'Peaceful',
  'Intense',
  'Romantic',
  'Nostalgic',
  'Motivational',
] as const;

export type MoodTag = (typeof MOOD_TAG_OPTIONS)[number];

export const MAX_MOOD_TAGS_PER_TRACK = 3;

export const LIVE_INTEREST_AVAILABILITY_OPTIONS = [
  { id: 'weekends', label: 'Weekends' },
  { id: 'weekday_evenings', label: 'Weekday evenings' },
  { id: 'any_time', label: 'Any time' },
] as const;

/** Minimum listen threshold: 30 seconds or 50% of track, whichever is less. */
export function isValidPlayDuration(durationListened: number, totalDuration: number): boolean {
  if (!Number.isFinite(durationListened) || durationListened <= 0) return false;
  const total = Math.max(1, totalDuration || 0);
  const threshold = Math.min(30, total * 0.5);
  return durationListened >= threshold;
}

export type QualityExposureTier = 'local' | 'expanded' | 'genre' | 'featured';

export function qualityScoreExposureTier(score: number | null | undefined): QualityExposureTier {
  const s = score ?? 0;
  if (s >= 81) return 'featured';
  if (s >= 61) return 'genre';
  if (s >= 31) return 'expanded';
  return 'local';
}

export function formatAvailabilityPreference(pref: string | null | undefined): string {
  switch (pref) {
    case 'weekends':
      return 'Weekends';
    case 'weekday_evenings':
      return 'Weekday evenings';
    case 'any_time':
      return 'Any time';
    default:
      return pref || 'Not specified';
  }
}
