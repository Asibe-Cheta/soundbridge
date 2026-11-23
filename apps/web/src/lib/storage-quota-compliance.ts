import type { SupabaseClient } from '@supabase/supabase-js';

/** Same limit grace-period-service.ts enforces when it auto-privatises excess content. */
export const FREE_TIER_STORAGE_LIMIT_BYTES = 250 * 1024 * 1024;

export type StorageComplianceResult = {
  compliant: boolean;
  publicStorageBytes: number;
  limitBytes: number;
};

type TrackRow = { file_size: number | null };

/**
 * Pure: whether total bytes across a user's current public tracks fits the
 * free-tier limit. Split from the DB read so the actual rule is testable
 * without a Supabase client.
 */
export function evaluateStorageCompliance(
  publicTracks: TrackRow[],
  limitBytes: number = FREE_TIER_STORAGE_LIMIT_BYTES,
): StorageComplianceResult {
  const publicStorageBytes = publicTracks.reduce((sum, t) => sum + (t.file_size || 0), 0);
  return {
    compliant: publicStorageBytes <= limitBytes,
    publicStorageBytes,
    limitBytes,
  };
}

/**
 * Independently re-derives whether a user's current public tracks fit the
 * free-tier storage limit -- never trust a client's say-so that they've
 * "selected" their way back under quota. Mirrors the same 250MB limit and
 * table (audio_tracks, is_public, deleted_at IS NULL) that
 * grace-period-service.ts uses when it auto-privatises excess content.
 */
export async function checkFreeStorageCompliance(
  service: SupabaseClient,
  userId: string,
): Promise<StorageComplianceResult> {
  const { data, error } = await service
    .from('audio_tracks')
    .select('file_size')
    .eq('creator_id', userId)
    .eq('is_public', true)
    .is('deleted_at', null);

  if (error) {
    console.error('[storage-quota-compliance] failed to read tracks:', error);
    // Fail closed: an unreadable track list must never be treated as "compliant".
    return { compliant: false, publicStorageBytes: Infinity, limitBytes: FREE_TIER_STORAGE_LIMIT_BYTES };
  }

  return evaluateStorageCompliance((data || []) as TrackRow[]);
}
