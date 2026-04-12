/**
 * Display name + first/last for OAuth-created profiles.
 *
 * Apple only sends the user's full name on the **first** Sign in with Apple; it may appear as
 * a string (`full_name`, `name`) or as an object (`name: { firstName, lastName }`) depending on
 * provider / Supabase version. Google typically uses `full_name` as a string.
 */
export function extractOAuthDisplayNameParts(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): { displayName: string; firstName: string; lastName: string } {
  const meta = user.user_metadata ?? {};
  const emailLocal = user.email?.split('@')[0]?.trim() || '';

  let full = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  if (!full && typeof meta.name === 'string') {
    full = meta.name.trim();
  }

  if (!full && meta.name && typeof meta.name === 'object') {
    const n = meta.name as {
      firstName?: string;
      lastName?: string;
      fullName?: string;
    };
    if (typeof n.fullName === 'string' && n.fullName.trim()) {
      full = n.fullName.trim();
    } else {
      full = [n.firstName, n.lastName].filter(Boolean).join(' ').trim();
    }
  }

  if (!full) {
    const given = typeof meta.given_name === 'string' ? meta.given_name.trim() : '';
    const family = typeof meta.family_name === 'string' ? meta.family_name.trim() : '';
    full = [given, family].filter(Boolean).join(' ').trim();
  }

  const displayName = full || emailLocal || 'New User';
  const parts = full.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  return { displayName, firstName, lastName };
}
