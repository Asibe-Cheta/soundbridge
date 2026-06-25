export const OUTREACH_CONTACT_TYPES = [
  'institution',
  'artist',
  'choir',
  'church',
  'venue',
  'media',
  'partner',
  'other',
] as const;

export type OutreachContactType = (typeof OUTREACH_CONTACT_TYPES)[number];

export function isOutreachContactType(value: string): value is OutreachContactType {
  return (OUTREACH_CONTACT_TYPES as readonly string[]).includes(value);
}

export function normalizeOutreachContactType(raw: string): OutreachContactType | null {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!t) return null;
  if (isOutreachContactType(t)) return t;
  const aliases: Record<string, OutreachContactType> = {
    org: 'institution',
    organization: 'institution',
    organisation: 'institution',
    school: 'institution',
    university: 'institution',
    musician: 'artist',
    singer: 'artist',
    choir_group: 'choir',
    chorale: 'choir',
    press: 'media',
    journalist: 'media',
    radio: 'media',
    tv: 'media',
    collaborator: 'partner',
    sponsor: 'partner',
  };
  return aliases[t] ?? null;
}
