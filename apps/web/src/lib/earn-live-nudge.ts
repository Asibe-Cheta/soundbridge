const STORAGE_PREFIX = 'sb_earn_live_nudge_last_shown_';
const CADENCE_MS = 7 * 24 * 60 * 60 * 1000;

export function getEarnMoneyLiveCopy(date: Date = new Date()): string {
  const day = date.getDate();
  if (day === 1) return 'Happy new month! Earn money live this month';
  if (day <= 7) return 'Earn money live this month';
  return 'Earn money live this week';
}

export function shouldShowEarnMoneyLiveNudge(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return true;
    const lastShown = Number(raw);
    if (!Number.isFinite(lastShown)) return true;
    return Date.now() - lastShown >= CADENCE_MS;
  } catch {
    return false;
  }
}

export function markEarnMoneyLiveNudgeShown(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, String(Date.now()));
  } catch {
    /* ignore quota errors */
  }
}

export const EARN_MONEY_LIVE_AI_PROMPT =
  "I want to start earning money from live performances. Can you help me understand the best ways to use my Tip Room QR code at gigs and events?";
