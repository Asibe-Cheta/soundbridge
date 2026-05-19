import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A profile can receive tips if role is creator OR they have uploaded at least one track.
 * Uploaders may still have role = 'listener' from onboarding (e.g. selected_role mismatch).
 */
export async function isTippableCreator(
  supabase: SupabaseClient,
  creatorId: string,
  profileRole: string | null | undefined,
): Promise<boolean> {
  if (profileRole === 'creator') {
    return true;
  }

  const { count, error } = await supabase
    .from('audio_tracks')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', creatorId);

  if (error) {
    console.warn('[tippable-creator] audio_tracks count:', error.message);
    return false;
  }

  return (count ?? 0) > 0;
}
