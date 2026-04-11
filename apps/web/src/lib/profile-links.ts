/**
 * Stable path for linking to a creator profile from profile fields.
 * Uses real username when set; otherwise the `user` + UUID shape handled by `/creator/[username]`.
 */
export function getCreatorProfilePath(profile: {
  username?: string | null;
  id: string;
}): string {
  const u = profile.username?.trim();
  if (u) return `/creator/${encodeURIComponent(u)}`;
  return `/creator/user${profile.id}`;
}
