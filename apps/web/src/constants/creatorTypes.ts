export const CREATOR_TYPES = [
  'musician',
  'podcaster',
  'dj',
  'event_organizer',
  'service_provider',
  'venue_owner',
] as const;

export type CreatorTypeValue = (typeof CREATOR_TYPES)[number];

export const SERVICE_CATEGORIES = [
  'sound_engineering',
  'music_lessons',
  'mixing_mastering',
  'session_musician',
  'photography',
  'videography',
  'lighting',
  'event_management',
  'other',
] as const;

export type ServiceCategoryValue = (typeof SERVICE_CATEGORIES)[number];

export const isValidCreatorType = (value: string): value is CreatorTypeValue =>
  CREATOR_TYPES.includes(value as CreatorTypeValue);

export const isValidServiceCategory = (value: string): value is ServiceCategoryValue =>
  SERVICE_CATEGORIES.includes(value as ServiceCategoryValue);

