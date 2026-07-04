import type { SupabaseClient } from '@supabase/supabase-js';
import { PARTNER_REFERRAL_COOKIE, PARTNER_SOURCE_COOKIE } from '@/src/lib/partner-referrals';

export const COMMUNITY_ENTRY_CREATOR_USERNAME_COOKIE = 'soundbridge_community_entry_creator';
export const COMMUNITY_ENTRY_CREATOR_ID_COOKIE = 'soundbridge_community_entry_creator_id';

export const COMMUNITY_ENTRY_CREATOR_USERNAME_STORAGE = 'soundbridge_community_entry_creator';
export const COMMUNITY_ENTRY_CREATOR_ID_STORAGE = 'soundbridge_community_entry_creator_id';

const SOUND_ACADEMY_SOURCE = 'sound_academy';
const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 30;

/** Share cookies across soundbridge.live and www.soundbridge.live in production. */
export function getCommunityEntryCookieDomainAttribute(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname.toLowerCase();
  if (host === 'soundbridge.live' || host.endsWith('.soundbridge.live')) {
    return '; domain=.soundbridge.live';
  }
  return '';
}

export function readCommunityEntryAttributionFromClient(): {
  creatorUsername: string | null;
  creatorId: string | null;
} {
  if (typeof window === 'undefined') {
    return { creatorUsername: null, creatorId: null };
  }
  const creatorUsername =
    localStorage.getItem(COMMUNITY_ENTRY_CREATOR_USERNAME_STORAGE)?.trim().toLowerCase() || null;
  const creatorId = localStorage.getItem(COMMUNITY_ENTRY_CREATOR_ID_STORAGE)?.trim() || null;
  return { creatorUsername, creatorId };
}

export function persistCommunityEntryCreatorClient(username: string, creatorId?: string) {
  if (typeof window === 'undefined') return;
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return;

  const domain = getCommunityEntryCookieDomainAttribute();
  localStorage.setItem(COMMUNITY_ENTRY_CREATOR_USERNAME_STORAGE, normalizedUsername);
  document.cookie = `${COMMUNITY_ENTRY_CREATOR_USERNAME_COOKIE}=${encodeURIComponent(normalizedUsername)}; max-age=${ATTRIBUTION_MAX_AGE}; path=/; samesite=lax${domain}`;

  if (creatorId) {
    localStorage.setItem(COMMUNITY_ENTRY_CREATOR_ID_STORAGE, creatorId);
    document.cookie = `${COMMUNITY_ENTRY_CREATOR_ID_COOKIE}=${encodeURIComponent(creatorId)}; max-age=${ATTRIBUTION_MAX_AGE}; path=/; samesite=lax${domain}`;
  }

  // Fan/community entry must not inherit a stale Sound Academy institutional source.
  clearInstitutionalSignupSourceClient();
}

/** Remove Sound Academy (or other) institutional signup source from client storage. */
export function clearInstitutionalSignupSourceClient() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('soundbridge_signup_source');
  const domain = getCommunityEntryCookieDomainAttribute();
  document.cookie = `${PARTNER_SOURCE_COOKIE}=; max-age=0; path=/; samesite=lax${domain}`;
  document.cookie = `${PARTNER_SOURCE_COOKIE}=; max-age=0; path=/; samesite=lax`;
}

/** Clear only fan/community-entry attribution (does not touch partner `ref` cookies). */
export function clearCommunityEntryOnlyClient() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COMMUNITY_ENTRY_CREATOR_USERNAME_STORAGE);
  localStorage.removeItem(COMMUNITY_ENTRY_CREATOR_ID_STORAGE);

  const domain = getCommunityEntryCookieDomainAttribute();
  for (const name of [
    COMMUNITY_ENTRY_CREATOR_USERNAME_COOKIE,
    COMMUNITY_ENTRY_CREATOR_ID_COOKIE,
  ]) {
    document.cookie = `${name}=; max-age=0; path=/; samesite=lax${domain}`;
    document.cookie = `${name}=; max-age=0; path=/; samesite=lax`;
  }
}

/** Clear community entry + partner referral client attribution (post-welcome cleanup). */
export function clearCommunityEntryAttributionClient() {
  if (typeof window === 'undefined') return;
  clearCommunityEntryOnlyClient();
  localStorage.removeItem('soundbridge_referral_code');
  localStorage.removeItem('soundbridge_signup_source');

  const domain = getCommunityEntryCookieDomainAttribute();
  for (const name of [PARTNER_REFERRAL_COOKIE, PARTNER_SOURCE_COOKIE]) {
    document.cookie = `${name}=; max-age=0; path=/; samesite=lax${domain}`;
    document.cookie = `${name}=; max-age=0; path=/; samesite=lax`;
  }
}

export type CommunityEntryAttributionInput = {
  creatorId?: string | null;
  creatorUsername?: string | null;
  signupSource?: string | null;
};

export async function applyCommunityEntryAttribution(
  supabase: SupabaseClient,
  userId: string,
  input: CommunityEntryAttributionInput,
): Promise<{ creatorId: string | null; creatorUsername: string | null }> {
  if (input.signupSource?.trim().toLowerCase() === SOUND_ACADEMY_SOURCE) {
    return { creatorId: null, creatorUsername: null };
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('community_entry_creator_id, community_entry_shown_at')
    .eq('id', userId)
    .maybeSingle();

  if (existing?.community_entry_creator_id) {
    const { data: creator } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', existing.community_entry_creator_id)
      .maybeSingle();
    return {
      creatorId: existing.community_entry_creator_id,
      creatorUsername: creator?.username ?? null,
    };
  }

  let creatorId = input.creatorId?.trim() || null;
  let creatorUsername = input.creatorUsername?.trim().toLowerCase() || null;

  if (!creatorId && creatorUsername) {
    const { data: creator } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', creatorUsername)
      .maybeSingle();
    creatorId = creator?.id ?? null;
    creatorUsername = creator?.username ?? creatorUsername;
  }

  if (!creatorId || creatorId === userId) {
    return { creatorId: null, creatorUsername: null };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      community_entry_creator_id: creatorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .is('community_entry_creator_id', null);

  if (error) {
    console.error('[community-entry] apply attribution failed:', error.message);
    return { creatorId: null, creatorUsername: null };
  }

  if (!creatorUsername) {
    const { data: creator } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', creatorId)
      .maybeSingle();
    creatorUsername = creator?.username ?? null;
  }

  return { creatorId, creatorUsername };
}

export function needsCommunityWelcome(profile: {
  community_entry_creator_id?: string | null;
  community_entry_shown_at?: string | null;
  onboarding_completed?: boolean | null;
} | null): boolean {
  if (!profile?.onboarding_completed) return false;
  return !!profile.community_entry_creator_id && !profile.community_entry_shown_at;
}
