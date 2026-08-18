import type { SupabaseClient } from '@supabase/supabase-js';

export const LIVE_STREAM_MIN_FOLLOWERS = 50;

export const LIVE_STREAM_INELIGIBLE_MESSAGE =
  'Live streaming is available to creators with 50 or more followers, or to designated SoundBridge partners. Keep growing your following to unlock it.';

export interface LiveStreamEligibility {
  eligible: boolean;
  reason: 'followers' | 'partner' | null;
  followerCount: number;
  isPartner: boolean;
}

/**
 * >=50 followers OR tagged with any partner institution — same
 * institution_badge column already used for Sound Academy / Abbey Road
 * Institute / Logic Church, deliberately checked as "IS NOT NULL" rather
 * than a hardcoded partner-name list, so any future partner added the same
 * way (via profiles.institution_badge) automatically qualifies here too.
 */
export async function checkLiveStreamEligibility(
  supabase: SupabaseClient,
  userId: string,
): Promise<LiveStreamEligibility> {
  const [{ count: followerCount }, { data: profile }] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase.from('profiles').select('institution_badge').eq('id', userId).maybeSingle(),
  ]);

  const isPartner = !!profile?.institution_badge;
  const followers = followerCount ?? 0;
  const meetsFollowers = followers >= LIVE_STREAM_MIN_FOLLOWERS;

  return {
    eligible: meetsFollowers || isPartner,
    reason: isPartner ? 'partner' : meetsFollowers ? 'followers' : null,
    followerCount: followers,
    isPartner,
  };
}
