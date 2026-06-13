const DISMISS_PREFIX = 'sb_community_tip_dismiss_';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function isCommunityTipPromptDismissed(creatorId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`${DISMISS_PREFIX}${creatorId}`);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_MS;
  } catch {
    return false;
  }
}

export function dismissCommunityTipPrompt(creatorId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${creatorId}`, String(Date.now()));
  } catch {
    /* ignore quota errors */
  }
}
