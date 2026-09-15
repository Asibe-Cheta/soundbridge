/**
 * Sound Movement logo assets (NSO_STAGE1.MD / NSO_1B.MD). Keyed by
 * sound_movements.slug, not by artist — a movement's branding is independent
 * of who its founding_artist_id currently is, so this stays generalizable the
 * same way the gating/RLS logic does. Movements with no entry here just
 * render without a logo (text badge only).
 */
export const SOUND_MOVEMENT_LOGOS: Record<string, string> = {
  'new-skool-ogene': '/images/badges/NSO_GOLD.png',
};
