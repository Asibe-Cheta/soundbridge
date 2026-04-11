import type { SupabaseClient } from '@supabase/supabase-js';

/** UUID v4-style (also matches other variants; sufficient for profile ids). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns profile id when the URL segment is a bare UUID or `user` + UUID (legacy deep-link shape).
 */
export function extractProfileIdFromCreatorSlug(slug: string): string | null {
  const s = slug.trim();
  if (UUID_RE.test(s)) return s;
  if (s.startsWith('user')) {
    const rest = s.slice(4);
    if (UUID_RE.test(rest)) return rest;
  }
  return null;
}

export type ResolvedCreatorRoute = {
  profile: Record<string, unknown> & { id: string; username?: string | null };
  /** Use this for API paths and client `username` prop so `/api/creator/[slug]/…` resolves. */
  canonicalSlug: string;
};

/**
 * Resolve a public profile from a `/creator/[username]` segment:
 * - Id-based: bare UUID or `user` + UUID (any role)
 * - Username: prefer `role = creator`, then any profile with that username
 */
export async function resolveCreatorProfileBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<ResolvedCreatorRoute | null> {
  const id = extractProfileIdFromCreatorSlug(slug);
  if (id) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !profile) return null;
    const u = typeof profile.username === 'string' ? profile.username.trim() : '';
    const canonicalSlug = u || `user${profile.id}`;
    return { profile: profile as ResolvedCreatorRoute['profile'], canonicalSlug };
  }

  let profile: Record<string, unknown> | null = null;
  const { data: creatorByUsername } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', slug)
    .eq('role', 'creator')
    .maybeSingle();

  if (creatorByUsername) {
    profile = creatorByUsername as Record<string, unknown>;
  } else {
    const { data: anyByUsername } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', slug)
      .maybeSingle();
    profile = (anyByUsername as Record<string, unknown>) ?? null;
  }

  if (!profile) return null;
  const id = String(profile.id);
  const canonicalSlug =
    typeof profile.username === 'string' && profile.username.trim()
      ? profile.username.trim()
      : `user${id}`;
  return {
    profile: profile as ResolvedCreatorRoute['profile'],
    canonicalSlug,
  };
}
